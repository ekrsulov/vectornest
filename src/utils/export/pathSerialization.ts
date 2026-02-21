import type { PathData, PathElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import { commandsToString } from '../pathParserUtils';
import { animationContributionRegistry } from '../animationContributionRegistry';
import { serializeAnimationFromContributions } from '../exportContributionRegistry';
import { normalizeMarkerId } from '../markerUtils';
import { escapeXmlAttribute, escapeXmlText } from '../xmlEscapeUtils';
import { getEffectiveStrokeColor } from '../pathDataBehaviors';

type AnimationSliceLike = {
  calculateChainDelays?: () => Map<string, number>;
  animations?: Array<Record<string, unknown>>;
};

interface PathAnimationExtraAttributes {
  strokeDasharray?: string;
  pathLength?: string | number;
  strokeDashoffset?: string | number;
}

interface PathAnimationContext {
  chainDelays: Map<string, number>;
  textPathAnimations: Array<Record<string, unknown>>;
  serializedElementAnimations: string;
  extraAttrs: PathAnimationExtraAttributes;
}

type TextPathData = NonNullable<PathData['textPath']>;

const resolvePathAnimationContext = (
  pathElement: PathElement,
  state?: CanvasStore
): PathAnimationContext => {
  if (!state) {
    return {
      chainDelays: new Map<string, number>(),
      textPathAnimations: [],
      serializedElementAnimations: '',
      extraAttrs: {},
    };
  }

  const animSlice = state as unknown as AnimationSliceLike;
  const chainDelays = animSlice.calculateChainDelays
    ? animSlice.calculateChainDelays()
    : new Map<string, number>();
  const elementAnimations =
    animSlice.animations?.filter(
      (animation) =>
        animation.targetElementId === pathElement.id &&
        !(animation as { clipPathTargetId?: string }).clipPathTargetId
    ) ?? [];
  const textPathAnimations = elementAnimations.filter(
    (animation) => animation.attributeName === 'startOffset'
  );

  return {
    chainDelays,
    textPathAnimations,
    serializedElementAnimations: animationContributionRegistry.serializeAnimationsForElement(
      state,
      pathElement
    ),
    extraAttrs:
      animationContributionRegistry.getExtraAttributesForElement(
        state,
        pathElement
      ) as PathAnimationExtraAttributes,
  };
};

const buildPathStyleAttribute = (pathData: PathData): string | undefined => {
  const styleParts: string[] = [];
  if (pathData.mixBlendMode) {
    styleParts.push(`mix-blend-mode:${pathData.mixBlendMode}`);
  }
  if (pathData.isolation) {
    styleParts.push(`isolation:${pathData.isolation}`);
  }
  return styleParts.length ? styleParts.join(';') : undefined;
};

interface BuildPathAttributeListArgs {
  pathElement: PathElement;
  pathData: PathData;
  pathD: string;
  effectiveStrokeColor: string;
  displayValue: string | undefined;
  extraAttrs: PathAnimationExtraAttributes;
  markerStartId: string | undefined;
  markerMidId: string | undefined;
  markerEndId: string | undefined;
}

const buildPathAttributeList = ({
  pathElement,
  pathData,
  pathD,
  effectiveStrokeColor,
  displayValue,
  extraAttrs,
  markerStartId,
  markerMidId,
  markerEndId,
}: BuildPathAttributeListArgs): string[] => {
  const attributes: string[] = [
    `id="${pathElement.id}"`,
    ...(pathData.name ? [`data-name="${escapeXmlAttribute(pathData.name)}"`] : []),
    `d="${pathD}"`,    `stroke="${effectiveStrokeColor}"`,
    `stroke-width="${pathData.strokeWidth}"`,
    `fill="${pathData.fillColor}"`,
    `fill-opacity="${pathData.fillOpacity}"`,
    `stroke-opacity="${pathData.strokeOpacity}"`,
  ];

  if (pathData.transformMatrix) {
    attributes.push(`transform="matrix(${pathData.transformMatrix.join(' ')})"`);
  }
  if (pathData.opacity !== undefined) {
    attributes.push(`opacity="${pathData.opacity}"`);
  }
  if (pathData.strokeLinecap) {
    attributes.push(`stroke-linecap="${pathData.strokeLinecap}"`);
  }
  if (pathData.strokeLinejoin) {
    attributes.push(`stroke-linejoin="${pathData.strokeLinejoin}"`);
  }
  if (pathData.fillRule) {
    attributes.push(`fill-rule="${pathData.fillRule}"`);
  }
  if (extraAttrs.strokeDasharray) {
    attributes.push(`stroke-dasharray="${extraAttrs.strokeDasharray}"`);
  } else if (pathData.strokeDasharray && pathData.strokeDasharray !== 'none') {
    attributes.push(`stroke-dasharray="${pathData.strokeDasharray}"`);
  }
  if (extraAttrs.pathLength) {
    attributes.push(`pathLength="${extraAttrs.pathLength}"`);
  }
  if (extraAttrs.strokeDashoffset) {
    attributes.push(`stroke-dashoffset="${extraAttrs.strokeDashoffset}"`);
  } else if (pathData.strokeDashoffset !== undefined) {
    attributes.push(`stroke-dashoffset="${pathData.strokeDashoffset}"`);
  }
  if (pathData.strokeMiterlimit !== undefined) {
    attributes.push(`stroke-miterlimit="${pathData.strokeMiterlimit}"`);
  }
  if (pathData.visibility && pathData.visibility !== 'visible') {
    attributes.push(`visibility="${pathData.visibility}"`);
  }
  if (displayValue && displayValue !== 'inline') {
    attributes.push(`display="${displayValue}"`);
  }
  if (pathData.vectorEffect && pathData.vectorEffect !== 'none') {
    attributes.push(`vector-effect="${pathData.vectorEffect}"`);
  }
  if (pathData.shapeRendering && pathData.shapeRendering !== 'auto') {
    attributes.push(`shape-rendering="${pathData.shapeRendering}"`);
  }
  if (pathData.filterId) {
    attributes.push(`filter="url(#${pathData.filterId})"`);
  }
  if (markerStartId) {
    attributes.push(`marker-start="url(#${markerStartId})"`);
  }
  if (markerMidId) {
    attributes.push(`marker-mid="url(#${markerMidId})"`);
  }
  if (markerEndId) {
    attributes.push(`marker-end="url(#${markerEndId})"`);
  }

  const clipRef = pathData.clipPathId ?? pathData.clipPathTemplateId;
  if (clipRef) {
    attributes.push(`clip-path="url(#${clipRef})"`);
  }

  const maskId = (pathData as { maskId?: string }).maskId;
  if (maskId) {
    attributes.push(`mask="url(#${maskId})"`);
  }

  const styleValue = buildPathStyleAttribute(pathData);
  if (styleValue) {
    attributes.push(`style="${styleValue}"`);
  }

  return attributes;
};

const serializePathElementTag = (
  indent: string,
  attributes: string[],
  serializedElementAnimations: string
): string => {
  if (serializedElementAnimations.length === 0) {
    return `${indent}<path ${attributes.join(' ')} />`;
  }

  const animationLines = serializedElementAnimations
    .split('\n')
    .map((line) => `${indent}  ${line}`)
    .join('\n');

  return `${indent}<path ${attributes.join(' ')}>\n${animationLines}\n${indent}</path>`;
};

const serializeTextPathSpans = (textPath: TextPathData): string => {
  return textPath.spans!.map((span, index) => {
    const isLineStart = index === 0 || span.line !== textPath.spans![index - 1]?.line;
    const dy =
      isLineStart && span.line > 0
        ? ` dy="${textPath.fontSize * (span.line - (textPath.spans![index - 1]?.line ?? 0))}"`
        : '';
    const styleAttrs = [
      span.fontWeight ? `font-weight="${span.fontWeight}"` : null,
      span.fontStyle ? `font-style="${span.fontStyle}"` : null,
      span.textDecoration && span.textDecoration !== 'none'
        ? `text-decoration="${span.textDecoration}"`
        : null,
      span.fillColor ? `fill="${span.fillColor}"` : null,
    ]
      .filter(Boolean)
      .join(' ');
    const dx = span.dx ? ` dx="${span.dx}"` : '';

    return `<tspan${dy}${dx}${styleAttrs ? ` ${styleAttrs}` : ''}>${escapeXmlText(
      span.text
    )}</tspan>`;
  }).join('');
};

const serializeTextPathElement = (
  pathElement: PathElement,
  pathData: PathData,
  effectiveStrokeColor: string,
  isHidden: boolean,
  chainDelays: Map<string, number>,
  textPathAnimations: Array<Record<string, unknown>>,
  indent: string
): string => {
  const textPath = pathData.textPath;
  if (!textPath || !textPath.text) {
    return '';
  }

  const textFilterId = textPath.filterId ?? pathData.filterId;
  const textAttrs = [
    `font-size="${textPath.fontSize}"`,
    `font-family="${textPath.fontFamily}"`,
    `font-weight="${textPath.fontWeight ?? 'normal'}"`,
    `font-style="${textPath.fontStyle ?? 'normal'}"`,
    `text-anchor="${textPath.textAnchor ?? 'start'}"`,
  ];
  if (textPath.textDecoration && textPath.textDecoration !== 'none') {
    textAttrs.push(`text-decoration="${textPath.textDecoration}"`);
  }
  if (textPath.letterSpacing !== undefined) {
    textAttrs.push(`letter-spacing="${textPath.letterSpacing}"`);
  }
  if (textPath.lengthAdjust) {
    textAttrs.push(`lengthAdjust="${textPath.lengthAdjust}"`);
  }
  if (textPath.textLength !== undefined) {
    textAttrs.push(`textLength="${textPath.textLength}"`);
  }
  if (textPath.dominantBaseline) {
    textAttrs.push(`dominant-baseline="${textPath.dominantBaseline}"`);
  }
  textAttrs.push(`fill="${textPath.fillColor ?? effectiveStrokeColor}"`);
  if (textPath.fillOpacity !== undefined) {
    textAttrs.push(`fill-opacity="${textPath.fillOpacity}"`);
  }
  textAttrs.push(`stroke="${textPath.strokeColor ?? 'none'}"`);
  if (textPath.strokeWidth !== undefined) {
    textAttrs.push(`stroke-width="${textPath.strokeWidth}"`);
  }
  if (textPath.strokeOpacity !== undefined) {
    textAttrs.push(`stroke-opacity="${textPath.strokeOpacity}"`);
  }
  if (textFilterId) {
    textAttrs.push(`filter="url(#${textFilterId})"`);
  }
  const textMaskId = textPath.maskId ?? pathData.maskId;
  if (textMaskId) {
    textAttrs.push(`mask="url(#${textMaskId})"`);
  }
  if (textPath.opacity !== undefined) {
    textAttrs.push(`opacity="${textPath.opacity}"`);
  }

  const startOffset =
    textPath.startOffset !== undefined
      ? ` startOffset="${typeof textPath.startOffset === 'number' ? `${textPath.startOffset}%` : textPath.startOffset}"`
      : '';
  const methodAttr = textPath.method ? ` method="${textPath.method}"` : '';
  const spacingAttr = textPath.spacing ? ` spacing="${textPath.spacing}"` : '';
  const transformAttr = textPath.transformMatrix
    ? ` transform="matrix(${textPath.transformMatrix.join(' ')})"`
    : '';
  const textDisplayAttr = isHidden ? ' display="none"' : '';
  const textPathContent =
    textPath.spans && textPath.spans.length > 0
      ? serializeTextPathSpans(textPath as TextPathData)
      : escapeXmlText(textPath.text);
  const richAttr = textPath.richText
    ? ` data-rich-text="${escapeXmlAttribute(encodeURIComponent(textPath.richText))}"`
    : '';

  const textPathAnims = textPathAnimations
    .map((animation) => {
      const minimalAnimation = {
        id:
          (animation as { id?: string }).id ??
          `textpath-anim-${pathElement.id}-${Math.random().toString(36).slice(2, 8)}`,
        type: (animation as { type?: string }).type ?? 'animate',
        targetElementId: pathElement.id,
        ...(animation as Record<string, unknown>),
      } as Record<string, unknown>;

      return serializeAnimationFromContributions(minimalAnimation, chainDelays);
    })
    .map((line) => `${indent}  ${line}`)
    .join('\n');
  const textPathAnimBlock = textPathAnims ? `\n${textPathAnims}` : '';

  return `\n${indent}<text ${textAttrs.join(' ')}${transformAttr}${textDisplayAttr} pointer-events="none"><textPath href="#${pathElement.id}"${startOffset}${methodAttr}${spacingAttr}${richAttr}>${textPathContent}${textPathAnimBlock ? `\n${textPathAnimBlock}\n${indent}` : ''}</textPath></text>`;
};

export function serializePathElement(pathElement: PathElement, indent: string, state?: CanvasStore): string {
  const pathData = pathElement.data as PathData;
  const pathD = commandsToString(pathData.subPaths.flat());
  const isHidden = state?.isElementHidden?.(pathElement.id) ?? pathData.display === 'none';
  const displayValue = isHidden ? 'none' : pathData.display;
  const effectiveStrokeColor = getEffectiveStrokeColor(pathData);
  const {
    chainDelays,
    textPathAnimations,
    serializedElementAnimations,
    extraAttrs,
  } = resolvePathAnimationContext(pathElement, state);
  const markerStartId = normalizeMarkerId(pathData.markerStart);
  const markerMidId = normalizeMarkerId(pathData.markerMid);
  const markerEndId = normalizeMarkerId(pathData.markerEnd);
  const attributes = buildPathAttributeList({
    pathElement,
    pathData,
    pathD,
    effectiveStrokeColor,
    displayValue,
    extraAttrs,
    markerStartId: markerStartId ?? undefined,
    markerMidId: markerMidId ?? undefined,
    markerEndId: markerEndId ?? undefined,
  });

  let result = serializePathElementTag(indent, attributes, serializedElementAnimations);
  result += serializeTextPathElement(
    pathElement,
    pathData,
    effectiveStrokeColor,
    isHidden,
    chainDelays,
    textPathAnimations,
    indent
  );

  return result;
}

/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { CanvasLayerContext } from '../../types/plugins';
import type { GroupElement, PathElement } from '../../types';
import type { WireframePluginSlice } from '../wireframe/slice';
import { commandsToString } from '../../utils/pathParserUtils';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import { renderAnimationsForElement } from '../animationSystem/renderAnimations';
import { getClipRuntimeId } from '../../utils/maskUtils';
import {
  getTextEffectBaseAnimationsFromMetadata,
  getTextEffectLayersFromMetadata,
  renderInlineTextEffectAnimations,
} from '../textEffectsLibrary/renderLayerUtils';
import { getAnimationDomId, resolveAnimationBegin, resolveAnimationEnd } from '../animationSystem/smilTimingUtils';
import { getElementTransformMatrix } from '../../utils/elementTransformUtils';
import { IDENTITY_MATRIX, inverseMatrix, multiplyMatrices, type Matrix } from '../../utils/matrixUtils';

const getEffectiveStrokeColor = (path: PathElement['data']): string => {
  if (path.strokeColor === 'none') return '#00000001';
  return path.strokeColor;
};

const toTransformAttr = (matrix: Matrix | number[] | undefined): string | undefined => {
  if (!Array.isArray(matrix) || matrix.length !== 6) {
    return undefined;
  }
  return `matrix(${matrix.join(',')})`;
};

const resolveBaseTransformMatrix = (pathData: PathElement['data']): Matrix | undefined => {
  if (pathData.textPath?.transformMatrix) {
    return pathData.textPath.transformMatrix as Matrix;
  }
  if (pathData.transformMatrix) {
    return pathData.transformMatrix as Matrix;
  }
  const t = pathData.transform;
  if (t && (t.translateX || t.translateY || t.rotation || t.scaleX !== 1 || t.scaleY !== 1)) {
    return getElementTransformMatrix({
      id: 'textpath-transform-proxy',
      type: 'path',
      parentId: null,
      zIndex: 0,
      data: pathData,
    } as PathElement);
  }
  return undefined;
};

const buildAncestorGroupChain = (
  sortedElements: CanvasLayerContext['sortedElements'],
  anchorGroupSourceIds: string[] | undefined,
): GroupElement[] => {
  if (!anchorGroupSourceIds?.length) {
    return [];
  }

  const groupsBySourceId = new Map<string, GroupElement>();
  sortedElements.forEach((candidate) => {
    if (candidate.type !== 'group') {
      return;
    }
    const sourceId = candidate.data.sourceId;
    if (typeof sourceId === 'string' && sourceId.length > 0) {
      groupsBySourceId.set(sourceId, candidate as GroupElement);
    }
  });

  return anchorGroupSourceIds
    .map((sourceId) => groupsBySourceId.get(sourceId))
    .filter((group): group is GroupElement => Boolean(group));
};

const TextPathLayer: React.FC<{ context: CanvasLayerContext }> = ({ context }) => {
  const wireframe = useCanvasStore((state) => (state as unknown as WireframePluginSlice).wireframe);
  const { animations, animationState } = useCanvasStore(
    useShallow((state) => {
      const s = state as unknown as AnimationPluginSlice;
      return {
        animations: s.animations ?? [],
        animationState: s.animationState,
      };
    })
  );
  const { colorMode } = useColorMode();
  const { sortedElements, isElementHidden } = context;
  const nodes: React.ReactNode[] = [];
  const wireframeEnabled = wireframe?.enabled ?? false;
  const wireframeStroke = colorMode === 'dark' ? '#ffffff' : '#000000';
  const removeFill = wireframe?.removeFill ?? false;

  sortedElements.forEach((element) => {
    if (element.type !== 'path') return;
    const pathData = (element as PathElement).data;
    const textPath = pathData.textPath;
    if (!textPath || !textPath.text) return;
    const isDefinitionCarrier = Boolean(pathData.isDefinition || pathData.isTextPathRef);
    if (isElementHidden?.(element.id) && !isDefinitionCarrier) return;
    const textPathReference = textPath as typeof textPath & { href?: string };
    const textPathHref = typeof textPathReference.href === 'string' ? textPathReference.href.trim() : '';
    const textPathReferenceId = textPathHref.startsWith('#') ? textPathHref.slice(1) : null;
    const referencedPath = textPathReferenceId
      ? sortedElements.find((candidate): candidate is PathElement => (
        candidate.type === 'path' && (
          candidate.id === textPathReferenceId ||
          candidate.data.sourceId === textPathReferenceId
        )
      ))
      : null;
    const animationTargetElementId = referencedPath?.id ?? element.id;
    const maskUrl = textPath.maskId ?? pathData.maskId;
    const textFilterId = textPath.filterId ?? pathData.filterId;
    const clipRuntimeId = getClipRuntimeId(
      pathData.clipPathId,
      (pathData as unknown as Record<string, unknown>).clipPathTemplateId as string | undefined,
      undefined // TextPathRenderer has no extensionsContext; clips on text-paths are rare, versioning handled on parent element
    );
    const clipPathUrl = clipRuntimeId ? `url(#${clipRuntimeId})` : undefined;

    const pathD = commandsToString(pathData.subPaths.flat());
    const pathRefId = `${element.id}-textpath-ref`;
    const effectiveStrokeColor = wireframeEnabled ? wireframeStroke : getEffectiveStrokeColor(pathData);
    const spans = textPath.spans ?? [];
    const fillColor = wireframeEnabled
      ? (removeFill ? 'none' : wireframeStroke)
      : (textPath.fillColor ?? effectiveStrokeColor ?? '#000000');
    const fillOpacity = wireframeEnabled
      ? (removeFill ? 0 : 0.35)
      : (textPath.fillOpacity ?? 1);
    const strokeColor = wireframeEnabled ? wireframeStroke : (textPath.strokeColor ?? 'none');
    const strokeWidth = wireframeEnabled ? 1 : (textPath.strokeWidth ?? 0);
    const strokeOpacity = wireframeEnabled ? 1 : (textPath.strokeOpacity ?? 1);
    const inlineBaseAnimations = wireframeEnabled ? [] : getTextEffectBaseAnimationsFromMetadata(pathData.metadata);
    const textEffectLayers = wireframeEnabled ? [] : getTextEffectLayersFromMetadata(pathData.metadata);
    const underlays = textEffectLayers.filter((layer) => layer.renderBeforeBase);
    const overlays = textEffectLayers.filter((layer) => !layer.renderBeforeBase);
    const restartKey = animationState?.restartKey ?? 0;

    // Filter to transform-level animations (animateTransform, animateMotion) so the
    // group — that holds both the reference path and the <text> — moves together with
    // the visible path rendered by PathElementRenderer.
    const transformAnimations: SVGAnimation[] = animations.filter(
      (anim) =>
        anim.targetElementId === animationTargetElementId &&
        (anim.type === 'animateTransform' || anim.type === 'animateMotion')
    );
    const groupAnimationNodes = transformAnimations.length > 0
      ? renderAnimationsForElement(animationTargetElementId, transformAnimations, animationState, animations)
      : null;

    const textPathAnimations: SVGAnimation[] = animations.filter(
      (anim) =>
        anim.targetElementId === animationTargetElementId &&
        anim.attributeName === 'startOffset'
    );
    const pathGeometryAnimations: SVGAnimation[] = animations.filter(
      (anim) =>
        anim.targetElementId === animationTargetElementId &&
        anim.attributeName === 'd'
    );
    const textAttributeAnimations: SVGAnimation[] = animations.filter(
      (anim) =>
        anim.targetElementId === animationTargetElementId &&
        anim.attributeName !== 'd' &&
        anim.attributeName !== 'startOffset' &&
        anim.type !== 'animateTransform' &&
        anim.type !== 'animateMotion'
    );
    const allowRender =
      animationState?.isPlaying ||
      animationState?.hasPlayed ||
      textPathAnimations.length > 0;
    const renderTextPathContent = (
      keyPrefix: string,
      layerFill: string | undefined,
      useSourceFill: boolean,
    ) => (
      spans.length > 0
        ? spans.map((span, idx) => {
          const previousSpan = idx > 0 ? spans[idx - 1] : undefined;
          const isLineStart = idx === 0 || span.line !== previousSpan?.line;
          return (
            <tspan
              key={`${keyPrefix}-tp-span-${idx}`}
              dy={span.dy ?? (isLineStart && span.line > 0 ? textPath.fontSize * (span.line - (previousSpan?.line ?? 0)) : undefined)}
              dx={span.dx}
              rotate={span.rotate}
              fontWeight={span.fontWeight}
              fontStyle={span.fontStyle}
              textDecoration={span.textDecoration}
              fill={useSourceFill
                ? (span.fillColor ?? layerFill)
                : layerFill}
            >
              {span.text}
            </tspan>
          );
        })
        : textPath.text
    );

    const ancestorGroups = buildAncestorGroupChain(sortedElements, textPath.anchorGroupSourceIds);
    const ancestorMatrix = ancestorGroups.reduce<Matrix>(
      (matrix, group) => multiplyMatrices(matrix, getElementTransformMatrix(group)),
      [...IDENTITY_MATRIX] as Matrix,
    );
    const baseTransformMatrix = resolveBaseTransformMatrix(pathData);
    const relativeBaseTransformMatrix = (() => {
      if (!baseTransformMatrix || ancestorGroups.length === 0) {
        return baseTransformMatrix;
      }

      const inverseAncestorMatrix = inverseMatrix(ancestorMatrix);
      if (!inverseAncestorMatrix) {
        return baseTransformMatrix;
      }

      return multiplyMatrices(inverseAncestorMatrix, baseTransformMatrix);
    })();
    const transformAttr = toTransformAttr(relativeBaseTransformMatrix);

    const renderEffectLayer = (layer: typeof textEffectLayers[number], index: number) => {
      const layerFill = layer.useSourceFill ? fillColor : (layer.fillColor ?? 'none');
      const layerFillOpacity = layer.fillOpacity ?? (layer.useSourceFill ? fillOpacity : 1);
      const layerFilter = wireframeEnabled ? undefined : (layer.filterId ? `url(#${layer.filterId})` : undefined);
      const layerTextAnimations = (layer.animations ?? []).filter((animation) => animation.attributeName !== 'startOffset');
      const layerStartOffsetAnimations = (layer.animations ?? []).filter((animation) => animation.attributeName === 'startOffset');

      return (
        <g
          key={`${element.id}-textfx-tp-layer-${index}`}
          transform={layer.offsetX || layer.offsetY ? `translate(${layer.offsetX} ${layer.offsetY})` : undefined}
          pointerEvents="none"
        >
          <text
            fontSize={textPath.fontSize}
            fontFamily={textPath.fontFamily}
            fontWeight={textPath.fontWeight ?? 'normal'}
            fontStyle={textPath.fontStyle ?? 'normal'}
            textDecoration={textPath.textDecoration ?? 'none'}
            textAnchor={textPath.textAnchor ?? 'start'}
            letterSpacing={textPath.letterSpacing}
            lengthAdjust={textPath.lengthAdjust}
            textLength={textPath.textLength}
            dominantBaseline={textPath.dominantBaseline}
            fill={layerFill}
            fillOpacity={layerFillOpacity}
            stroke={layer.strokeColor ?? 'none'}
            strokeWidth={layer.strokeWidth ?? 0}
            strokeOpacity={layer.strokeOpacity ?? 1}
            opacity={layer.opacity}
            pointerEvents="none"
            filter={layerFilter}
            {...(layer.maskId ? { mask: `url(#${layer.maskId})` } : {})}
            {...(layer.clipPathId ? { clipPath: `url(#${layer.clipPathId})` } : {})}
          >
            {renderInlineTextEffectAnimations(layerTextAnimations, `${element.id}-textfx-tp-layer-${index}`, restartKey)}
            <textPath
              href={`#${pathRefId}`}
              startOffset={
                textPath.startOffset !== undefined
                  ? (typeof textPath.startOffset === 'number' ? `${textPath.startOffset}%` : textPath.startOffset)
                  : undefined
              }
              method={textPath.method}
              spacing={textPath.spacing}
              lengthAdjust={textPath.lengthAdjust}
              textLength={textPath.textLength}
            >
              {renderTextPathContent(`${element.id}-textfx-tp-layer-${index}`, layerFill, Boolean(layer.useSourceFill))}
              {layerStartOffsetAnimations.length > 0
                ? renderInlineTextEffectAnimations(
                  layerStartOffsetAnimations,
                  `${element.id}-textfx-tp-layer-start-${index}`,
                  restartKey,
                )
                : null}
            </textPath>
          </text>
        </g>
      );
    };

    const content = (
      <g
        key={`${element.id}-textpath`}
        data-element-id={element.id}
        transform={transformAttr}
        {...(maskUrl ? { mask: `url(#${maskUrl})` } : {})}
        {...(clipPathUrl ? { clipPath: clipPathUrl } : {})}
        opacity={textPath.opacity ?? pathData.opacity}
      >
        {groupAnimationNodes}
        <path
          id={pathRefId}
          data-element-id={element.id}
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(pathData.strokeWidth, 12)}
          pointerEvents="stroke"
        >
          {pathGeometryAnimations.length > 0
            ? renderAnimationsForElement(animationTargetElementId, pathGeometryAnimations, animationState, animations)
            : null}
        </path>
        {underlays.map(renderEffectLayer)}
        <text
          data-element-id={element.id}
          fontSize={textPath.fontSize}
          fontFamily={textPath.fontFamily}
          fontWeight={textPath.fontWeight ?? 'normal'}
          fontStyle={textPath.fontStyle ?? 'normal'}
          textDecoration={textPath.textDecoration ?? 'none'}
          textAnchor={textPath.textAnchor ?? 'start'}
          letterSpacing={textPath.letterSpacing}
          lengthAdjust={textPath.lengthAdjust}
          textLength={textPath.textLength}
          dominantBaseline={textPath.dominantBaseline}
          fill={fillColor}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
          pointerEvents="all"
          style={{ cursor: 'move' }}
          filter={wireframeEnabled ? undefined : (textFilterId ? `url(#${textFilterId})` : undefined)}
        >
          {textAttributeAnimations.length > 0
            ? renderAnimationsForElement(animationTargetElementId, textAttributeAnimations, animationState, animations)
            : null}
          {renderInlineTextEffectAnimations(inlineBaseAnimations.filter((animation) => animation.attributeName !== 'startOffset'), `${element.id}-textfx-base`, restartKey)}
          <textPath
            href={`#${pathRefId}`}
            startOffset={
              textPath.startOffset !== undefined
                ? (typeof textPath.startOffset === 'number' ? `${textPath.startOffset}%` : textPath.startOffset)
                : undefined
            }
            method={textPath.method}
            spacing={textPath.spacing}
            lengthAdjust={textPath.lengthAdjust}
            textLength={textPath.textLength}
          >
            {renderTextPathContent(element.id, fillColor, true)}
            {renderInlineTextEffectAnimations(inlineBaseAnimations.filter((animation) => animation.attributeName === 'startOffset'), `${element.id}-textfx-base-start`, restartKey)}
            {allowRender
              ? textPathAnimations.map((animation) => {
                const commonProps = {
                  dur: animation.dur ?? '2s',
                  begin: resolveAnimationBegin(animation, animationState, animations),
                  end: resolveAnimationEnd(animation, animations),
                  fill: animation.fill ?? 'freeze',
                  repeatCount: animation.repeatCount ?? 1,
                  repeatDur: animation.repeatDur,
                  calcMode: animation.calcMode ?? 'linear',
                  keyTimes: animation.keyTimes,
                  keySplines: animation.keySplines,
                };
                return (
                  <animate
                    key={`${animation.id}-${restartKey}`}
                    id={getAnimationDomId(animation)}
                    {...commonProps}
                    attributeName={animation.attributeName}
                    values={animation.values}
                    from={animation.from}
                    to={animation.to}
                    additive={animation.additive ?? 'replace'}
                    accumulate={animation.accumulate ?? 'none'}
                  />
                );
              })
              : null}
          </textPath>
        </text>
        {overlays.map(renderEffectLayer)}
      </g>
    );

    const wrappedContent = ancestorGroups.reduceRight<React.ReactNode>((child, group, index) => {
      const groupTransform = toTransformAttr(getElementTransformMatrix(group));
      const groupAnimationNodes = renderAnimationsForElement(group.id, animations, animationState, animations);

      return (
        <g
          key={`${element.id}-textpath-ancestor-${group.id}-${index}`}
          transform={groupTransform}
        >
          {groupAnimationNodes}
          {child}
        </g>
      );
    }, content);

    nodes.push(wrappedContent);
  });

  return nodes.length ? <>{nodes}</> : null;
};

export const renderTextPaths = (context: CanvasLayerContext): React.ReactNode => {
  return <TextPathLayer context={context} />;
};

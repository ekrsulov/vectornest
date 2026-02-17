/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasLayerContext } from '../../types/plugins';
import type { PathElement } from '../../types';
import type { WireframePluginSlice } from '../wireframe/slice';
import { commandsToString } from '../../utils/pathParserUtils';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import { ensureChainDelays } from '../animationSystem/chainUtils';

const getEffectiveStrokeColor = (path: PathElement['data']): string => {
  if (path.strokeColor === 'none') return '#00000001';
  return path.strokeColor;
};

const TextPathLayer: React.FC<{ context: CanvasLayerContext }> = ({ context }) => {
  const wireframe = useCanvasStore((state) => (state as unknown as WireframePluginSlice).wireframe);
  const { animations = [], animationState } = useCanvasStore((state) => state as unknown as AnimationPluginSlice);
  const { colorMode } = useColorMode();
  const { sortedElements, isElementHidden } = context;
  const nodes: React.ReactNode[] = [];
  const wireframeEnabled = wireframe?.enabled ?? false;
  const wireframeStroke = colorMode === 'dark' ? '#ffffff' : '#000000';
  const removeFill = wireframe?.removeFill ?? false;

  sortedElements.forEach((element) => {
    if (element.type !== 'path') return;
    if (isElementHidden?.(element.id)) return;
    const pathData = (element as PathElement).data;
    const textPath = pathData.textPath;
    if (!textPath || !textPath.text) return;
    const maskUrl = textPath.maskId ?? pathData.maskId;
    const clipPathUrl = pathData.clipPathId ? `url(#${pathData.clipPathId})` : undefined;

    const pathD = commandsToString(pathData.subPaths.flat());
    const pathRefId = `${element.id}-textpath-ref`;
    const effectiveStrokeColor = wireframeEnabled ? wireframeStroke : getEffectiveStrokeColor(pathData);
    const fillColor = wireframeEnabled
      ? (removeFill ? 'none' : wireframeStroke)
      : (textPath.fillColor ?? effectiveStrokeColor ?? '#000000');
    const fillOpacity = wireframeEnabled
      ? (removeFill ? 0 : 0.35)
      : (textPath.fillOpacity ?? 1);
    const strokeColor = wireframeEnabled ? wireframeStroke : (textPath.strokeColor ?? 'none');
    const strokeWidth = wireframeEnabled ? 1 : (textPath.strokeWidth ?? 0);
    const strokeOpacity = wireframeEnabled ? 1 : (textPath.strokeOpacity ?? 1);
    const chainDelays: Map<string, number> = ensureChainDelays(animationState?.chainDelays);
    const restartKey = animationState?.restartKey ?? 0;
    const transformAttr = (() => {
      if (textPath.transformMatrix) return `matrix(${textPath.transformMatrix.join(' ')})`;
      const pathTransform = (pathData as { transformMatrix?: number[] }).transformMatrix;
      if (pathTransform) return `matrix(${pathTransform.join(' ')})`;
      const t = (pathData as { transform?: { translateX?: number; translateY?: number; rotation?: number; scaleX?: number; scaleY?: number } }).transform;
      if (t && (t.translateX || t.translateY || t.rotation || t.scaleX !== 1 || t.scaleY !== 1)) {
        return `translate(${t.translateX ?? 0} ${t.translateY ?? 0}) rotate(${t.rotation ?? 0}) scale(${t.scaleX ?? 1} ${t.scaleY ?? 1})`;
      }
      return undefined;
    })();

    const textPathAnimations: SVGAnimation[] = animations.filter(
      (anim) =>
        anim.targetElementId === element.id &&
        anim.attributeName === 'startOffset'
    );
    const allowRender =
      animationState?.isPlaying ||
      animationState?.hasPlayed ||
      textPathAnimations.length > 0;

    nodes.push(
      <g
        key={`${element.id}-textpath`}
        data-element-id={element.id}
        transform={transformAttr}
        {...(maskUrl ? { mask: `url(#${maskUrl})` } : {})}
        {...(clipPathUrl ? { clipPath: clipPathUrl } : {})}
        opacity={textPath.opacity ?? pathData.opacity}
      >
        <path
          id={pathRefId}
          data-element-id={element.id}
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(pathData.strokeWidth, 6)}
          pointerEvents="stroke"
        />
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
          filter={wireframeEnabled ? undefined : (pathData.filterId ? `url(#${pathData.filterId})` : undefined)}
        >
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
            {textPath.spans && textPath.spans.length > 0
              ? textPath.spans.map((span, idx) => {
                const isLineStart = idx === 0 || span.line !== textPath.spans![idx - 1]?.line;
                return (
                  <tspan
                    key={`${element.id}-tp-span-${idx}`}
                    dy={isLineStart && span.line > 0 ? textPath.fontSize * (span.line - (textPath.spans![idx - 1]?.line ?? 0)) : undefined}
                    dx={span.dx}
                    fontWeight={span.fontWeight}
                    fontStyle={span.fontStyle}
                    textDecoration={span.textDecoration}
                    fill={wireframeEnabled ? (removeFill ? 'none' : wireframeStroke) : (span.fillColor ?? textPath.fillColor ?? effectiveStrokeColor)}
                  >
                    {span.text}
                  </tspan>
                );
              })
              : textPath.text}
            {allowRender
              ? textPathAnimations.map((animation) => {
                const delayMs = chainDelays.get(animation.id) ?? 0;
                const beginValue = delayMs > 0 ? `${(delayMs / 1000).toFixed(3)}s` : (animation.begin ?? '0s');
                const commonProps = {
                  dur: animation.dur ?? '2s',
                  begin: beginValue,
                  end: animation.end,
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
      </g>
    );
  });

  return nodes.length ? <>{nodes}</> : null;
};

export const renderTextPaths = (context: CanvasLayerContext): React.ReactNode => {
  return <TextPathLayer context={context} />;
};

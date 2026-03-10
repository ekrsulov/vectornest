import type { NativeTextElement } from './types';
import React from 'react';
import type { CanvasElementRenderer, CanvasRenderContext } from '../../canvas/renderers/CanvasRendererRegistry';
import { isTouchDevice } from '../../utils/domHelpers';
import { useCanvasStore } from '../../store/canvasStore';
import type { WireframePluginSlice } from '../wireframe/slice';
import type { InlineTextEditSlice } from './inlineEditSlice';
import { renderAnimationsForElement } from '../animationSystem/renderAnimations';
import type { AnimationState, SVGAnimation } from '../animationSystem/types';
import { getClipRuntimeId } from '../../utils/maskUtils';
import {
  getTextEffectBaseAnimationsFromMetadata,
  getTextEffectLayersFromMetadata,
  renderInlineTextEffectAnimations,
} from '../textEffectsLibrary/renderLayerUtils';

type TextRendererOverrides = {
  fill?: string;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  mode?: 'wireframe' | 'normal';
  scaleStrokeWithZoom?: boolean;
  disableFilter?: boolean;
};

const computeTransformAttr = (data: NativeTextElement['data']) => {
  if (data.transformMatrix) {
    return `matrix(${data.transformMatrix.join(' ')})`;
  }
  if (data.transform) {
    const cx = data.x;
    const cy = data.y;
    return `translate(${data.transform.translateX ?? 0} ${data.transform.translateY ?? 0}) rotate(${data.transform.rotation ?? 0} ${cx} ${cy}) scale(${data.transform.scaleX ?? 1} ${data.transform.scaleY ?? 1})`;
  }
  return undefined;
};

const composeTransforms = (...parts: Array<string | undefined>): string | undefined => {
  const value = parts.filter(Boolean).join(' ');
  return value.length > 0 ? value : undefined;
};

export const NativeTextRenderer: CanvasElementRenderer<NativeTextElement> = (
  element,
  context: CanvasRenderContext
) => {
  // Delegate to a proper React component so hooks can be used safely.
  // Calling hooks directly in the renderer function violates Rules of Hooks
  // because the renderer is invoked as a nested function from CanvasStage.
  return <NativeTextRendererInner element={element} context={context} />;
};

const NativeTextRendererInner: React.FC<{
  element: NativeTextElement;
  context: CanvasRenderContext;
}> = ({ element, context }) => {
  const { viewport, scaleStrokeWithZoom, eventHandlers, isElementSelected, isElementLocked, isPathInteractionDisabled, pathCursorMode, rendererOverrides, extensionsContext } = context;
  const data = element.data;
  const textOverrides = (rendererOverrides?.element?.nativeText as TextRendererOverrides | undefined) ?? undefined;
  const transformAttr = computeTransformAttr(data);
  const wireframeState = (useCanvasStore.getState() as unknown as WireframePluginSlice | undefined)?.wireframe;
  const isWireframe = Boolean(wireframeState?.enabled);
  // Reactive selector — re-renders whenever editingElementId changes
  const editingElementId = useCanvasStore((state) => (state as unknown as InlineTextEditSlice).inlineTextEdit?.editingElementId ?? null);
  // SVG text stays VISIBLE during inline editing — the transparent overlay
  // captures keystrokes and updates the element in real-time, so the SVG
  // is the display layer. No hiding needed.
  void editingElementId;
  const removeWireframeFill = Boolean(isWireframe && wireframeState?.removeFill);
  const disableFilter =
    isWireframe
    || (textOverrides?.disableFilter ?? false)
    || (textOverrides?.mode === 'wireframe')
    || rendererOverrides?.path?.disableFilter === true
    || (rendererOverrides?.element?.nativeText as TextRendererOverrides | undefined)?.disableFilter === true;
  const filterAttr = disableFilter ? 'none' : (data.filterId ? `url(#${data.filterId})` : undefined);
  
  // Get versioned mask ID for cache invalidation when mask position changes
  const maskVersions = extensionsContext?.maskVersions as Map<string, number> | undefined;
  const maskVersion = data.maskId && maskVersions?.get(data.maskId);
  const maskRuntimeId = data.maskId && maskVersion ? `${data.maskId}-v${maskVersion}` : data.maskId;
  const maskAttr = maskRuntimeId ? { mask: `url(#${maskRuntimeId})` } : {};
  const clipVersions = extensionsContext?.clipVersions as Map<string, number> | undefined;
  const clipRuntimeId = getClipRuntimeId(data.clipPathId, (data as unknown as Record<string, unknown>).clipPathTemplateId as string | undefined, clipVersions);
  const renderMode = textOverrides?.mode ?? (isWireframe ? 'wireframe' : 'normal');

  const pointerDownHandler = eventHandlers.onPointerDown;
  const pointerUpHandler = eventHandlers.onPointerUp;
  const isSelected = isElementSelected?.(element.id) ?? false;
  const isLocked = isElementLocked?.(element.id) ?? false;
  const allAnimations = (context.animations as SVGAnimation[] | undefined) ?? [];
  const animationState = context.animationState as AnimationState | undefined;
  const transformAnimations = allAnimations.filter(
    (animation) =>
      animation.targetElementId === element.id &&
      (animation.type === 'animateTransform' || animation.type === 'animateMotion')
  );
  const textAttributeAnimations = allAnimations.filter(
    (animation) =>
      animation.targetElementId === element.id &&
      animation.type !== 'animateTransform' &&
      animation.type !== 'animateMotion'
  );
  const groupAnimationNodes = renderAnimationsForElement(element.id, transformAnimations, animationState, allAnimations);
  const animationNodes = renderAnimationsForElement(element.id, textAttributeAnimations, animationState, allAnimations);

  // Removed: handleDoubleClick now handled by basePlugins -> transformation flow
  // This ensures consistent double-click behavior across all element types

  const isTouch = isTouchDevice();
  const doubleClickHandler = eventHandlers.onDoubleClick;

  const nativeFill = data.fillColor ?? 'none';
  const nativeOpacity = data.fillOpacity ?? 1;
  const overrideFill = textOverrides?.fill;
  const overrideOpacity = textOverrides?.opacity;
  const baseStrokeWidth = textOverrides?.strokeWidth ?? data.strokeWidth ?? 0;
  const strokeScalingEnabled = renderMode === 'wireframe'
    ? (textOverrides?.scaleStrokeWithZoom ?? false)
    : (textOverrides?.scaleStrokeWithZoom ?? scaleStrokeWithZoom);
  const strokeWidth = strokeScalingEnabled ? baseStrokeWidth : baseStrokeWidth / viewport.zoom;
  // Remove dash in wireframe by default
  const resolvedDasharray = renderMode === 'wireframe'
    ? (textOverrides?.strokeDasharray ?? 'none')
    : textOverrides?.strokeDasharray ?? data.strokeDasharray ?? 'none';

  let fill: string | undefined = nativeFill;
  let opacity: number | undefined = nativeOpacity;

  if (renderMode === 'wireframe') {
    if (removeWireframeFill) {
      fill = 'none';
      opacity = overrideOpacity ?? nativeOpacity;
    } else if (overrideFill !== undefined || overrideOpacity !== undefined) {
      fill = overrideFill ?? nativeFill;
      opacity = overrideOpacity ?? nativeOpacity;
    } else {
      // Wireframe without hide-fill: keep native fill/opacity
      fill = nativeFill;
      opacity = nativeOpacity;
    }
  } else {
    fill = overrideFill ?? nativeFill ?? 'none';
    opacity = overrideOpacity ?? nativeOpacity ?? 1;
  }
  const lineHeight = data.lineHeight ?? 1.2;
  const letterSpacing = data.letterSpacing;
  const wordSpacing = data.wordSpacing;
  const textTransform = data.textTransform;
  const dominantBaseline = data.dominantBaseline;
  const direction = data.direction;
  const unicodeBidi = data.unicodeBidi;
  const rotate = data.rotate;
  const writingMode = data.writingMode === 'horizontal-tb' ? undefined : data.writingMode;
  const strokeColor = textOverrides?.strokeColor ?? data.strokeColor ?? 'none';
  const strokeDasharray = resolvedDasharray === 'none' ? undefined : resolvedDasharray;

  const spans = data.spans && data.spans.length > 0 ? data.spans : null;
  const lines = spans ? Array.from(new Set(spans.map(s => s.line))).sort((a, b) => a - b) : (data.text || '').split(/\r?\n/);
  const textEffectLayers = renderMode === 'wireframe' ? [] : getTextEffectLayersFromMetadata(data.metadata);
  const inlineBaseAnimations = renderMode === 'wireframe' ? [] : getTextEffectBaseAnimationsFromMetadata(data.metadata);
  const underlays = textEffectLayers.filter((layer) => layer.renderBeforeBase);
  const overlays = textEffectLayers.filter((layer) => !layer.renderBeforeBase);
  const restartKey = animationState?.restartKey ?? 0;

  const clipAttr = clipRuntimeId ? { clipPath: `url(#${clipRuntimeId})` } : {};
  const blendStyle: React.CSSProperties = {};
  if (data.mixBlendMode) blendStyle.mixBlendMode = data.mixBlendMode as React.CSSProperties['mixBlendMode'];
  if (data.isolation) blendStyle.isolation = data.isolation;

  const renderTextContent = (
    keyPrefix: string,
    layerFill: string | undefined,
    useSourceFill: boolean,
  ) => (
    spans
      ? spans.map((span, idx) => {
        const isLineStart = idx === 0 || span.line !== spans[idx - 1].line;
        // Use stored per-glyph dy if available, otherwise compute from line height
        const dyValue = span.dy
          ? span.dy
          : (isLineStart ? (span.line === 0 ? 0 : data.fontSize * lineHeight * (span.line - (spans[idx - 1]?.line ?? 0))) : undefined);
        return (
          <tspan
            key={`${keyPrefix}-tspan-${idx}`}
            x={isLineStart ? data.x : undefined}
            dy={dyValue}
            dx={span.dx}
            rotate={span.rotate}
            fontWeight={span.fontWeight}
            fontStyle={span.fontStyle}
            fontSize={span.fontSize}
            textDecoration={span.textDecoration}
            fill={useSourceFill ? (span.fillColor ?? layerFill) : layerFill}
          >
            {span.text}
          </tspan>
        );
      })
      : (lines as string[]).map((line, idx) => (
        <tspan key={`${keyPrefix}-tspan-${idx}`} x={data.x} dy={idx === 0 ? 0 : data.fontSize * lineHeight}>
          {line}
        </tspan>
      ))
  );

  const renderEffectLayer = (layer: typeof textEffectLayers[number], index: number) => {
    const layerMaskVersion = layer.maskId && maskVersions?.get(layer.maskId);
    const layerMaskId = layer.maskId && layerMaskVersion ? `${layer.maskId}-v${layerMaskVersion}` : layer.maskId;
    const layerClipId = getClipRuntimeId(layer.clipPathId, undefined, clipVersions);
    const layerFill = layer.useSourceFill ? fill : (layer.fillColor ?? 'none');
    const layerFillOpacity = layer.fillOpacity ?? (layer.useSourceFill ? opacity : 1);
    const layerFilter = disableFilter ? undefined : (layer.filterId ? `url(#${layer.filterId})` : undefined);

    return (
      <g
        key={`${element.id}-textfx-layer-${index}`}
        transform={composeTransforms(
          layer.offsetX || layer.offsetY
            ? `translate(${layer.offsetX} ${layer.offsetY})`
            : undefined,
        )}
        pointerEvents="none"
      >
        <text
          x={data.x}
          y={data.y}
          fontSize={data.fontSize}
          fontFamily={data.fontFamily}
          fontWeight={data.fontWeight ?? 'normal'}
          fontStyle={data.fontStyle ?? 'normal'}
          fill={layerFill}
          fillOpacity={layerFillOpacity}
          stroke={layer.strokeColor ?? 'none'}
          strokeWidth={layer.strokeWidth ?? 0}
          strokeOpacity={layer.strokeOpacity ?? 1}
          strokeLinecap={data.strokeLinecap}
          strokeLinejoin={data.strokeLinejoin}
          strokeDasharray={strokeDasharray}
          textAnchor={data.textAnchor ?? 'start'}
          textDecoration={data.textDecoration ?? 'none'}
          dominantBaseline={dominantBaseline}
          writingMode={writingMode}
          direction={direction}
          wordSpacing={wordSpacing}
          unicodeBidi={unicodeBidi}
          rotate={rotate ? rotate.join(' ') : undefined}
          filter={layerFilter}
          opacity={layer.opacity}
          letterSpacing={letterSpacing}
          lengthAdjust={data.lengthAdjust}
          textLength={data.textLength}
          style={{
            pointerEvents: 'none',
            textDecoration: data.textDecoration ?? 'none',
            ...(textTransform ? { textTransform } : {}),
            ...blendStyle,
          }}
          {...(layerClipId ? { clipPath: `url(#${layerClipId})` } : {})}
          {...(layerMaskId ? { mask: `url(#${layerMaskId})` } : {})}
        >
          {renderInlineTextEffectAnimations(layer.animations, `${element.id}-textfx-layer-${index}`, restartKey)}
          {renderTextContent(`${element.id}-textfx-layer-${index}`, layerFill, Boolean(layer.useSourceFill))}
        </text>
      </g>
    );
  };

  return (
    <g
      key={element.id}
      data-element-id={element.id}
      transform={transformAttr}
    >
      {groupAnimationNodes}
      {underlays.map(renderEffectLayer)}
      <text
        data-element-id={element.id}
        x={data.x}
        y={data.y}
        fontSize={data.fontSize}
        fontFamily={data.fontFamily}
        fontWeight={data.fontWeight ?? 'normal'}
        fontStyle={data.fontStyle ?? 'normal'}
        fill={fill}
        fillOpacity={opacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={data.strokeOpacity ?? 1}
        strokeLinecap={data.strokeLinecap}
        strokeLinejoin={data.strokeLinejoin}
        strokeDasharray={strokeDasharray}
        textAnchor={data.textAnchor ?? 'start'}
        textDecoration={data.textDecoration ?? 'none'}
        dominantBaseline={dominantBaseline}
        writingMode={writingMode}
        direction={direction}
        wordSpacing={wordSpacing}
        unicodeBidi={unicodeBidi}
        rotate={rotate ? rotate.join(' ') : undefined}
        filter={filterAttr}
        opacity={data.opacity}
        letterSpacing={letterSpacing}
        lengthAdjust={data.lengthAdjust}
        textLength={data.textLength}
        {...(!isTouch && pointerDownHandler && { onPointerDown: (event) => pointerDownHandler(element.id, event) })}
        {...(!isTouch && pointerUpHandler && { onPointerUp: (event) => pointerUpHandler(element.id, event) })}
        {...(!isTouch && doubleClickHandler && { onDoubleClick: (event) => doubleClickHandler(element.id, event) })}
        style={{
          cursor:
            pathCursorMode === 'select'
              ? isLocked
                ? 'default'
                : isSelected
                  ? 'move'
                  : 'text'
              : 'text',
          pointerEvents: isPathInteractionDisabled ? 'none' : 'auto',
          textDecoration: data.textDecoration ?? 'none',
          ...(textTransform ? { textTransform } : {}),
          ...(disableFilter ? { filter: 'none' } : {}),
          ...blendStyle,
        }}
        {...clipAttr}
        {...maskAttr}
      >
        {animationNodes}
        {renderInlineTextEffectAnimations(inlineBaseAnimations, `${element.id}-textfx-base`, restartKey)}
        {renderTextContent(element.id, fill, true)}
      </text>
      {overlays.map(renderEffectLayer)}
    </g>
  );
};

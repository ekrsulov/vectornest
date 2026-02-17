import type { NativeShapeElement } from './types';
import type React from 'react';
import type { CanvasElementRenderer, CanvasRenderContext } from '../../canvas/renderers/CanvasRendererRegistry';
import { isTouchDevice } from '../../utils/domHelpers';
import { useCanvasStore } from '../../store/canvasStore';
import type { WireframePluginSlice } from '../wireframe/slice';
import { getInitialAnimationAttributes, renderAnimationsForElement } from '../animationSystem/renderAnimations';
import type { AnimationState, SVGAnimation } from '../animationSystem/types';
import { normalizeMarkerId, toMarkerUrl } from '../../utils/markerUtils';

const computeTransform = (data: NativeShapeElement['data']) => {
  if (data.transformMatrix) return `matrix(${data.transformMatrix.join(' ')})`;
  if (data.transform) {
    const cx = data.x + data.width / 2;
    const cy = data.y + data.height / 2;
    return `translate(${data.transform.translateX ?? 0} ${data.transform.translateY ?? 0}) rotate(${data.transform.rotation ?? 0} ${cx} ${cy}) scale(${data.transform.scaleX ?? 1} ${data.transform.scaleY ?? 1})`;
  }
  return undefined;
};

type NativeShapeRendererOverrides = {
  mode?: 'wireframe' | 'normal';
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeDasharray?: string;
  fillColor?: string;
  fillOpacity?: number;
  scaleStrokeWithZoom?: boolean;
  disableFilter?: boolean;
};

export const NativeShapesRenderer: CanvasElementRenderer<NativeShapeElement> = (
  element,
  context: CanvasRenderContext
) => {
  const { viewport, scaleStrokeWithZoom, eventHandlers, isElementSelected, isElementLocked, isPathInteractionDisabled, pathCursorMode, rendererOverrides } = context;
  const data = element.data;
  const transformAttr = computeTransform(data);
  const markerStartId = normalizeMarkerId(data.markerStart);
  const markerMidId = normalizeMarkerId(data.markerMid);
  const markerEndId = normalizeMarkerId(data.markerEnd);
  const markerKey = `${element.id}-${markerStartId ?? ''}-${markerMidId ?? ''}-${markerEndId ?? ''}`;
  const isTouch = isTouchDevice();
  const pointerDownHandler = eventHandlers.onPointerDown;
  const pointerUpHandler = eventHandlers.onPointerUp;
  const doubleClickHandler = eventHandlers.onDoubleClick;
  const isSelected = isElementSelected?.(element.id) ?? false;
  const isLocked = isElementLocked?.(element.id) ?? false;

  // Removed: handleDoubleClick now handled by basePlugins -> transformation flow
  // This ensures consistent double-click behavior across all element types

  const shapeOverrides = (rendererOverrides?.element?.nativeShape as NativeShapeRendererOverrides | undefined) ?? undefined;
  const renderMode = shapeOverrides?.mode ?? 'normal';
  const baseStrokeWidth = shapeOverrides?.strokeWidth ?? data.strokeWidth ?? 1;
  const strokeScalingEnabled = renderMode === 'wireframe'
    ? (shapeOverrides?.scaleStrokeWithZoom ?? false)
    : (shapeOverrides?.scaleStrokeWithZoom ?? scaleStrokeWithZoom);
  const strokeWidth = strokeScalingEnabled ? baseStrokeWidth : baseStrokeWidth / viewport.zoom;
  const strokeDasharray = renderMode === 'wireframe'
    ? (shapeOverrides?.strokeDasharray ?? 'none')
    : shapeOverrides?.strokeDasharray ?? data.strokeDasharray ?? 'none';

  const clipAttr = data.clipPathId ? { clipPath: `url(#${data.clipPathId})` } : {};
  // Use versioned mask URL to force browser cache invalidation when mask position changes
  const maskVersions = (context.extensionsContext?.maskVersions as Map<string, number> | undefined);
  const maskVersion = data.maskId && maskVersions?.get(data.maskId);
  const maskRuntimeId = data.maskId && maskVersion ? `${data.maskId}-v${maskVersion}` : data.maskId;
  const maskAttr = maskRuntimeId ? { mask: `url(#${maskRuntimeId})` } : {};
  const initialAttrs = getInitialAnimationAttributes(
    element.id,
    (context.animations as SVGAnimation[] | undefined) ?? [],
    context.animationState as AnimationState | undefined
  );
  const animationNodes = renderAnimationsForElement(
    element.id,
    (context.animations as SVGAnimation[] | undefined) ?? [],
    context.animationState as AnimationState | undefined
  );
  const wireframeState = (useCanvasStore.getState() as unknown as WireframePluginSlice | undefined)?.wireframe;
  const removeWireframeFill = Boolean(wireframeState?.enabled && wireframeState?.removeFill);
  const hasNativeFill = (() => {
    const nativeFill = data.fillColor ?? 'none';
    const nativeFillOpacity = data.fillOpacity ?? 1;
    return nativeFill !== 'none' && nativeFillOpacity > 0;
  })();

  let fillColor: string | undefined;
  let fillOpacity: number | undefined;

  const overrideFillColor = shapeOverrides?.fillColor;
  const overrideFillOpacity = shapeOverrides?.fillOpacity;

  if (renderMode === 'wireframe') {
    if (removeWireframeFill || (!hasNativeFill && overrideFillColor === undefined)) {
      // Keep shapes without a fill truly transparent in wireframe mode
      fillColor = 'none';
      fillOpacity = 0.001;
    } else if (overrideFillColor !== undefined || overrideFillOpacity !== undefined) {
      fillColor = overrideFillColor ?? data.fillColor ?? 'none';
      fillOpacity = overrideFillOpacity ?? data.fillOpacity ?? 1;
    } else {
      // Wireframe mode but no override: keep the native fill
      fillColor = data.fillColor ?? 'none';
      fillOpacity = data.fillOpacity ?? 1;
    }
  } else {
    fillColor = overrideFillColor ?? data.fillColor ?? 'none';
    fillOpacity = overrideFillOpacity ?? data.fillOpacity ?? 1;
  }
  if (fillColor === 'none' || fillColor === undefined) {
    fillColor = '#000';
    fillOpacity = 0.001; // minimal fill so the shape can be picked by pointer events
  }

  const blendStyle: React.CSSProperties = {};
  if (data.mixBlendMode) blendStyle.mixBlendMode = data.mixBlendMode as React.CSSProperties['mixBlendMode'];
  if (data.isolation) blendStyle.isolation = data.isolation;

  const baseStyle: React.CSSProperties = {
    ...blendStyle,
    cursor:
      pathCursorMode === 'select'
        ? isLocked
          ? 'default'
          : isSelected
            ? 'move'
            : 'pointer'
        : 'default',
  };

  const baseProps = {
    'data-element-id': element.id,
    stroke: shapeOverrides?.strokeColor ?? data.strokeColor ?? '#000',
    strokeWidth,
    strokeOpacity: shapeOverrides?.strokeOpacity ?? data.strokeOpacity ?? 1,
    strokeLinecap: data.strokeLinecap,
    strokeLinejoin: data.strokeLinejoin,
    strokeDasharray: strokeDasharray === 'none' ? undefined : strokeDasharray,
    fill: fillColor,
    fillOpacity,
    transform: transformAttr,
    opacity: data.opacity,
    filter: shapeOverrides?.disableFilter ? undefined : (data.filterId ? `url(#${data.filterId})` : undefined),
    markerStart: toMarkerUrl(markerStartId),
    markerMid: toMarkerUrl(markerMidId),
    markerEnd: toMarkerUrl(markerEndId),
    pointerEvents: isPathInteractionDisabled ? 'none' : 'auto' as const,
    ...(!isTouch && pointerDownHandler && { onPointerDown: (event: React.PointerEvent<SVGElement>) => pointerDownHandler(element.id, event) }),
    ...(!isTouch && pointerUpHandler && { onPointerUp: (event: React.PointerEvent<SVGElement>) => pointerUpHandler(element.id, event) }),
    ...(!isTouch && doubleClickHandler && { onDoubleClick: (event: React.MouseEvent<SVGElement>) => doubleClickHandler(element.id, event) }),
    style: baseStyle,
    ...clipAttr,
    ...maskAttr,
  };
  const mergedAttrs = {
    ...baseProps,
    ...(initialAttrs.transform ? { transform: String(initialAttrs.transform) } : {}),
    ...initialAttrs,
  };

  switch (data.kind) {
    case 'rect':
      return (
        <rect
          key={markerKey}
          {...mergedAttrs}
          x={data.x}
          y={data.y}
          width={data.width}
          height={data.height}
          rx={data.rx}
          ry={data.ry}
        >
          {animationNodes}
        </rect>
      );
    case 'square': {
      const squareSize = Math.min(data.width, data.height);
      return (
        <rect
          key={markerKey}
          {...mergedAttrs}
          x={data.x}
          y={data.y}
          width={squareSize}
          height={squareSize}
          rx={data.rx}
          ry={data.ry}
        >
          {animationNodes}
        </rect>
      );
    }
    case 'circle':
      return (
        <circle
          key={markerKey}
          {...mergedAttrs}
          cx={data.x + data.width / 2}
          cy={data.y + data.height / 2}
          r={Math.min(data.width, data.height) / 2}
        >
          {animationNodes}
        </circle>
      );
    case 'ellipse':
      return (
        <ellipse
          key={markerKey}
          {...mergedAttrs}
          cx={data.x + data.width / 2}
          cy={data.y + data.height / 2}
          rx={data.width / 2}
          ry={data.height / 2}
        >
          {animationNodes}
        </ellipse>
      );
    case 'line':
      return (
        <line
          key={markerKey}
          {...mergedAttrs}
          x1={data.x}
          y1={data.y}
          x2={data.x + data.width}
          y2={data.y + data.height}
        >
          {animationNodes}
        </line>
      );
    case 'polygon':
    case 'polyline': {
      const pts = data.points ?? [];
      const pointsAttr = pts.map((p) => `${p.x},${p.y}`).join(' ');
      const Tag = data.kind;
      return (
        <Tag key={markerKey} {...mergedAttrs} points={pointsAttr}>
          {animationNodes}
        </Tag>
      );
    }
    default:
      return null;
  }
};

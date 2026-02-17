import type { PluginImageElement as ImageElement } from './types';
import type {
  CanvasElementRenderer,
  CanvasRenderContext,
} from '../../canvas/renderers/CanvasRendererRegistry';
import { isTouchDevice } from '../../utils/domHelpers';
import { renderAnimationsForElement } from '../animationSystem/renderAnimations';
import type { AnimationState, SVGAnimation } from '../animationSystem/types';
import { getInitialAnimationAttributes } from '../animationSystem/renderAnimations';

type ImageRendererOverrides = {
  mode?: 'wireframe' | 'normal';
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  showImage?: boolean;
  fillColor?: string;
  fillOpacity?: number;
  scaleStrokeWithZoom?: boolean;
  disableFilter?: boolean;
};

export const ImageElementRenderer: CanvasElementRenderer<ImageElement> = (
  element,
  context: CanvasRenderContext
) => {
  const { viewport, scaleStrokeWithZoom, eventHandlers, isElementSelected, isElementLocked, isPathInteractionDisabled, pathCursorMode, rendererOverrides, extensionsContext } = context;
  const data = element.data;
  const imageOverrides = (rendererOverrides?.element?.image as ImageRendererOverrides | undefined) ?? undefined;
  const transformAttr = data.transformMatrix
    ? `matrix(${data.transformMatrix.join(' ')})`
    : data.transform
      ? `translate(${data.transform.translateX} ${data.transform.translateY}) rotate(${data.transform.rotation} ${data.x + data.width / 2} ${data.y + data.height / 2}) scale(${data.transform.scaleX} ${data.transform.scaleY})`
      : undefined;

  // Get versioned mask ID for cache invalidation when mask position changes
  const maskVersions = extensionsContext?.maskVersions as Map<string, number> | undefined;
  const maskVersion = data.maskId && maskVersions?.get(data.maskId);
  const maskRuntimeId = data.maskId && maskVersion ? `${data.maskId}-v${maskVersion}` : data.maskId;

  const pointerDownHandler = eventHandlers.onPointerDown;
  const pointerUpHandler = eventHandlers.onPointerUp;
  const isSelected = isElementSelected?.(element.id) ?? false;
  const isLocked = isElementLocked?.(element.id) ?? false;

  // Removed: handleDoubleClick now handled by basePlugins -> transformation flow
  // This ensures consistent double-click behavior across all element types

  const isTouch = isTouchDevice();
  const doubleClickHandler = eventHandlers.onDoubleClick;

  const renderMode = imageOverrides?.mode ?? 'normal';
  const strokeColor = imageOverrides?.strokeColor ?? (context.colorMode === 'dark' ? '#ffffff' : '#000000');
  const baseStrokeWidth = imageOverrides?.strokeWidth ?? 1;
  const strokeScalingEnabled = imageOverrides?.scaleStrokeWithZoom ?? scaleStrokeWithZoom;
  const strokeWidth = strokeScalingEnabled ? baseStrokeWidth : baseStrokeWidth / viewport.zoom;
  const opacity = imageOverrides?.opacity ?? data.opacity ?? 1;
  const showImage = imageOverrides?.showImage ?? true;
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

  const clipAttr = data.clipPathId ? { clipPath: `url(#${data.clipPathId})` } : {};
  const maskAttr = maskRuntimeId ? { mask: `url(#${maskRuntimeId})` } : {};
  const useClip = renderMode !== 'wireframe'; // In wireframe avoid clipping so the outline is visible
  const appliedClipAttr = useClip ? clipAttr : {};
  const baseImage = showImage ? (
    <image
      key={`${element.id}-image`}
      data-element-id={element.id}
      href={data.href}
      x={data.x}
      y={data.y}
      width={data.width}
      height={data.height}
      opacity={opacity}
      filter={imageOverrides?.disableFilter ? undefined : (data.filterId ? `url(#${data.filterId})` : undefined)}
      preserveAspectRatio={data.preserveAspectRatio ?? 'xMidYMid meet'}
      transform={initialAttrs.transform ? String(initialAttrs.transform) : transformAttr}
      {...appliedClipAttr}
      {...maskAttr}
      {...initialAttrs}
      {...(!isTouch && pointerDownHandler && {
        onPointerDown: (event) => pointerDownHandler(element.id, event)
      })}
      {...(!isTouch && pointerUpHandler && {
        onPointerUp: (event) => pointerUpHandler(element.id, event)
      })}
      {...(!isTouch && doubleClickHandler && {
        onDoubleClick: (event) => doubleClickHandler(element.id, event)
      })}
      // onDoubleClick removed - handled by canvas event bus
      style={{
        cursor:
          pathCursorMode === 'select'
            ? isLocked
              ? 'default'
              : isSelected
                ? 'move'
                : 'pointer'
            : 'default',
        pointerEvents: isPathInteractionDisabled ? 'none' : 'auto',
      }}
    >
      {animationNodes}
    </image>
  ) : null;

  if (renderMode === 'wireframe') {
    const wireframeFill = imageOverrides?.fillColor ?? 'none';
    const wireframeFillOpacity = imageOverrides?.fillOpacity;
    const rectPointerProps = !isTouch && pointerDownHandler
      ? {
          onPointerDown: (event: React.PointerEvent<SVGRectElement>) => pointerDownHandler(element.id, event),
          ...(pointerUpHandler && { onPointerUp: (event: React.PointerEvent<SVGRectElement>) => pointerUpHandler(element.id, event) }),
        }
      : {};

    return (
      <g key={element.id} data-element-id={element.id} style={{ pointerEvents: isPathInteractionDisabled ? 'none' : 'auto' }} {...appliedClipAttr}>
        {baseImage}
        <rect
          data-element-id={element.id}
          x={data.x}
          y={data.y}
          width={data.width}
          height={data.height}
          fill={wireframeFill}
          {...(wireframeFillOpacity !== undefined ? { fillOpacity: wireframeFillOpacity } : {})}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          pointerEvents={isPathInteractionDisabled ? 'none' : 'auto'}
          transform={transformAttr}
          style={{
            cursor:
              pathCursorMode === 'select'
                ? isLocked
                  ? 'default'
                  : isSelected
                    ? 'move'
                    : 'pointer'
                : 'default',
          }}
          {...rectPointerProps}
        />
        <line
          x1={data.x}
          y1={data.y}
          x2={data.x + data.width}
          y2={data.y + data.height}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          pointerEvents="none"
          transform={transformAttr}
        />
        <line
          x1={data.x + data.width}
          y1={data.y}
          x2={data.x}
          y2={data.y + data.height}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          pointerEvents="none"
          transform={transformAttr}
        />
      </g>
    );
  }

  return (
    baseImage
  );
};

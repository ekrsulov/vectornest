import React, { memo } from 'react';
import { commandsToString } from '../../utils/pathParserUtils';
import type { PathElement } from '../../types';
import type {
  CanvasElementRenderer,
  CanvasRenderContext,
} from './CanvasRendererRegistry';
import { isTouchDevice } from '../../utils/domHelpers';
import { getMaskRuntimeId } from '../../utils/maskUtils';

// Cache touch detection at module level — value never changes during a session
const IS_TOUCH_DEVICE = isTouchDevice();
import { collectExtensionAttributes, collectExtensionChildren } from './rendererExtensionRegistry';
import { normalizeMarkerId, toMarkerUrl } from '../../utils/markerUtils';
import { areViewportsEqual } from './renderingUtils';

const getEffectiveStrokeColor = (path: PathElement['data']): string => {
  // Treat all paths uniformly - use transparent color if no stroke
  if (path.strokeColor === 'none') {
    return '#00000001';
  }

  return path.strokeColor;
};

const getEffectiveFillColor = (path: PathElement['data']): string => {
  if (path.fillColor === 'none') {
    return '#ffffff01';
  }

  return path.fillColor;
};

interface PathElementRendererProps {
  element: PathElement;
  context: CanvasRenderContext;
}

const arePathRendererPropsEqual = (
  previous: PathElementRendererProps,
  next: PathElementRendererProps
): boolean => {
  if (previous.element !== next.element) {
    return false;
  }

  const previousContext = previous.context;
  const nextContext = next.context;

  if (!areViewportsEqual(previousContext.viewport, nextContext.viewport)) {
    return false;
  }

  if (
    previousContext.activePlugin !== nextContext.activePlugin ||
    previousContext.colorMode !== nextContext.colorMode ||
    previousContext.scaleStrokeWithZoom !== nextContext.scaleStrokeWithZoom ||
    previousContext.isPathInteractionDisabled !== nextContext.isPathInteractionDisabled ||
    previousContext.pathCursorMode !== nextContext.pathCursorMode ||
    previousContext.rendererOverrides?.path !== nextContext.rendererOverrides?.path ||
    previousContext.extensionsContext !== nextContext.extensionsContext
  ) {
    return false;
  }

  if (
    previousContext.eventHandlers.onPointerDown !== nextContext.eventHandlers.onPointerDown ||
    previousContext.eventHandlers.onPointerUp !== nextContext.eventHandlers.onPointerUp ||
    previousContext.eventHandlers.onDoubleClick !== nextContext.eventHandlers.onDoubleClick ||
    previousContext.eventHandlers.onTouchEnd !== nextContext.eventHandlers.onTouchEnd
  ) {
    return false;
  }

  const elementId = previous.element.id;
  const wasSelected = previousContext.isElementSelected?.(elementId) ?? false;
  const isSelected = nextContext.isElementSelected?.(elementId) ?? false;
  if (wasSelected !== isSelected) {
    return false;
  }

  const wasLocked = previousContext.isElementLocked?.(elementId) ?? false;
  const isLocked = nextContext.isElementLocked?.(elementId) ?? false;
  return wasLocked === isLocked;
};

const PathElementRendererView = ({
  element,
  context
}: PathElementRendererProps) => {
  const { viewport, scaleStrokeWithZoom, rendererOverrides, eventHandlers, isElementSelected, isElementLocked, isPathInteractionDisabled, pathCursorMode, extensionsContext } = context;
  const pathData = element.data;
  const pathOverrides = rendererOverrides?.path;
  
  // Get versioned mask ID for cache invalidation when mask position changes
  const maskVersions = extensionsContext?.maskVersions as Map<string, number> | undefined;
  const maskRuntimeId = getMaskRuntimeId(pathData.maskId, maskVersions);
  const markerStartId = normalizeMarkerId(pathData.markerStart);
  const markerMidId = normalizeMarkerId(pathData.markerMid);
  const markerEndId = normalizeMarkerId(pathData.markerEnd);
  const markerKey = `${element.id}-${markerStartId ?? ''}-${markerMidId ?? ''}-${markerEndId ?? ''}`;

  const effectiveStrokeColor = pathOverrides?.strokeColor ?? getEffectiveStrokeColor(pathData);
  const effectiveFillColor = pathOverrides?.fillColor ?? getEffectiveFillColor(pathData);

  // Calculate stroke width based on scaleStrokeWithZoom setting
  const strokeWidth = pathOverrides?.strokeWidth ?? pathData.strokeWidth;
  const strokeScalingEnabled = pathOverrides?.scaleStrokeWithZoom ?? scaleStrokeWithZoom;
  const effectiveStrokeWidth = strokeScalingEnabled
    ? strokeWidth
    : strokeWidth / viewport.zoom;

  const pathD = commandsToString(pathData.subPaths.flat());
  const pointerDownHandler = eventHandlers.onPointerDown;
  const pointerUpHandler = eventHandlers.onPointerUp;
  const doubleClickHandler = eventHandlers.onDoubleClick;
  const isSelected = isElementSelected?.(element.id) ?? false;
  const isLocked = isElementLocked?.(element.id) ?? false;
  const isDefElement = Boolean(pathData.isDefinition || pathData.isTextPathRef);
  const display = isDefElement ? 'none' : pathData.display;
  const visibility = isDefElement ? 'hidden' : pathData.visibility;
  const pointerEventsValue = isDefElement || isPathInteractionDisabled ? 'none' : 'auto';

  const extensionAttributes = collectExtensionAttributes(element, context);
  const extensionChildren = collectExtensionChildren(element, context);

  const isTouch = IS_TOUCH_DEVICE;

  const blendStyle: React.CSSProperties = {};
  if (pathData.mixBlendMode) blendStyle.mixBlendMode = pathData.mixBlendMode as React.CSSProperties['mixBlendMode'];
  if (pathData.isolation) blendStyle.isolation = pathData.isolation;

  // Build transform attribute from transformMatrix if present
  const transformAttr = pathData.transformMatrix
    ? `matrix(${pathData.transformMatrix.join(',')})`
    : undefined;

  return (
    <g key={element.id}>
      <path
        id={element.id}
        data-element-id={element.id}
        d={pathD}
        transform={transformAttr}
        filter={pathOverrides?.disableFilter ? undefined : (pathData.filterId ? `url(#${pathData.filterId})` : undefined)}
        stroke={effectiveStrokeColor}
        strokeWidth={effectiveStrokeWidth}
        fill={effectiveFillColor}
        fillOpacity={pathOverrides?.fillOpacity ?? pathData.fillOpacity}
        strokeOpacity={pathOverrides?.strokeOpacity ?? pathData.strokeOpacity}
        strokeLinecap={pathOverrides?.strokeLinecap ?? pathData.strokeLinecap ?? 'butt'}
        strokeLinejoin={pathOverrides?.strokeLinejoin ?? pathData.strokeLinejoin ?? 'miter'}
        fillRule={pathOverrides?.fillRule ?? pathData.fillRule ?? 'nonzero'}
        strokeDasharray={
          pathOverrides?.strokeDasharray === 'none'
            ? undefined
            : pathOverrides?.strokeDasharray
            ?? (pathData.strokeDasharray && pathData.strokeDasharray !== 'none'
              ? pathData.strokeDasharray
              : undefined)
        }
        strokeDashoffset={pathData.strokeDashoffset}
        strokeMiterlimit={pathData.strokeMiterlimit}
        opacity={isDefElement ? 0 : pathData.opacity}
        visibility={visibility}
        display={display}
        vectorEffect={pathData.vectorEffect}
        shapeRendering={pathData.shapeRendering}
        {...(markerStartId ? { markerStart: toMarkerUrl(markerStartId) } : {})}
        {...(markerMidId ? { markerMid: toMarkerUrl(markerMidId) } : {})}
        {...(markerEndId ? { markerEnd: toMarkerUrl(markerEndId) } : {})}
        {...(pathData.clipPathId ? { clipPath: `url(#${pathData.clipPathId})` } : {})}
        {...(maskRuntimeId ? { mask: `url(#${maskRuntimeId})` } : {})}
        {...extensionAttributes}
        // On touch devices: don't add individual touch handlers, use canvas-level delegation
        // On desktop: use pointer and mouse events
        {...(!isTouch && pointerDownHandler && {
          onPointerDown: (event) => pointerDownHandler(element.id, event)
        })}
        {...(!isTouch && pointerUpHandler && {
          onPointerUp: (event) => pointerUpHandler(element.id, event)
        })}
        {...(!isTouch && doubleClickHandler && {
          onDoubleClick: (event) => doubleClickHandler(element.id, event)
        })}
        style={{
          cursor:
            pathCursorMode === 'select'
              ? isLocked
                ? 'default'
                : isSelected
                  ? 'move'
                  : 'pointer'
              : 'default',
          pointerEvents: pointerEventsValue,
          ...blendStyle,
        }}
        key={markerKey}
      >
        {extensionChildren}
      </path>
    </g >
  );
};

const MemoizedPathElementRendererView = memo(PathElementRendererView, arePathRendererPropsEqual);

export const PathElementRenderer: CanvasElementRenderer<PathElement> = (
  element,
  context
) => (
  <MemoizedPathElementRendererView element={element} context={context} />
);

import React, { useMemo, type RefObject } from 'react';
import type { Point, Viewport, CanvasElement } from '../../types';
import type { CanvasLayerContext } from '../../types/plugins';
import type { CanvasDecorator } from '../../types/interaction';
import type { CanvasSize } from '../hooks/useDynamicCanvasSize';
import { isTouchDevice } from '../../utils/domHelpers';
import { zIndices } from '../../theme/spacing';
import { PluginHooksRenderer } from '../PluginHooks';
import { CanvasStage } from './CanvasStage';
import { AnimationPreviewOverlay } from '../../overlays/AnimationPreviewOverlay';
import { CanvasOverlays } from './CanvasOverlays';

/** Cached once at module load to avoid repeated DOM queries per render */
const IS_TOUCH = isTouchDevice();

/** Static style — hoisted to module scope to preserve referential identity */
const OUTER_WRAPPER_STYLE: React.CSSProperties = { position: 'relative', width: '100%', height: '100%' };

const DevRenderCountBadgeWrapper = import.meta.env.DEV
  ? React.lazy(async () => {
      const module = await import('../../ui/RenderCountBadgeWrapper');
      return { default: module.RenderCountBadgeWrapper };
    })
  : null;

interface CanvasRendererProps {
  svgRef: RefObject<SVGSVGElement | null>;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
  visibleDecorators: CanvasDecorator[];
  hasDecorators: boolean;
  decoratorOffset: { top: number; left: number; width: number; height: number };
  viewportInsets: { left: number; right: number };
  canvasSize: CanvasSize;
  viewport: Viewport;
  isSpacePressed: boolean;
  currentMode: string;
  isPanMode: boolean;
  sortedElements: CanvasElement[];
  renderElement: (element: CanvasElement) => React.ReactNode;
  canvasLayerContext: CanvasLayerContext;
  getViewBoxString: (size: CanvasSize) => string;
  handlePointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  handleCanvasDoubleClick: (event: React.MouseEvent) => void;
  handleCanvasTouchEnd: (event: React.TouchEvent<SVGSVGElement>) => void;
}

/**
 * Presentational renderer for the canvas shell, stage and overlays.
 */
export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  svgRef,
  screenToCanvas,
  emitPointerEvent,
  visibleDecorators,
  hasDecorators,
  decoratorOffset,
  viewportInsets,
  canvasSize,
  viewport,
  isSpacePressed,
  currentMode,
  isPanMode,
  sortedElements,
  renderElement,
  canvasLayerContext,
  getViewBoxString,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleCanvasDoubleClick,
  handleCanvasTouchEnd,
}) => {
  const decoratorContext = useMemo(
    () => ({
      canvasSize,
      viewport,
      isVisible: true,
    }),
    [canvasSize, viewport]
  );

  const containerStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: hasDecorators ? decoratorOffset.top : 0,
      left: hasDecorators ? decoratorOffset.left : 0,
      width: hasDecorators ? `calc(100% - ${decoratorOffset.width}px)` : '100%',
      height: hasDecorators ? `calc(100% - ${decoratorOffset.height}px)` : '100%',
    }),
    [hasDecorators, decoratorOffset]
  );

  const insetStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: viewportInsets.left,
      right: viewportInsets.right,
    }),
    [viewportInsets.left, viewportInsets.right]
  );

  return (
    <div style={OUTER_WRAPPER_STYLE}>
      <div style={insetStyle}>
        {visibleDecorators.map((decorator) => (
          <React.Fragment key={decorator.id}>
            {decorator.render(decoratorContext)}
          </React.Fragment>
        ))}

        <div style={containerStyle}>
          <PluginHooksRenderer
            svgRef={svgRef}
            screenToCanvas={screenToCanvas}
            emitPointerEvent={emitPointerEvent}
          />
          {DevRenderCountBadgeWrapper && (
            <React.Suspense fallback={null}>
              <DevRenderCountBadgeWrapper
                componentName="Canvas"
                position="top-left"
                wrapperStyle={{ position: 'fixed', top: 0, left: 0, zIndex: zIndices.debugBadge }}
              />
            </React.Suspense>
          )}
          <CanvasStage
            svgRef={svgRef}
            canvasSize={canvasSize}
            getViewBoxString={getViewBoxString}
            isSpacePressed={isSpacePressed}
            currentMode={currentMode}
            isPanMode={isPanMode}
            sortedElements={sortedElements}
            renderElement={renderElement}
            canvasLayerContext={canvasLayerContext}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            {...(!IS_TOUCH && { handleCanvasDoubleClick })}
            {...(IS_TOUCH && { handleCanvasTouchEnd })}
          />
          <AnimationPreviewOverlay
            viewport={viewport}
            canvasSize={canvasSize}
          />
          <CanvasOverlays
            viewport={viewport}
            canvasSize={canvasSize}
          />
        </div>
      </div>
    </div>
  );
};

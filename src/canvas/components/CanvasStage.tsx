import React, { useMemo, type RefObject } from 'react';
import { CanvasLayers } from './CanvasLayers';
import { SnapOverlay } from '../../snap/SnapOverlay';
import { useSnapStore } from '../../snap/store';
import { pluginManager } from '../../utils/pluginManager';
import type { CanvasSize } from '../hooks/useDynamicCanvasSize';
import type { CanvasElement } from '../../types';
import type { CanvasLayerContext } from '../../types/plugins';
import { DEFAULT_MODE } from '../../constants';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { useCanvasStore, canvasStoreApi } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';

export interface CanvasStageProps {
  svgRef: RefObject<SVGSVGElement | null>;
  canvasSize: CanvasSize;
  getViewBoxString: (size: CanvasSize) => string;
  isSpacePressed: boolean;
  currentMode: string | null;
  isPanMode: boolean;
  sortedElements: CanvasElement[];
  renderElement: (element: CanvasElement) => React.ReactNode;
  canvasLayerContext: CanvasLayerContext;
  handlePointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  handleCanvasDoubleClick?: (event: React.MouseEvent<SVGSVGElement>) => void;
  handleCanvasTouchEnd?: (event: React.TouchEvent<SVGSVGElement>) => void;
}

/**
 * Presentational component that renders the SVG canvas and its layers.
 * This component is purely presentational and doesn't manage any state.
 */
export const CanvasStage: React.FC<CanvasStageProps> = ({
  svgRef,
  canvasSize,
  getViewBoxString,
  isSpacePressed,
  currentMode,
  isPanMode,
  sortedElements,
  renderElement,
  canvasLayerContext,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleCanvasDoubleClick,
  handleCanvasTouchEnd,
}) => {
  // Hide cursor when snap crosshair is showing
  const isShowingSnapCrosshair = useSnapStore((state) => state.isShowingSnapCrosshair);

  // Subscribe reactively so this component re-renders when elements or style
  // change.  The returned value is intentionally unused — the actual state is
  // read imperatively via canvasStoreApi.getState() in renderDefs below,
  // because DefContributions need the full store snapshot.
  useCanvasStore(useShallow((state) => ({
    elements: state.elements,
    style: state.style,
  })));

  // Determine cursor style (memoized to avoid recalculation on every render)
  const cursorStyle = useMemo(() => {
    if (isShowingSnapCrosshair) {
      return 'none';
    }
    if (isSpacePressed || isPanMode) {
      return 'grabbing';
    }
    return pluginManager.getCursor(currentMode || DEFAULT_MODE);
  }, [isShowingSnapCrosshair, isSpacePressed, isPanMode, currentMode]);

  const svgStyle = useMemo<React.CSSProperties>(
    () => ({ width: '100%', height: '100%', border: 'none', cursor: cursorStyle }),
    [cursorStyle]
  );

  // Memoize root-element filtering to avoid creating a new array every render
  const rootElements = useMemo(
    () => sortedElements.filter((element) => !element.parentId),
    [sortedElements]
  );

  return (
    <svg
      ref={svgRef}
      data-canvas="true"
      role="application"
      aria-label="Vector graphics canvas"
      width={canvasSize.width}
      height={canvasSize.height}
      viewBox={getViewBoxString(canvasSize)}
      style={svgStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      {...(handleCanvasDoubleClick && { onDoubleClick: handleCanvasDoubleClick })}
      {...(handleCanvasTouchEnd && { onTouchEnd: handleCanvasTouchEnd })}
    >
      <defs>
        {defsContributionRegistry.renderDefs(canvasStoreApi.getState(), sortedElements)}
      </defs>
      <CanvasLayers context={canvasLayerContext} placements={['background']} />
      {/* Only render root elements — children are rendered by group renderers */}
      {rootElements.map((element) => (
          <React.Fragment key={element.id}>
            {renderElement(element)}
          </React.Fragment>
        ))}
      <CanvasLayers context={canvasLayerContext} placements={['midground', 'foreground']} />
      <SnapOverlay />
    </svg>
  );
};

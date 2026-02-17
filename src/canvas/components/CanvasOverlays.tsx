/**
 * Canvas Overlays Component
 *
 * Renders overlay components contributed by plugins in the canvas area.
 * These overlays are rendered outside the main SVG and receive viewport and canvas size context.
 */

import React, { useMemo } from 'react';
import { pluginManager } from '../../utils/pluginManager';
import { useCanvasStore } from '../../store/canvasStore';

interface CanvasOverlaysProps {
  viewport: { zoom: number; panX: number; panY: number };
  canvasSize: { width: number; height: number };
}

export const CanvasOverlays: React.FC<CanvasOverlaysProps> = React.memo(({ viewport, canvasSize }) => {
  const overlays = pluginManager.getCanvasOverlays();
  const activePlugin = useCanvasStore(state => state.activePlugin);

  // Build context for overlay conditions — memoized to avoid re-creating on each render
  const context = useMemo(() => ({
    viewport,
    canvasSize,
    activePlugin,
  }), [viewport, canvasSize, activePlugin]);

  return (
    <>
      {overlays.map((overlay) => {
        const OverlayComponent = overlay.component;
        // Check condition if provided
        if (overlay.condition) {
          try {
            if (!overlay.condition(context)) return null;
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn(`[CanvasOverlays] Condition check failed for overlay ${overlay.id}:`, error);
            }
            return null;
          }
        }
        return (
          <OverlayComponent
            key={overlay.id}
            viewport={viewport}
            canvasSize={canvasSize}
          />
        );
      })}
    </>
  );
});
CanvasOverlays.displayName = 'CanvasOverlays';

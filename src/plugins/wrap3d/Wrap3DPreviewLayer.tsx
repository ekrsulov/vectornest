import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Wrap3DOverlay } from './Wrap3DOverlay';
import type { Wrap3DSlice } from './slice';
import type { Viewport } from '../../types';

interface Wrap3DPreviewLayerProps {
  viewport: Viewport;
}

/**
 * Canvas layer component that shows the shape overlay during preview.
 * Reads state from the store to determine if preview is active.
 * Only renders when in wrap3d mode with an active preview.
 */
export const Wrap3DPreviewLayer: React.FC<Wrap3DPreviewLayerProps> = ({ viewport }) => {
  // Get current active plugin to check if we're in wrap3d mode
  const activePlugin = useCanvasStore(state => state.activePlugin);
  
  // Get wrap3d state
  const isActive = useCanvasStore(state => (state as unknown as Wrap3DSlice).isActive ?? false);
  const isLivePreview = useCanvasStore(state => (state as unknown as Wrap3DSlice).isLivePreview ?? false);
  const combinedBounds = useCanvasStore(state => (state as unknown as Wrap3DSlice).combinedBounds);
  const selectedShape = useCanvasStore(state => (state as unknown as Wrap3DSlice).selectedShape ?? 'sphere');
  const rotationX = useCanvasStore(state => (state as unknown as Wrap3DSlice).rotationX ?? 0);
  const rotationY = useCanvasStore(state => (state as unknown as Wrap3DSlice).rotationY ?? 0);
  const rotationZ = useCanvasStore(state => (state as unknown as Wrap3DSlice).rotationZ ?? 0);
  const shapeParams = useCanvasStore(state => (state as unknown as Wrap3DSlice).shapeParams);

  // Only render if:
  // 1. We're in wrap3d mode
  // 2. Tool is active
  // 3. Preview is live with combined bounds
  if (activePlugin !== 'wrap3d' || !isActive || !isLivePreview || !combinedBounds) {
    return null;
  }

  const radiusMultiplier = shapeParams?.radiusMultiplier ?? 1.0;

  return (
    <Wrap3DOverlay
      bounds={combinedBounds}
      viewport={viewport}
      shapeType={selectedShape}
      radiusMultiplier={radiusMultiplier}
      rotationX={rotationX}
      rotationY={rotationY}
      rotationZ={rotationZ}
    />
  );
};

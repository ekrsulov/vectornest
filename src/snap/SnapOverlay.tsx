import React from 'react';
import { StaticSnapPointsOverlay } from './overlay/StaticSnapPointsOverlay';
import { ActiveSnapOverlay } from './overlay/ActiveSnapOverlay';

/**
 * Combined snap overlay that handles both static points and active snap visualization.
 * This is the main component to be rendered in CanvasStage.
 */
export const SnapOverlay: React.FC = () => {
  return (
    <>
      <StaticSnapPointsOverlay />
      <ActiveSnapOverlay />
    </>
  );
};

export { StaticSnapPointsOverlay, ActiveSnapOverlay };

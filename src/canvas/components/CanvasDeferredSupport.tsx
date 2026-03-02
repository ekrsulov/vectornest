import React from 'react';
import type { RefObject } from 'react';
import { useCanvasShortcuts } from '../hooks/useCanvasShortcuts';
import { useMobileTouchGestures } from '../hooks/useMobileTouchGestures';
import { canvasShortcutRegistry } from '../shortcuts';

interface CanvasDeferredSupportProps {
  svgRef: RefObject<SVGSVGElement | null>;
  cancelSelection: () => void;
  enableTouchGestures: boolean;
}

const CanvasTouchGestureSupport: React.FC<{
  svgRef: RefObject<SVGSVGElement | null>;
  cancelSelection: () => void;
}> = ({ svgRef, cancelSelection }) => {
  useMobileTouchGestures(svgRef, cancelSelection);
  return null;
};

export const CanvasDeferredSupport: React.FC<CanvasDeferredSupportProps> = ({
  svgRef,
  cancelSelection,
  enableTouchGestures,
}) => {
  useCanvasShortcuts(canvasShortcutRegistry, svgRef);

  return enableTouchGestures ? (
    <CanvasTouchGestureSupport
      svgRef={svgRef}
      cancelSelection={cancelSelection}
    />
  ) : null;
};

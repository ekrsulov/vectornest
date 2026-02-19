import React from 'react';
import { Rulers as SharedRulers } from '../../ui/Rulers';
import { useCanvasStore } from '../../store/canvasStore';

interface RulersProps {
  width: number;
  height: number;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
}

/**
 * Rulers component for the guidelines plugin.
 * Wraps the shared Rulers component with guidelines-specific functionality.
 */
export const Rulers: React.FC<RulersProps> = ({ width, height, viewport }) => {
  const guidelines = useCanvasStore(state => state.guidelines);
  const startDraggingGuide = useCanvasStore(state => state.startDraggingGuide);
  const updateDraggingGuide = useCanvasStore(state => state.updateDraggingGuide);
  const finishDraggingGuide = useCanvasStore(state => state.finishDraggingGuide);

  if (!guidelines?.enabled) {
    return null;
  }

  const handleHorizontalDragStart = (canvasY: number) => {
    startDraggingGuide?.('horizontal', canvasY);
  };

  const handleVerticalDragStart = (canvasX: number) => {
    startDraggingGuide?.('vertical', canvasX);
  };

  const handleDragUpdate = (position: number) => {
    updateDraggingGuide?.(position);
  };

  const handleDragEnd = () => {
    finishDraggingGuide?.();
  };

  return (
    <SharedRulers
      width={width}
      height={height}
      viewport={viewport}
      interactive={guidelines?.manualGuidesEnabled ?? false}
      onHorizontalDragStart={handleHorizontalDragStart}
      onVerticalDragStart={handleVerticalDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    />
  );
};


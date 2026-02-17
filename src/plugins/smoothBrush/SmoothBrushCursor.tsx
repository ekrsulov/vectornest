import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useCanvasEventBus } from '../../canvas/CanvasEventBusContext';
import type { Point } from '../../types';

export const SmoothBrushCursor: React.FC = () => {
  const isSmoothBrushActive = useCanvasStore(state => state.smoothBrush?.isActive ?? false);
  const radius = useCanvasStore(state => state.smoothBrush?.radius ?? 50);
  const eventBus = useCanvasEventBus();
  const [cursor, setCursor] = useState<Point | null>(null);

  useEffect(() => {
    if (!isSmoothBrushActive) return;

    const handleMove = (data: { point: Point }) => {
      setCursor(data.point);
    };

    const unsubscribeMove = eventBus.subscribe('pointermove', handleMove);
    
    // Also listen to drag events if needed, but pointermove should cover it
    
    return () => {
      unsubscribeMove();
    };
  }, [isSmoothBrushActive, eventBus]);

  if (!isSmoothBrushActive || !cursor) {
    return null;
  }

  return (
    <ellipse
      cx={cursor.x}
      cy={cursor.y}
      rx={radius}
      ry={radius}
      fill="none"
      stroke="#38bdf8"
      strokeWidth="1.2"
      style={{ pointerEvents: 'none' }}
    />
  );
};

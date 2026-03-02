import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ElementHeatmapPluginSlice } from './slice';
import { computeHeatmap } from './heatmapUtils';
import type { CanvasElement } from '../../types';
import { buildElementMap } from '../../utils/elementMapUtils';

type HMStore = CanvasStore & ElementHeatmapPluginSlice;

function intensityToColor(t: number): string {
  // Blue → Cyan → Green → Yellow → Red
  if (t < 0.25) {
    const r = 0, g = Math.round(t * 4 * 255), b = 255;
    return `rgb(${r},${g},${b})`;
  } else if (t < 0.5) {
    const r = 0, g = 255, b = Math.round((1 - (t - 0.25) * 4) * 255);
    return `rgb(${r},${g},${b})`;
  } else if (t < 0.75) {
    const r = Math.round((t - 0.5) * 4 * 255), g = 255, b = 0;
    return `rgb(${r},${g},${b})`;
  } else {
    const r = 255, g = Math.round((1 - (t - 0.75) * 4) * 255), b = 0;
    return `rgb(${r},${g},${b})`;
  }
}

export const ElementHeatmapOverlay: React.FC = () => {
  const { enabled, gridSize, opacity, elements, viewport } = useCanvasStore(
    useShallow((s) => {
      const st = s as HMStore;
      return {
        enabled: st.elementHeatmap?.enabled ?? false,
        gridSize: st.elementHeatmap?.gridSize ?? 50,
        opacity: st.elementHeatmap?.opacity ?? 40,
        elements: s.elements,
        viewport: s.viewport,
      };
    })
  );

  const cells = useMemo(() => {
    if (!enabled) return [];
    return computeHeatmap(elements as CanvasElement[], viewport, gridSize, buildElementMap(elements));
  }, [enabled, elements, gridSize, viewport]);

  if (!enabled || cells.length === 0) return null;

  return (
    <g className="element-heatmap-overlay">
      {cells.map((cell, i) => (
        <rect
          key={i}
          x={cell.x}
          y={cell.y}
          width={gridSize}
          height={gridSize}
          fill={intensityToColor(cell.intensity)}
          fillOpacity={cell.intensity * (opacity / 100)}
          rx={2}
        />
      ))}
    </g>
  );
};

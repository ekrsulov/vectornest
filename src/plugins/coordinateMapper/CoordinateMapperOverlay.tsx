import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { CoordinateMapperPluginSlice } from './slice';
import { extractCoordinates } from './coordUtils';
import type { CanvasElement } from '../../types';

type CMStore = CanvasStore & CoordinateMapperPluginSlice;

const TYPE_COLORS = {
  anchor: '#3182CE',
  control: '#D69E2E',
  center: '#38A169',
} as const;

export const CoordinateMapperOverlay: React.FC = () => {
  const { enabled, showAnchors, showControls, showCenters, precision, selectedOnly, selectedIds, elements, zoom } =
    useCanvasStore(
      useShallow((s) => {
        const st = s as CMStore;
        return {
          enabled: st.coordinateMapper?.enabled ?? false,
          showAnchors: st.coordinateMapper?.showAnchors ?? true,
          showControls: st.coordinateMapper?.showControls ?? false,
          showCenters: st.coordinateMapper?.showCenters ?? false,
          precision: st.coordinateMapper?.precision ?? 1,
          selectedOnly: st.coordinateMapper?.selectedOnly ?? true,
          selectedIds: s.selectedIds,
          elements: s.elements,
          zoom: s.viewport.zoom,
        };
      })
    );

  const labels = useMemo(() => {
    if (!enabled) return [];
    const target = selectedOnly
      ? elements.filter((el: CanvasElement) => selectedIds.includes(el.id))
      : elements;
    return extractCoordinates(target as CanvasElement[], showAnchors, showControls, showCenters, precision);
  }, [enabled, selectedOnly, selectedIds, elements, showAnchors, showControls, showCenters, precision]);

  if (!enabled || labels.length === 0) return null;

  const invZ = 1 / zoom;
  const fontSize = 9 * invZ;
  const dotR = 3 * invZ;

  return (
    <g className="coordinate-mapper-overlay">
      {labels.map((pt, i) => {
        const col = TYPE_COLORS[pt.type];
        return (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={dotR} fill={col} fillOpacity={0.9} />
            <rect
              x={pt.x + 5 * invZ}
              y={pt.y - 6 * invZ}
              width={pt.label.length * 5.5 * invZ}
              height={12 * invZ}
              fill="black"
              fillOpacity={0.75}
              rx={2 * invZ}
            />
            <text
              x={pt.x + 7 * invZ}
              y={pt.y + 3 * invZ}
              fill={col}
              fontSize={fontSize}
              fontFamily="monospace"
            >
              {pt.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

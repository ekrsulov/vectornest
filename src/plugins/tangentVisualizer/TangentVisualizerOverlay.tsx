import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { TangentVisualizerPluginSlice } from './slice';
import { computeTangents } from './tangentUtils';
import type { CanvasElement } from '../../types';

type TVStore = CanvasStore & TangentVisualizerPluginSlice;

export const TangentVisualizerOverlay: React.FC = () => {
  const { enabled, showTangents, showNormals, lineLength, selectedOnly, selectedIds, elements, zoom } =
    useCanvasStore(
      useShallow((s) => {
        const st = s as TVStore;
        return {
          enabled: st.tangentVisualizer?.enabled ?? false,
          showTangents: st.tangentVisualizer?.showTangents ?? true,
          showNormals: st.tangentVisualizer?.showNormals ?? false,
          lineLength: st.tangentVisualizer?.lineLength ?? 30,
          selectedOnly: st.tangentVisualizer?.selectedOnly ?? true,
          selectedIds: s.selectedIds,
          elements: s.elements,
          zoom: s.viewport.zoom,
        };
      })
    );

  const tangents = useMemo(() => {
    if (!enabled) return [];
    const target = selectedOnly
      ? elements.filter((el: CanvasElement) => selectedIds.includes(el.id))
      : elements;
    return computeTangents(target as CanvasElement[]);
  }, [enabled, selectedOnly, selectedIds, elements]);

  if (!enabled || tangents.length === 0) return null;

  const invZ = 1 / zoom;
  const sw = 1.2 * invZ;
  const dotR = 2 * invZ;
  const len = lineLength * invZ;

  return (
    <g className="tangent-visualizer-overlay">
      {tangents.map((t, i) => {
        const cosA = Math.cos(t.angle);
        const sinA = Math.sin(t.angle);

        return (
          <g key={i}>
            <circle cx={t.x} cy={t.y} r={dotR} fill="#805AD5" fillOpacity={0.8} />

            {showTangents && (
              <line
                x1={t.x - cosA * len * 0.5}
                y1={t.y - sinA * len * 0.5}
                x2={t.x + cosA * len * 0.5}
                y2={t.y + sinA * len * 0.5}
                stroke="#805AD5"
                strokeWidth={sw}
                strokeOpacity={0.7}
              />
            )}

            {showNormals && (
              <line
                x1={t.x - (-sinA) * len * 0.4}
                y1={t.y - cosA * len * 0.4}
                x2={t.x + (-sinA) * len * 0.4}
                y2={t.y + cosA * len * 0.4}
                stroke="#D69E2E"
                strokeWidth={sw}
                strokeOpacity={0.5}
                strokeDasharray={`${3 * invZ} ${2 * invZ}`}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

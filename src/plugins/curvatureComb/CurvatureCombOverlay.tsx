import React from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { analyzeCurvature } from './curvatureUtils';
import type { CurvatureCombPluginSlice } from './slice';
import type { CanvasElement } from '../../types';

type CombStore = CanvasStore & CurvatureCombPluginSlice;

export const CurvatureCombOverlay: React.FC = () => {
  const { enabled, combScale, density, showInflections, showExtrema, combColor,
    selectedIds, elements, zoom } = useCanvasStore(
    useShallow((s) => {
      const st = s as CombStore;
      return {
        enabled: st.curvatureComb?.enabled ?? false,
        combScale: st.curvatureComb?.combScale ?? 30,
        density: st.curvatureComb?.density ?? 12,
        showInflections: st.curvatureComb?.showInflections ?? true,
        showExtrema: st.curvatureComb?.showExtrema ?? true,
        combColor: st.curvatureComb?.combColor ?? '#E53E3E',
        selectedIds: s.selectedIds,
        elements: s.elements,
        zoom: s.viewport.zoom,
      };
    })
  );

  if (!enabled || selectedIds.length === 0) return null;

  const selectedElements = elements.filter(
    (el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path'
  );

  if (selectedElements.length === 0) return null;

  const invZoom = 1 / zoom;

  return (
    <g className="curvature-comb-overlay">
      {selectedElements.map((el: CanvasElement) => {
        if (el.type !== 'path') return null;
        const analysis = analyzeCurvature(el.data.subPaths, density);

        return (
          <g key={el.id}>
            {/* Comb teeth */}
            {analysis.segments.map((seg, si) =>
              seg.samples.map((sample, pi) => {
                const height = sample.curvature * combScale * 1000;
                const clampedH = Math.max(-200, Math.min(200, height));
                if (Math.abs(clampedH) < 0.5) return null;
                return (
                  <line
                    key={`${si}-${pi}`}
                    x1={sample.point.x}
                    y1={sample.point.y}
                    x2={sample.point.x + sample.normal.x * clampedH}
                    y2={sample.point.y + sample.normal.y * clampedH}
                    stroke={combColor}
                    strokeWidth={0.8 * invZoom}
                    opacity={0.7}
                  />
                );
              })
            )}

            {/* Comb envelope (connect tooth tips) */}
            {analysis.segments.map((seg, si) => {
              const pts = seg.samples
                .map((s) => {
                  const h = Math.max(-200, Math.min(200, s.curvature * combScale * 1000));
                  return `${s.point.x + s.normal.x * h},${s.point.y + s.normal.y * h}`;
                })
                .join(' ');
              return (
                <polyline
                  key={`env-${si}`}
                  points={pts}
                  fill="none"
                  stroke={combColor}
                  strokeWidth={1.2 * invZoom}
                  opacity={0.9}
                />
              );
            })}

            {/* Inflection points */}
            {showInflections &&
              analysis.inflections.map((pt, i) => (
                <circle
                  key={`inf-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={4 * invZoom}
                  fill="#3182CE"
                  stroke="white"
                  strokeWidth={1 * invZoom}
                />
              ))}

            {/* Curvature extrema */}
            {showExtrema &&
              analysis.extrema.map((pt, i) => (
                <rect
                  key={`ext-${i}`}
                  x={pt.x - 3 * invZoom}
                  y={pt.y - 3 * invZoom}
                  width={6 * invZoom}
                  height={6 * invZoom}
                  fill="#DD6B20"
                  stroke="white"
                  strokeWidth={1 * invZoom}
                  transform={`rotate(45 ${pt.x} ${pt.y})`}
                />
              ))}
          </g>
        );
      })}
    </g>
  );
};

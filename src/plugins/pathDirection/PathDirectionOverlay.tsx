import React from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { computeDirectionArrows, getEndpoints } from './directionUtils';
import type { PathDirectionPluginSlice } from './slice';
import type { CanvasElement, SubPath } from '../../types';

type DirStore = CanvasStore & PathDirectionPluginSlice;

export const PathDirectionOverlay: React.FC = () => {
  const { enabled, showArrows, showEndpoints, arrowDensity, arrowSize, arrowColor,
    selectedIds, elements, zoom } = useCanvasStore(
    useShallow((s) => {
      const st = s as DirStore;
      return {
        enabled: st.pathDirection?.enabled ?? false,
        showArrows: st.pathDirection?.showArrows ?? true,
        showEndpoints: st.pathDirection?.showEndpoints ?? true,
        arrowDensity: st.pathDirection?.arrowDensity ?? 3,
        arrowSize: st.pathDirection?.arrowSize ?? 8,
        arrowColor: st.pathDirection?.arrowColor ?? '#38A169',
        selectedIds: s.selectedIds,
        elements: s.elements,
        zoom: s.viewport.zoom,
      };
    })
  );

  if (!enabled || selectedIds.length === 0) return null;

  const selectedPaths = elements.filter(
    (el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path'
  );

  if (selectedPaths.length === 0) return null;

  const invZoom = 1 / zoom;
  const size = arrowSize * invZoom;

  return (
    <g className="path-direction-overlay">
      {selectedPaths.map((el: CanvasElement) => {
        if (el.type !== 'path') return null;

        return el.data.subPaths.map((sp: SubPath, si: number) => {
          const arrows = showArrows ? computeDirectionArrows(sp, arrowDensity) : [];
          const endpoints = showEndpoints ? getEndpoints(sp) : { start: null, end: null };

          return (
            <g key={`${el.id}-${si}`}>
              {/* Direction arrows */}
              {arrows.map((arrow, ai) => {
                const deg = (arrow.angle * 180) / Math.PI;
                return (
                  <g
                    key={`arrow-${ai}`}
                    transform={`translate(${arrow.position.x},${arrow.position.y}) rotate(${deg})`}
                  >
                    <polygon
                      points={`${size},0 ${-size * 0.6},${-size * 0.5} ${-size * 0.6},${size * 0.5}`}
                      fill={arrowColor}
                      opacity={0.85}
                    />
                  </g>
                );
              })}

              {/* Start point (green circle) */}
              {endpoints.start && (
                <circle
                  cx={endpoints.start.x}
                  cy={endpoints.start.y}
                  r={5 * invZoom}
                  fill="#38A169"
                  stroke="white"
                  strokeWidth={1.5 * invZoom}
                />
              )}

              {/* End point (red square) */}
              {endpoints.end && (
                <rect
                  x={endpoints.end.x - 4 * invZoom}
                  y={endpoints.end.y - 4 * invZoom}
                  width={8 * invZoom}
                  height={8 * invZoom}
                  fill="#E53E3E"
                  stroke="white"
                  strokeWidth={1.5 * invZoom}
                />
              )}
            </g>
          );
        });
      })}
    </g>
  );
};

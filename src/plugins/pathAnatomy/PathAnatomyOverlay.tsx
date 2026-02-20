import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { getSegmentInfos } from './anatomyUtils';
import type { PathAnatomyPluginSlice } from './slice';
import type { CanvasElement, SubPath, Command, Point } from '../../types';

type AnatomyStore = CanvasStore & PathAnatomyPluginSlice;

export const PathAnatomyOverlay: React.FC = () => {
  const { enabled, highlightSegments, showNodeTypes, showLengths,
    lineColor, curveColor, moveColor,
    selectedIds, elements, zoom } = useCanvasStore(
    useShallow((s) => {
      const st = s as AnatomyStore;
      return {
        enabled: st.pathAnatomy?.enabled ?? false,
        highlightSegments: st.pathAnatomy?.highlightSegments ?? true,
        showNodeTypes: st.pathAnatomy?.showNodeTypes ?? true,
        showLengths: st.pathAnatomy?.showLengths ?? false,
        lineColor: st.pathAnatomy?.lineColor ?? '#3182CE',
        curveColor: st.pathAnatomy?.curveColor ?? '#D53F8C',
        moveColor: st.pathAnatomy?.moveColor ?? '#DD6B20',
        selectedIds: s.selectedIds,
        elements: s.elements,
        zoom: s.viewport.zoom,
      };
    })
  );

  const selectedPaths = useMemo(() => {
    if (!enabled || selectedIds.length === 0) return [];
    return elements.filter(
      (el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path'
    );
  }, [enabled, selectedIds, elements]);

  if (!enabled || selectedPaths.length === 0) return null;

  const invZoom = 1 / zoom;

  return (
    <g className="path-anatomy-overlay">
      {selectedPaths.map((el: CanvasElement) => {
        if (el.type !== 'path') return null;
        const segments = getSegmentInfos(el.data.subPaths);

        // Collect nodes for type markers
        const nodes: { pos: Point; type: 'smooth' | 'corner' | 'start' }[] = [];
        if (showNodeTypes) {
          el.data.subPaths.forEach((sp: SubPath) => {
            let isFirst = true;
            sp.forEach((cmd: Command) => {
              if (cmd.type === 'Z') return;
              if (isFirst && cmd.type === 'M') {
                nodes.push({ pos: cmd.position, type: 'start' });
                isFirst = false;
              } else if (cmd.type === 'C') {
                // A curve endpoint is "smooth" if it has control points
                nodes.push({ pos: cmd.position, type: 'smooth' });
              } else if (cmd.type === 'L' || cmd.type === 'M') {
                nodes.push({ pos: cmd.position, type: 'corner' });
              }
            });
          });
        }

        return (
          <g key={el.id}>
            {/* Segment type highlights */}
            {highlightSegments && segments.map((seg, i) => {
              const color = seg.type === 'C' ? curveColor : seg.type === 'L' ? lineColor : moveColor;
              return (
                <line
                  key={`seg-${i}`}
                  x1={seg.start.x}
                  y1={seg.start.y}
                  x2={seg.end.x}
                  y2={seg.end.y}
                  stroke={color}
                  strokeWidth={3 * invZoom}
                  opacity={0.6}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Segment length annotations */}
            {showLengths && segments.map((seg, i) => {
              if (seg.length < 2) return null;
              return (
                <text
                  key={`len-${i}`}
                  x={seg.midpoint.x}
                  y={seg.midpoint.y - 6 * invZoom}
                  fill="white"
                  fontSize={9 * invZoom}
                  textAnchor="middle"
                  style={{ paintOrder: 'stroke', stroke: '#000', strokeWidth: 2.5 * invZoom }}
                >
                  {seg.length.toFixed(1)}
                </text>
              );
            })}

            {/* Node type markers */}
            {showNodeTypes && nodes.map((node, i) => {
              if (node.type === 'start') {
                return (
                  <circle
                    key={`node-${i}`}
                    cx={node.pos.x}
                    cy={node.pos.y}
                    r={4 * invZoom}
                    fill={moveColor}
                    stroke="white"
                    strokeWidth={1.2 * invZoom}
                  />
                );
              }
              if (node.type === 'smooth') {
                return (
                  <circle
                    key={`node-${i}`}
                    cx={node.pos.x}
                    cy={node.pos.y}
                    r={3.5 * invZoom}
                    fill={curveColor}
                    stroke="white"
                    strokeWidth={1 * invZoom}
                  />
                );
              }
              // corner
              return (
                <rect
                  key={`node-${i}`}
                  x={node.pos.x - 3 * invZoom}
                  y={node.pos.y - 3 * invZoom}
                  width={6 * invZoom}
                  height={6 * invZoom}
                  fill={lineColor}
                  stroke="white"
                  strokeWidth={1 * invZoom}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

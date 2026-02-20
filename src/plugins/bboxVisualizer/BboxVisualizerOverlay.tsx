import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { BboxVisualizerPluginSlice } from './slice';
import { computeBBoxes, computeOverlaps, formatArea } from './bboxUtils';
import type { CanvasElement } from '../../types';

type BboxStore = CanvasStore & BboxVisualizerPluginSlice;

// Distinct colors for each bounding box
const BOX_COLORS = [
  '#3182CE', '#38A169', '#D69E2E', '#E53E3E', '#805AD5',
  '#DD6B20', '#319795', '#D53F8C', '#2B6CB0', '#2F855A',
];

export const BboxVisualizerOverlay: React.FC = () => {
  const {
    enabled, showDimensions, showArea, showOverlaps, showAllElements,
    selectedIds, elements, zoom,
  } = useCanvasStore(
    useShallow((s) => {
      const st = s as BboxStore;
      return {
        enabled: st.bboxVisualizer?.enabled ?? false,
        showDimensions: st.bboxVisualizer?.showDimensions ?? true,
        showArea: st.bboxVisualizer?.showArea ?? false,
        showOverlaps: st.bboxVisualizer?.showOverlaps ?? true,
        showAllElements: st.bboxVisualizer?.showAllElements ?? false,
        selectedIds: s.selectedIds,
        elements: s.elements,
        zoom: s.viewport.zoom,
      };
    })
  );

  const { bboxes, overlaps } = useMemo(() => {
    if (!enabled) return { bboxes: [], overlaps: [] };
    const targetEls = showAllElements
      ? elements
      : elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    const boxes = computeBBoxes(targetEls);
    const ov = showOverlaps ? computeOverlaps(boxes) : [];
    return { bboxes: boxes, overlaps: ov };
  }, [enabled, showAllElements, elements, selectedIds, showOverlaps]);

  if (!enabled || bboxes.length === 0) return null;

  const invZoom = 1 / zoom;
  const fontSize = 10 * invZoom;
  const strokeW = 1 * invZoom;
  const padding = 3 * invZoom;

  return (
    <g className="bbox-visualizer-overlay">
      {/* Overlap regions */}
      {overlaps.map((ov, i) => {
        const a = bboxes.find((b) => b.id === ov.idA);
        const b = bboxes.find((bb) => bb.id === ov.idB);
        if (!a || !b) return null;

        const ox = Math.max(a.x, b.x);
        const oy = Math.max(a.y, b.y);
        const ow = Math.min(a.x + a.width, b.x + b.width) - ox;
        const oh = Math.min(a.y + a.height, b.y + b.height) - oy;
        if (ow <= 0 || oh <= 0) return null;

        return (
          <rect
            key={`ov-${i}`}
            x={ox}
            y={oy}
            width={ow}
            height={oh}
            fill="#E53E3E"
            fillOpacity={0.15}
            stroke="#E53E3E"
            strokeWidth={strokeW * 0.5}
            strokeDasharray={`${2 * invZoom} ${2 * invZoom}`}
            strokeOpacity={0.5}
          />
        );
      })}

      {/* Bounding boxes */}
      {bboxes.map((bbox, i) => {
        const color = BOX_COLORS[i % BOX_COLORS.length];
        return (
          <g key={bbox.id}>
            <rect
              x={bbox.x}
              y={bbox.y}
              width={bbox.width}
              height={bbox.height}
              fill="none"
              stroke={color}
              strokeWidth={strokeW}
              strokeOpacity={0.6}
              strokeDasharray={`${4 * invZoom} ${2 * invZoom}`}
            />

            {/* Dimension labels */}
            {showDimensions && (
              <>
                {/* Width label on top */}
                <text
                  x={bbox.x + bbox.width / 2}
                  y={bbox.y - padding}
                  textAnchor="middle"
                  fill={color}
                  fontSize={fontSize}
                  fontFamily="monospace"
                  opacity={0.8}
                >
                  {bbox.width.toFixed(1)}
                </text>

                {/* Height label on right */}
                <text
                  x={bbox.x + bbox.width + padding}
                  y={bbox.y + bbox.height / 2}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fill={color}
                  fontSize={fontSize}
                  fontFamily="monospace"
                  opacity={0.8}
                >
                  {bbox.height.toFixed(1)}
                </text>
              </>
            )}

            {/* Area label in center */}
            {showArea && bbox.area > 0 && (
              <text
                x={bbox.x + bbox.width / 2}
                y={bbox.y + bbox.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize={fontSize * 0.9}
                fontFamily="monospace"
                opacity={0.6}
              >
                {formatArea(bbox.area)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

import React, { useMemo } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { BboxVisualizerPluginSlice } from './slice';
import { computeBBoxes, computeOverlaps, formatArea } from './bboxUtils';
import type { CanvasElement } from '../../types';
import { buildElementMap } from '../../utils/elementMapUtils';
import { SvgTagLabel } from '../../ui/SvgTagLabel';

type BboxStore = CanvasStore & BboxVisualizerPluginSlice;

const LIGHT_BOX_COLORS = ['#3F3F46', '#52525B', '#71717A', '#A1A1AA', '#D4D4D8'];
const DARK_BOX_COLORS = ['#FAFAF9', '#E7E5E4', '#D6D3D1', '#A8A29E', '#78716C'];

export const BboxVisualizerOverlay: React.FC = () => {
  const {
    enabled, showDimensions, showArea, showOverlaps, showAllElements,
    selectedIds, elements, zoom, viewport,
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
        viewport: s.viewport,
      };
    })
  );
  const { colorMode } = useColorMode();

  const { bboxes, overlaps } = useMemo(() => {
    if (!enabled) return { bboxes: [], overlaps: [] };
    const elementMap = buildElementMap(elements);
    const targetEls = showAllElements
      ? elements
      : elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    const boxes = computeBBoxes(targetEls, viewport, elementMap);
    const ov = showOverlaps ? computeOverlaps(boxes) : [];
    return { bboxes: boxes, overlaps: ov };
  }, [enabled, showAllElements, elements, selectedIds, showOverlaps, viewport]);

  if (!enabled || bboxes.length === 0) return null;

  const invZoom = 1 / zoom;
  const fontSize = 10;
  const scaledFontSize = fontSize * invZoom;
  const strokeW = 1 * invZoom;
  const padding = 3 * invZoom;
  const palette = colorMode === 'dark'
    ? {
        boxColors: DARK_BOX_COLORS,
        overlapStroke: '#F5F5F4',
        overlapFillOpacity: 0.12,
        labelText: '#F5F5F4',
        labelBackground: 'rgba(28, 25, 23, 0.92)',
        labelBorder: '#78716C',
      }
    : {
        boxColors: LIGHT_BOX_COLORS,
        overlapStroke: '#27272A',
        overlapFillOpacity: 0.08,
        labelText: '#18181B',
        labelBackground: 'rgba(250, 250, 250, 0.96)',
        labelBorder: '#D4D4D8',
      };

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
            fill={palette.overlapStroke}
            fillOpacity={palette.overlapFillOpacity}
            stroke={palette.overlapStroke}
            strokeWidth={strokeW * 0.5}
            strokeDasharray={`${2 * invZoom} ${2 * invZoom}`}
            strokeOpacity={0.5}
          />
        );
      })}

      {/* Bounding boxes */}
      {bboxes.map((bbox, i) => {
        const color = palette.boxColors[i % palette.boxColors.length];
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
                <SvgTagLabel
                  x={bbox.x + bbox.width / 2}
                  y={bbox.y - (scaledFontSize / 2 + padding)}
                  label={bbox.width.toFixed(1)}
                  fontSize={fontSize}
                  zoom={zoom}
                  textColor={palette.labelText}
                  backgroundColor={palette.labelBackground}
                  borderColor={palette.labelBorder}
                  opacity={0.8}
                />

                <SvgTagLabel
                  x={bbox.x + bbox.width + padding}
                  y={bbox.y + bbox.height / 2}
                  label={bbox.height.toFixed(1)}
                  fontSize={fontSize}
                  zoom={zoom}
                  textColor={palette.labelText}
                  backgroundColor={palette.labelBackground}
                  borderColor={palette.labelBorder}
                  anchor="start"
                  opacity={0.8}
                />
              </>
            )}

            {showArea && bbox.area > 0 && (
              <SvgTagLabel
                x={bbox.x + bbox.width / 2}
                y={bbox.y + bbox.height / 2}
                label={formatArea(bbox.area)}
                fontSize={fontSize * 0.9}
                zoom={zoom}
                textColor={palette.labelText}
                backgroundColor={palette.labelBackground}
                borderColor={palette.labelBorder}
                opacity={0.6}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

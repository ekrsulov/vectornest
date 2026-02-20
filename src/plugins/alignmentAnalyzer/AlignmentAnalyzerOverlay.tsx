import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { AlignmentAnalyzerPluginSlice } from './slice';
import { analyzeAlignments, type AlignmentLine } from './alignmentUtils';
import type { CanvasElement } from '../../types';

type AnalyzerStore = CanvasStore & AlignmentAnalyzerPluginSlice;

export const AlignmentAnalyzerOverlay: React.FC = () => {
  const {
    enabled, tolerance, showNearMisses, showPerfectAligns,
    selectedIds, elements, zoom,
  } = useCanvasStore(
    useShallow((s) => {
      const st = s as AnalyzerStore;
      return {
        enabled: st.alignmentAnalyzer?.enabled ?? false,
        tolerance: st.alignmentAnalyzer?.tolerance ?? 3,
        showNearMisses: st.alignmentAnalyzer?.showNearMisses ?? true,
        showPerfectAligns: st.alignmentAnalyzer?.showPerfectAligns ?? true,
        selectedIds: s.selectedIds,
        elements: s.elements,
        zoom: s.viewport.zoom,
      };
    })
  );

  const lines = useMemo(() => {
    if (!enabled || selectedIds.length < 2) return [];
    const selected = elements.filter(
      (el: CanvasElement) => selectedIds.includes(el.id)
    );
    const result = analyzeAlignments(selected, tolerance);
    return result.lines.filter((l: AlignmentLine) => {
      if (l.type === 'perfect' && !showPerfectAligns) return false;
      if (l.type === 'near-miss' && !showNearMisses) return false;
      return true;
    });
  }, [enabled, selectedIds, elements, tolerance, showNearMisses, showPerfectAligns]);

  if (!enabled || lines.length === 0) return null;

  const invZoom = 1 / zoom;
  const lineExtent = 5000;

  return (
    <g className="alignment-analyzer-overlay">
      {lines.map((line, i) => {
        const isPerfect = line.type === 'perfect';
        const color = isPerfect ? '#38A169' : '#E53E3E';
        const dash = isPerfect ? undefined : `${4 * invZoom} ${3 * invZoom}`;
        const opacity = isPerfect ? 0.4 : 0.7;

        if (line.axis === 'horizontal') {
          return (
            <g key={`h-${i}`}>
              <line
                x1={-lineExtent}
                y1={line.position}
                x2={lineExtent}
                y2={line.position}
                stroke={color}
                strokeWidth={1 * invZoom}
                opacity={opacity}
                strokeDasharray={dash}
              />
              {!isPerfect && (
                <text
                  x={0}
                  y={line.position - 4 * invZoom}
                  fill={color}
                  fontSize={8 * invZoom}
                  textAnchor="middle"
                  opacity={0.9}
                  style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 2 * invZoom }}
                >
                  Δ{line.offset.toFixed(1)}px
                </text>
              )}
            </g>
          );
        }

        return (
          <g key={`v-${i}`}>
            <line
              x1={line.position}
              y1={-lineExtent}
              x2={line.position}
              y2={lineExtent}
              stroke={color}
              strokeWidth={1 * invZoom}
              opacity={opacity}
              strokeDasharray={dash}
            />
            {!isPerfect && (
              <text
                x={line.position + 4 * invZoom}
                y={0}
                fill={color}
                fontSize={8 * invZoom}
                textAnchor="start"
                opacity={0.9}
                style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 2 * invZoom }}
              >
                Δ{line.offset.toFixed(1)}px
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

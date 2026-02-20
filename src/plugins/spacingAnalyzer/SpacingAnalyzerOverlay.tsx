import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { SpacingAnalyzerPluginSlice } from './slice';
import { analyzeSpacing } from './spacingUtils';
import type { CanvasElement } from '../../types';

type SpStore = CanvasStore & SpacingAnalyzerPluginSlice;

export const SpacingAnalyzerOverlay: React.FC = () => {
  const { enabled, showH, showV, threshold, selectedIds, elements, zoom } = useCanvasStore(
    useShallow((s) => {
      const st = s as SpStore;
      return {
        enabled: st.spacingAnalyzer?.enabled ?? false,
        showH: st.spacingAnalyzer?.showHorizontal ?? true,
        showV: st.spacingAnalyzer?.showVertical ?? true,
        threshold: st.spacingAnalyzer?.inconsistencyThreshold ?? 3,
        selectedIds: s.selectedIds,
        elements: s.elements,
        zoom: s.viewport.zoom,
      };
    })
  );

  const gaps = useMemo(() => {
    if (!enabled || selectedIds.length < 2) return [];
    const selected = elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    const result = analyzeSpacing(selected, { showHorizontal: showH, showVertical: showV, inconsistencyThreshold: threshold });
    return result.gaps;
  }, [enabled, selectedIds, elements, showH, showV, threshold]);

  if (!enabled || gaps.length === 0) return null;

  const invZ = 1 / zoom;
  const fontSize = 10 * invZ;

  return (
    <g className="spacing-analyzer-overlay">
      {gaps.map((gap, i) => {
        const color = gap.isInconsistent ? '#E53E3E' : '#38A169';
        const arrowSize = 4 * invZ;

        return (
          <g key={i}>
            <line
              x1={gap.from.x}
              y1={gap.from.y}
              x2={gap.to.x}
              y2={gap.to.y}
              stroke={color}
              strokeWidth={1.5 * invZ}
              strokeOpacity={0.8}
            />
            {/* Arrow ends */}
            {gap.axis === 'horizontal' ? (
              <>
                <line x1={gap.from.x} y1={gap.from.y - arrowSize} x2={gap.from.x} y2={gap.from.y + arrowSize} stroke={color} strokeWidth={1 * invZ} strokeOpacity={0.8} />
                <line x1={gap.to.x} y1={gap.to.y - arrowSize} x2={gap.to.x} y2={gap.to.y + arrowSize} stroke={color} strokeWidth={1 * invZ} strokeOpacity={0.8} />
              </>
            ) : (
              <>
                <line x1={gap.from.x - arrowSize} y1={gap.from.y} x2={gap.from.x + arrowSize} y2={gap.from.y} stroke={color} strokeWidth={1 * invZ} strokeOpacity={0.8} />
                <line x1={gap.to.x - arrowSize} y1={gap.to.y} x2={gap.to.x + arrowSize} y2={gap.to.y} stroke={color} strokeWidth={1 * invZ} strokeOpacity={0.8} />
              </>
            )}
            {/* Label */}
            <rect
              x={gap.midpoint.x - 16 * invZ}
              y={gap.midpoint.y - 7 * invZ}
              width={32 * invZ}
              height={14 * invZ}
              fill={color}
              fillOpacity={0.85}
              rx={3 * invZ}
            />
            <text
              x={gap.midpoint.x}
              y={gap.midpoint.y + 3.5 * invZ}
              textAnchor="middle"
              fill="white"
              fontSize={fontSize}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {gap.gap.toFixed(0)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

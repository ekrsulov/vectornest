import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ElementRulerPluginSlice } from './slice';
import { computeMeasurements, type Measurement } from './rulerUtils';
import type { CanvasElement } from '../../types';

type RulerStore = CanvasStore & ElementRulerPluginSlice;

const MeasurementLine: React.FC<{
  m: Measurement;
  invZoom: number;
  rulerColor: string;
  textColor: string;
}> = ({ m, invZoom, rulerColor, textColor }) => {
  const isDimension = m.type === 'dimension';
  const isAngle = m.type === 'angle';
  const isGap = m.type === 'gap-h' || m.type === 'gap-v';

  const strokeDasharray = isGap ? `${4 * invZoom} ${3 * invZoom}` : undefined;
  const lineOpacity = isDimension ? 0.5 : isAngle ? 0.3 : 0.7;

  return (
    <g>
      {/* Measurement line */}
      <line
        x1={m.from.x}
        y1={m.from.y}
        x2={m.to.x}
        y2={m.to.y}
        stroke={rulerColor}
        strokeWidth={1.2 * invZoom}
        opacity={lineOpacity}
        strokeDasharray={strokeDasharray}
      />

      {/* Endpoints */}
      {!isAngle && (
        <>
          <circle cx={m.from.x} cy={m.from.y} r={2.5 * invZoom} fill={rulerColor} opacity={0.8} />
          <circle cx={m.to.x} cy={m.to.y} r={2.5 * invZoom} fill={rulerColor} opacity={0.8} />
        </>
      )}

      {/* Label */}
      <text
        x={m.midpoint.x}
        y={m.midpoint.y - 5 * invZoom}
        fill={textColor}
        fontSize={9 * invZoom}
        textAnchor="middle"
        dominantBaseline="auto"
        style={{
          paintOrder: 'stroke',
          stroke: 'rgba(0,0,0,0.8)',
          strokeWidth: 2.5 * invZoom,
        }}
      >
        {m.label}
      </text>
    </g>
  );
};

export const ElementRulerOverlay: React.FC = () => {
  const {
    enabled, showDistances, showAngles, showGaps, showDimensions,
    rulerColor, textColor,
    selectedIds, elements, zoom,
  } = useCanvasStore(
    useShallow((s) => {
      const st = s as RulerStore;
      return {
        enabled: st.elementRuler?.enabled ?? false,
        showDistances: st.elementRuler?.showDistances ?? true,
        showAngles: st.elementRuler?.showAngles ?? true,
        showGaps: st.elementRuler?.showGaps ?? true,
        showDimensions: st.elementRuler?.showDimensions ?? true,
        rulerColor: st.elementRuler?.rulerColor ?? '#F6AD55',
        textColor: st.elementRuler?.textColor ?? '#FFFFFF',
        selectedIds: s.selectedIds,
        elements: s.elements,
        zoom: s.viewport.zoom,
      };
    })
  );

  const measurements = useMemo(() => {
    if (!enabled || selectedIds.length === 0) return [];
    const selected = elements.filter(
      (el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path'
    );
    return computeMeasurements(selected, {
      showDistances,
      showAngles,
      showGaps,
      showDimensions,
    });
  }, [enabled, selectedIds, elements, showDistances, showAngles, showGaps, showDimensions]);

  if (!enabled || measurements.length === 0) return null;

  const invZoom = 1 / zoom;

  return (
    <g className="element-ruler-overlay">
      {measurements.map((m, i) => (
        <MeasurementLine
          key={`${m.type}-${m.fromId}-${m.toId}-${i}`}
          m={m}
          invZoom={invZoom}
          rulerColor={rulerColor}
          textColor={textColor}
        />
      ))}
    </g>
  );
};

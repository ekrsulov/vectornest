import React, { useMemo } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ElementRulerPluginSlice } from './slice';
import { computeMeasurements, type Measurement } from './rulerUtils';
import type { CanvasElement } from '../../types';
import { buildElementMap } from '../../utils/elementMapUtils';
import { SvgTagLabel } from '../../ui/SvgTagLabel';

type RulerStore = CanvasStore & ElementRulerPluginSlice;

const MeasurementLine: React.FC<{
  m: Measurement;
  invZoom: number;
  rulerColor: string;
  textColor: string;
  labelBackground: string;
  labelBorder: string;
}> = ({ m, invZoom, rulerColor, textColor, labelBackground, labelBorder }) => {
  const isDimension = m.type === 'dimension';
  const isAngle = m.type === 'angle';
  const isGap = m.type === 'gap-h' || m.type === 'gap-v';

  const strokeDasharray = isGap ? `${4 * invZoom} ${3 * invZoom}` : undefined;
  const lineOpacity = isDimension ? 0.5 : isAngle ? 0.3 : 0.7;
  const crossSize = 3.5 * invZoom;

  if (isAngle) {
    const dx = m.to.x - m.from.x;
    const dy = m.to.y - m.from.y;
    const distance = Math.hypot(dx, dy);
    const angleDegrees = Math.min(Math.max(m.value, 0), 359.9);
    const angleRadians = (angleDegrees * Math.PI) / 180;
    const arcRadius = Math.max(
      Math.min(distance * 0.28, 22 * invZoom),
      Math.min(distance * 0.18, 10 * invZoom)
    );
    const baseToX = m.from.x + arcRadius;
    const baseToY = m.from.y;
    const arcEndX = m.from.x + Math.cos(angleRadians) * arcRadius;
    const arcEndY = m.from.y + Math.sin(angleRadians) * arcRadius;
    const largeArcFlag = angleDegrees > 180 ? 1 : 0;
    const arcPath = [
      `M ${baseToX} ${baseToY}`,
      `A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 1 ${arcEndX} ${arcEndY}`,
    ].join(' ');
    const labelRadius = arcRadius * 0.7;
    const labelAngle = angleRadians / 2;
    const labelX = m.from.x + Math.cos(labelAngle) * labelRadius;
    const labelY = m.from.y + Math.sin(labelAngle) * labelRadius;
    const angleDash = `${4 * invZoom} ${3 * invZoom}`;

    return (
      <g>
        <line
          x1={m.from.x}
          y1={m.from.y}
          x2={m.to.x}
          y2={m.to.y}
          stroke={rulerColor}
          strokeWidth={1.2 * invZoom}
          opacity={0.45}
          strokeDasharray={angleDash}
        />
        <line
          x1={m.from.x}
          y1={m.from.y}
          x2={baseToX}
          y2={baseToY}
          stroke={rulerColor}
          strokeWidth={1.2 * invZoom}
          opacity={0.35}
          strokeDasharray={angleDash}
        />
        <path
          d={arcPath}
          fill="none"
          stroke={rulerColor}
          strokeWidth={1.2 * invZoom}
          opacity={0.7}
        />
        <SvgTagLabel
          x={labelX}
          y={labelY}
          label={m.label}
          fontSize={9}
          zoom={invZoom > 0 ? 1 / invZoom : 1}
          textColor={textColor}
          backgroundColor={labelBackground}
          borderColor={labelBorder}
          opacity={0.96}
        />
      </g>
    );
  }

  return (
    <g>
      {isGap && m.projections?.map((projection, index) => (
        <line
          key={`${m.type}-projection-${index}`}
          x1={projection.from.x}
          y1={projection.from.y}
          x2={projection.to.x}
          y2={projection.to.y}
          stroke={rulerColor}
          strokeWidth={1 * invZoom}
          opacity={0.45}
          strokeDasharray={strokeDasharray}
        />
      ))}

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
          <g opacity={0.8}>
            <line
              x1={m.from.x - crossSize}
              y1={m.from.y}
              x2={m.from.x + crossSize}
              y2={m.from.y}
              stroke={rulerColor}
              strokeWidth={1.2 * invZoom}
              strokeLinecap="round"
            />
            <line
              x1={m.from.x}
              y1={m.from.y - crossSize}
              x2={m.from.x}
              y2={m.from.y + crossSize}
              stroke={rulerColor}
              strokeWidth={1.2 * invZoom}
              strokeLinecap="round"
            />
          </g>
          <g opacity={0.8}>
            <line
              x1={m.to.x - crossSize}
              y1={m.to.y}
              x2={m.to.x + crossSize}
              y2={m.to.y}
              stroke={rulerColor}
              strokeWidth={1.2 * invZoom}
              strokeLinecap="round"
            />
            <line
              x1={m.to.x}
              y1={m.to.y - crossSize}
              x2={m.to.x}
              y2={m.to.y + crossSize}
              stroke={rulerColor}
              strokeWidth={1.2 * invZoom}
              strokeLinecap="round"
            />
          </g>
        </>
      )}

      <SvgTagLabel
        x={m.midpoint.x}
        y={m.midpoint.y - 7 * invZoom}
        label={m.label}
        fontSize={9}
        zoom={invZoom > 0 ? 1 / invZoom : 1}
        textColor={textColor}
        backgroundColor={labelBackground}
        borderColor={labelBorder}
        opacity={0.96}
      />
    </g>
  );
};

export const ElementRulerOverlay: React.FC = () => {
  const {
    enabled, showDistances, showAngles, showGaps, showDimensions,
    selectedIds, elements, zoom, viewport,
  } = useCanvasStore(
    useShallow((s) => {
      const st = s as RulerStore;
      return {
        enabled: st.elementRuler?.enabled ?? false,
        showDistances: st.elementRuler?.showDistances ?? true,
        showAngles: st.elementRuler?.showAngles ?? true,
        showGaps: st.elementRuler?.showGaps ?? true,
        showDimensions: st.elementRuler?.showDimensions ?? true,
        selectedIds: s.selectedIds,
        elements: s.elements,
        zoom: s.viewport.zoom,
        viewport: s.viewport,
      };
    })
  );
  const { colorMode } = useColorMode();

  const measurements = useMemo(() => {
    if (!enabled || selectedIds.length === 0) return [];
    const elementMap = buildElementMap(elements);
    const selected = elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    return computeMeasurements(selected, viewport, elementMap, {
      showDistances,
      showAngles,
      showGaps,
      showDimensions,
    });
  }, [enabled, selectedIds, elements, showDistances, showAngles, showGaps, showDimensions, viewport]);

  if (!enabled || measurements.length === 0) return null;

  const invZoom = 1 / zoom;
  const palette = colorMode === 'dark'
    ? {
        rulerColor: '#D6D3D1',
        textColor: '#F5F5F4',
        labelBackground: 'rgba(28, 25, 23, 0.92)',
        labelBorder: '#78716C',
      }
    : {
        rulerColor: '#52525B',
        textColor: '#18181B',
        labelBackground: 'rgba(250, 250, 250, 0.96)',
        labelBorder: '#D4D4D8',
      };

  return (
    <g className="element-ruler-overlay">
      {measurements.map((m, i) => (
        <MeasurementLine
          key={`${m.type}-${m.fromId}-${m.toId}-${i}`}
          m={m}
          invZoom={invZoom}
          rulerColor={palette.rulerColor}
          textColor={palette.textColor}
          labelBackground={palette.labelBackground}
          labelBorder={palette.labelBorder}
        />
      ))}
    </g>
  );
};

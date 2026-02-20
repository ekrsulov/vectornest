import React, { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Box, HStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelToggle } from '../../ui/PanelToggle';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ColorHarmonyPluginSlice, HarmonyMode } from './slice';
import { generateHarmony, getWheelAngles } from './harmonyUtils';
import type { CanvasElement } from '../../types';

type HarmonyStore = CanvasStore & ColorHarmonyPluginSlice;

const MODE_OPTIONS: { value: HarmonyMode; label: string }[] = [
  { value: 'complementary', label: 'Complementary' },
  { value: 'triadic', label: 'Triadic' },
  { value: 'analogous', label: 'Analogous' },
  { value: 'splitComplementary', label: 'Split Complementary' },
  { value: 'tetradic', label: 'Tetradic' },
  { value: 'monochromatic', label: 'Monochromatic' },
];

/** Mini SVG color wheel indicator */
const HarmonyWheel: React.FC<{
  baseHue: number;
  mode: HarmonyMode;
  analogousAngle: number;
}> = ({ baseHue, mode, analogousAngle }) => {
  const angles = getWheelAngles(baseHue, mode, analogousAngle);
  const r = 40;
  const cx = 50;
  const cy = 50;

  return (
    <Box mx="auto" mb={2}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Hue ring */}
        {Array.from({ length: 36 }, (_, i) => {
          const a1 = (i * 10 * Math.PI) / 180;
          const outerX = cx + r * Math.cos(a1);
          const outerY = cy + r * Math.sin(a1);
          const innerX = cx + (r - 10) * Math.cos(a1);
          const innerY = cy + (r - 10) * Math.sin(a1);
          return (
            <line
              key={i}
              x1={innerX}
              y1={innerY}
              x2={outerX}
              y2={outerY}
              stroke={`hsl(${i * 10}, 70%, 50%)`}
              strokeWidth={8}
              strokeLinecap="round"
            />
          );
        })}

        {/* Connection lines between markers */}
        {angles.length > 1 && (
          <polygon
            points={angles
              .map((a) => {
                const rad = ((a - 90) * Math.PI) / 180;
                return `${cx + (r - 5) * Math.cos(rad)},${cy + (r - 5) * Math.sin(rad)}`;
              })
              .join(' ')}
            fill="none"
            stroke="white"
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}

        {/* Angle markers */}
        {angles.map((a, i) => {
          const rad = ((a - 90) * Math.PI) / 180;
          const mx = cx + (r - 5) * Math.cos(rad);
          const my = cy + (r - 5) * Math.sin(rad);
          return (
            <circle
              key={i}
              cx={mx}
              cy={my}
              r={i === 0 ? 5 : 4}
              fill={`hsl(${a}, 70%, 50%)`}
              stroke="white"
              strokeWidth={2}
            />
          );
        })}
      </svg>
    </Box>
  );
};

export const ColorHarmonyPanel: React.FC = () => {
  const { state, update, selectedIds, elements, updateElement } = useCanvasStore(
    useShallow((s) => {
      const st = s as HarmonyStore;
      return {
        state: st.colorHarmony,
        update: st.updateColorHarmonyState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        updateElement: s.updateElement,
      };
    })
  );

  const colors = useMemo(() => {
    if (!state) return [];
    return generateHarmony(
      state.baseHue, state.baseSaturation, state.baseLightness,
      state.mode, state.analogousAngle
    );
  }, [state]);

  const handleApply = useCallback(() => {
    if (!state || selectedIds.length === 0 || colors.length === 0) return;

    const selectedEls = elements.filter((el: CanvasElement) =>
      selectedIds.includes(el.id) && el.type === 'path'
    );

    selectedEls.forEach((el: CanvasElement, i: number) => {
      const color = colors[i % colors.length];
      if (el.type === 'path') {
        if (state.applyAsFill) {
          updateElement(el.id, { data: { ...el.data, fillColor: color.hex, fillOpacity: 1 } });
        } else {
          updateElement(el.id, { data: { ...el.data, strokeColor: color.hex } });
        }
      }
    });
  }, [state, selectedIds, elements, colors, updateElement]);

  if (!state || !update) return null;

  return (
    <Panel
      title="Color Harmony"
      isCollapsible
      defaultOpen={false}
    >
      <HarmonyWheel
        baseHue={state.baseHue}
        mode={state.mode}
        analogousAngle={state.analogousAngle}
      />

      <CustomSelect
        size="sm"
        placeholder="Harmony Mode"
        value={state.mode}
        onChange={(val) => update({ mode: val as HarmonyMode })}
        options={MODE_OPTIONS}
      />

      <SliderControl
        label="Hue"
        value={state.baseHue}
        min={0}
        max={360}
        onChange={(v) => update({ baseHue: v })}
        formatter={(v) => `${v}°`}
      />

      <SliderControl
        label="Saturation"
        value={state.baseSaturation}
        min={0}
        max={100}
        onChange={(v) => update({ baseSaturation: v })}
        formatter={(v) => `${v}%`}
      />

      <SliderControl
        label="Lightness"
        value={state.baseLightness}
        min={5}
        max={95}
        onChange={(v) => update({ baseLightness: v })}
        formatter={(v) => `${v}%`}
      />

      {state.mode === 'analogous' && (
        <SliderControl
          label="Angle Spread"
          value={state.analogousAngle}
          min={10}
          max={60}
          onChange={(v) => update({ analogousAngle: v })}
          formatter={(v) => `${v}°`}
        />
      )}

      <SectionHeader title="Palette" />

      <HStack gap={1} flexWrap="wrap" mb={2}>
        {colors.map((c, i) => (
          <Box
            key={i}
            w="28px"
            h="28px"
            borderRadius="sm"
            bg={c.hex}
            border="1px solid"
            borderColor="whiteAlpha.300"
            title={`${c.label}: ${c.hex}`}
          />
        ))}
      </HStack>

      <PanelToggle
        isChecked={state.applyAsFill}
        onChange={(e) => update({ applyAsFill: e.target.checked })}
      >
        Apply as Fill
      </PanelToggle>

      <SectionHeader
        title="Apply"
        onAction={handleApply}
        actionLabel="Apply"
        actionTitle="Apply colors to selected elements"
      />
    </Panel>
  );
};

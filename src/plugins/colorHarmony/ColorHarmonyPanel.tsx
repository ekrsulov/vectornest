import React, { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Box, HStack, Flex } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelToggle } from '../../ui/PanelToggle';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ColorHarmonyPluginSlice, HarmonyMode } from './slice';
import { generateHarmony, getWheelAngles, normalizeHue, wheelPointFromHue } from './harmonyUtils';
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
          const hue = i * 10;
          const outer = wheelPointFromHue(hue, cx, cy, r);
          const inner = wheelPointFromHue(hue, cx, cy, r - 10);
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={`hsl(${hue}, 70%, 50%)`}
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
                const point = wheelPointFromHue(a, cx, cy, r - 5);
                return `${point.x},${point.y}`;
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
          const marker = wheelPointFromHue(a, cx, cy, r - 5);
          return (
            <circle
              key={i}
              cx={marker.x}
              cy={marker.y}
              r={i === 0 ? 5 : 4}
              fill={`hsl(${normalizeHue(a)}, 70%, 50%)`}
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
      state.mode, state.analogousAngle, state.monochromaticSamples
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
        const updates: Partial<CanvasElement['data']> = {};
        if (state.applyAsFill) {
          updates.fillColor = color.hex;
          updates.fillOpacity = 1;
        }
        if (state.applyAsStroke) {
          updates.strokeColor = color.hex;
        }
        if (Object.keys(updates).length > 0) {
          updateElement(el.id, { data: { ...el.data, ...updates } });
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

      <Box mb={3}>
        <CustomSelect
          size="sm"
          placeholder="Harmony Mode"
          value={state.mode}
          onChange={(val) => update({ mode: val as HarmonyMode })}
          options={MODE_OPTIONS}
        />
      </Box>

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

      {state.mode === 'monochromatic' && (
        <SliderControl
          label="Samples"
          value={state.monochromaticSamples}
          min={5}
          max={10}
          onChange={(v) => update({ monochromaticSamples: v })}
          formatter={(v) => `${v}`}
        />
      )}

      <SectionHeader
        title="PALETTE"
        onAction={handleApply}
        actionLabel="Apply"
        actionTitle="Apply colors to selected elements"
      />

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

      <Flex display="flex" flexDirection="column" gap={2}>
        <PanelToggle
          isChecked={state.applyAsFill}
          onChange={(e) => update({ applyAsFill: e.target.checked })}
        >
          Apply as Fill
        </PanelToggle>

        <PanelToggle
          isChecked={state.applyAsStroke}
          onChange={(e) => update({ applyAsStroke: e.target.checked })}
        >
          Apply as Stroke
        </PanelToggle>
      </Flex>
    </Panel>
  );
};

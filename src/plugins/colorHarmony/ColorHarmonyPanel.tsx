import React, { useCallback, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Box, HStack, Flex } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { defaultColorHarmonyState, type ColorHarmonyPluginSlice, type HarmonyMode } from './slice';
import { generateHarmony, getWheelAngles, hueFromWheelPoint, normalizeHue, wheelPointFromHue } from './harmonyUtils';
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

const normalizeRoundedHue = (hue: number): number => normalizeHue(Math.round(hue));

/** Mini SVG color wheel indicator */
const HarmonyWheel: React.FC<{
  baseHue: number;
  mode: HarmonyMode;
  analogousAngle: number;
  onBaseHueChange: (hue: number) => void;
}> = ({ baseHue, mode, analogousAngle, onBaseHueChange }) => {
  const angles = getWheelAngles(baseHue, mode, analogousAngle);
  const r = 40;
  const cx = 50;
  const cy = 50;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ pointerId: number; markerOffset: number } | null>(null);

  const getHueFromPointer = useCallback((event: React.PointerEvent<SVGSVGElement | SVGCircleElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const svgX = ((event.clientX - rect.left) / rect.width) * 100;
    const svgY = ((event.clientY - rect.top) / rect.height) * 100;
    return hueFromWheelPoint(svgX, svgY, cx, cy);
  }, []);

  const handleMarkerPointerDown = useCallback((markerIndex: number) => (event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const markerOffset = normalizeHue(angles[markerIndex] - baseHue);
    dragRef.current = {
      pointerId: event.pointerId,
      markerOffset,
    };

    svgRef.current?.setPointerCapture(event.pointerId);

    const pointerHue = getHueFromPointer(event);
    if (pointerHue !== null) {
      onBaseHueChange(normalizeRoundedHue(pointerHue - markerOffset));
    }
  }, [angles, baseHue, getHueFromPointer, onBaseHueChange]);

  const handlePointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;

    const pointerHue = getHueFromPointer(event);
    if (pointerHue === null) return;

    onBaseHueChange(normalizeRoundedHue(pointerHue - dragRef.current.markerOffset));
  }, [getHueFromPointer, onBaseHueChange]);

  const clearDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handlePointerEnd = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
    clearDrag();
  }, [clearDrag]);

  return (
    <Flex justify="center" mb={2} width="100%">
      <svg
        ref={svgRef}
        width="100"
        height="100"
        viewBox="0 0 100 100"
        style={{ touchAction: 'none', display: 'block' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={clearDrag}
      >
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
            <g key={i}>
              <circle
                cx={marker.x}
                cy={marker.y}
                r={10}
                fill="transparent"
                style={{ cursor: 'grab', touchAction: 'none' }}
                onPointerDown={handleMarkerPointerDown(i)}
              />
              <circle
                cx={marker.x}
                cy={marker.y}
                r={i === 0 ? 5 : 4}
                fill={`hsl(${normalizeHue(a)}, 70%, 50%)`}
                stroke="white"
                strokeWidth={2}
                pointerEvents="none"
              />
            </g>
          );
        })}
      </svg>
    </Flex>
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

  const handleReset = useCallback(() => {
    update({ ...defaultColorHarmonyState });
  }, [update]);

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
        onBaseHueChange={(hue) => update({ baseHue: normalizeRoundedHue(hue) })}
      />

      <Flex justify="flex-end" mb={3}>
        <PanelStyledButton size="xs" onClick={handleReset} title="Reset Color Harmony settings">
          Reset
        </PanelStyledButton>
      </Flex>

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
        onChange={(v) => update({ baseHue: normalizeRoundedHue(v) })}
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

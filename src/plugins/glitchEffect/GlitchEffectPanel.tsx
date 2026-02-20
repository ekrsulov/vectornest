import React from 'react';
import { VStack, Text, HStack } from '@chakra-ui/react';
import { Shuffle } from 'lucide-react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { CustomSelect } from '../../ui/CustomSelect';
import type { GlitchEffectPluginSlice, GlitchMode } from './slice';
import { buildGlitchFilterSvg, getGlitchModeLabel } from './filterBuilder';
import { generateShortId } from '../../utils/idGenerator';

const modeOptions = [
  { value: 'displacement', label: 'Displacement' },
  { value: 'rgb-shift', label: 'RGB Shift' },
  { value: 'scanlines', label: 'Scanlines' },
  { value: 'pixelate', label: 'Pixelate' },
  { value: 'noise', label: 'Noise Overlay' },
];

const selectGlitchData = (state: CanvasStore) => {
  const st = (state as unknown as GlitchEffectPluginSlice).glitchEffect;
  return {
    mode: st?.mode ?? 'displacement',
    intensity: st?.intensity ?? 10,
    frequency: st?.frequency ?? 0.03,
    shiftX: st?.shiftX ?? 5,
    shiftY: st?.shiftY ?? 0,
    scanlineGap: st?.scanlineGap ?? 4,
    seed: st?.seed ?? 1,
    selectedCount: state.selectedIds.length,
  };
};

export const GlitchEffectPanel: React.FC = () => {
  const {
    mode,
    intensity,
    frequency,
    shiftX,
    shiftY,
    scanlineGap,
    selectedCount,
  } = useShallowCanvasSelector(selectGlitchData);

  const updateState = useCanvasStore(
    (state) => (state as unknown as GlitchEffectPluginSlice).updateGlitchEffectState
  );

  const handleRandomize = () => {
    updateState?.({ seed: Math.floor(Math.random() * 999) });
  };

  const handleApply = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    const glitchState = (store as unknown as GlitchEffectPluginSlice).glitchEffect;
    if (!glitchState || store.selectedIds.length === 0) return;

    const filterId = generateShortId('glitch');
    const filterSvg = buildGlitchFilterSvg(filterId, glitchState);

    // Register the filter via the filter plugin
    const filterStore = store as Record<string, unknown>;
    if (typeof filterStore.upsertFilter === 'function') {
      (filterStore.upsertFilter as (def: { id: string; type: string; value: number; svg: string }) => void)({
        id: filterId,
        type: 'custom',
        value: 50,
        svg: filterSvg,
      });
    }

    // Apply to all selected elements
    for (const id of store.selectedIds) {
      const element = store.elements.find((el) => el.id === id);
      if (element) {
        const data = element.data as Record<string, unknown>;
        store.updateElement(id, { data: { ...data, filterId } });
      }
    }
  };

  return (
    <Panel title="Glitch Effect" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        {selectedCount === 0 ? (
          <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.400' }}>
            Select elements to apply glitch effects.
          </Text>
        ) : (
          <>
            <CustomSelect
              value={mode}
              onChange={(val) => updateState?.({ mode: val as GlitchMode })}
              options={modeOptions}
              size="sm"
            />

            {/* Displacement controls */}
            {mode === 'displacement' && (
              <>
                <SliderControl label="Intensity:" value={intensity} min={1} max={80} step={1}
                  onChange={(val) => updateState?.({ intensity: val })} />
                <SliderControl label="Frequency:" value={frequency} min={0.001} max={0.15} step={0.002}
                  onChange={(val) => updateState?.({ frequency: val })} />
              </>
            )}

            {/* RGB Shift controls */}
            {mode === 'rgb-shift' && (
              <>
                <SliderControl label="Shift X:" value={shiftX} min={-30} max={30} step={1}
                  onChange={(val) => updateState?.({ shiftX: val })} />
                <SliderControl label="Shift Y:" value={shiftY} min={-30} max={30} step={1}
                  onChange={(val) => updateState?.({ shiftY: val })} />
              </>
            )}

            {/* Scanlines controls */}
            {mode === 'scanlines' && (
              <>
                <SliderControl label="Line gap:" value={scanlineGap} min={1} max={20} step={1}
                  onChange={(val) => updateState?.({ scanlineGap: val })} />
                <SliderControl label="Intensity:" value={intensity} min={10} max={100} step={5}
                  onChange={(val) => updateState?.({ intensity: val })} />
              </>
            )}

            {/* Pixelate controls */}
            {mode === 'pixelate' && (
              <SliderControl label="Pixel size:" value={intensity} min={2} max={50} step={1}
                onChange={(val) => updateState?.({ intensity: val })} />
            )}

            {/* Noise controls */}
            {mode === 'noise' && (
              <SliderControl label="Frequency:" value={frequency} min={0.01} max={0.5} step={0.01}
                onChange={(val) => updateState?.({ frequency: val })} />
            )}

            <HStack gap={1} mt={1}>
              <PanelStyledButton onClick={handleApply} flex={1}>
                Apply {getGlitchModeLabel(mode)}
              </PanelStyledButton>
              <PanelActionButton
                icon={Shuffle}
                label="Randomize seed"
                onClick={handleRandomize}
              />
            </HStack>
          </>
        )}
      </VStack>
    </Panel>
  );
};

import React from 'react';
import { VStack, HStack, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { CustomSelect } from '../../ui/CustomSelect';
import type { NoiseGeneratorPluginSlice, NoiseType } from './slice';
import type { CanvasStore } from '../../store/canvasStore';
import { Shuffle } from 'lucide-react';
import { generateShortId } from '../../utils/idGenerator';

const noiseTypeOptions = [
  { value: 'turbulence', label: 'Turbulence' },
  { value: 'fractalNoise', label: 'Fractal Noise' },
];

const blendModeOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
];

const selectNoiseState = (state: CanvasStore) => {
  const ns = (state as unknown as NoiseGeneratorPluginSlice).noiseGenerator;
  return {
    noiseType: ns?.noiseType ?? 'turbulence',
    baseFrequencyX: ns?.baseFrequencyX ?? 0.02,
    baseFrequencyY: ns?.baseFrequencyY ?? 0.02,
    numOctaves: ns?.numOctaves ?? 3,
    seed: ns?.seed ?? 0,
    stitchTiles: ns?.stitchTiles ?? false,
    opacity: ns?.opacity ?? 1,
    blendMode: ns?.blendMode ?? 'normal',
    selectedCount: state.selectedIds.length,
  };
};

/**
 * Build the SVG filter string for an feTurbulence noise effect
 */
const buildNoiseFilterSvg = (
  id: string,
  noiseType: NoiseType,
  baseFrequencyX: number,
  baseFrequencyY: number,
  numOctaves: number,
  seed: number,
  stitchTiles: boolean,
  opacity: number,
  blendMode: string
): string => {
  const stitch = stitchTiles ? 'stitch' : 'noStitch';
  return `<filter id="${id}" x="0%" y="0%" width="100%" height="100%">
  <feTurbulence type="${noiseType}" baseFrequency="${baseFrequencyX} ${baseFrequencyY}" numOctaves="${numOctaves}" seed="${seed}" stitchTiles="${stitch}" result="noise"/>
  <feComponentTransfer in="noise" result="fadedNoise">
    <feFuncA type="linear" slope="${opacity}"/>
  </feComponentTransfer>
  <feBlend in="SourceGraphic" in2="fadedNoise" mode="${blendMode}"/>
</filter>`;
};

/**
 * Noise Generator panel — creates SVG feTurbulence noise filters
 */
export const NoiseGeneratorPanel: React.FC = () => {
  const {
    noiseType,
    baseFrequencyX,
    baseFrequencyY,
    numOctaves,
    seed,
    stitchTiles,
    opacity,
    blendMode,
    selectedCount,
  } = useShallowCanvasSelector(selectNoiseState);

  const updateNoiseGeneratorState = useCanvasStore(
    (state) => (state as unknown as NoiseGeneratorPluginSlice).updateNoiseGeneratorState
  );
  const randomizeSeed = useCanvasStore(
    (state) => (state as unknown as NoiseGeneratorPluginSlice).randomizeSeed
  );

  const handleApply = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    const selectedIds = store.selectedIds;
    if (selectedIds.length === 0) return;

    const filterId = generateShortId('noise');
    const filterSvg = buildNoiseFilterSvg(
      filterId,
      noiseType as NoiseType,
      baseFrequencyX,
      baseFrequencyY,
      numOctaves,
      seed,
      stitchTiles,
      opacity,
      blendMode
    );

    // Register the filter via the filter plugin if available
    const filterState = store as Record<string, unknown>;
    if (typeof filterState.upsertFilter === 'function') {
      (filterState.upsertFilter as (def: { id: string; type: string; value: number; svg: string }) => void)({
        id: filterId,
        type: 'custom',
        value: 50,
        svg: filterSvg,
      });
    }

    // Apply the filter to all selected elements
    for (const id of selectedIds) {
      const element = store.elements.find((el) => el.id === id);
      if (element) {
        const data = element.data as Record<string, unknown>;
        store.updateElement(id, { data: { ...data, filterId } });
      }
    }
  };

  return (
    <Panel title="Noise Generator" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        {selectedCount === 0 ? (
          <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.400' }}>
            Select elements to apply noise texture.
          </Text>
        ) : (
          <>
            <CustomSelect
              value={noiseType}
              onChange={(val) => updateNoiseGeneratorState?.({ noiseType: val as NoiseType })}
              options={noiseTypeOptions}
              size="sm"
            />

            <SliderControl
              label="Freq X:"
              value={baseFrequencyX}
              min={0.001}
              max={0.2}
              step={0.001}
              onChange={(val) => updateNoiseGeneratorState?.({ baseFrequencyX: val })}
            />

            <SliderControl
              label="Freq Y:"
              value={baseFrequencyY}
              min={0.001}
              max={0.2}
              step={0.001}
              onChange={(val) => updateNoiseGeneratorState?.({ baseFrequencyY: val })}
            />

            <SliderControl
              label="Octaves:"
              value={numOctaves}
              min={1}
              max={8}
              step={1}
              onChange={(val) => updateNoiseGeneratorState?.({ numOctaves: val })}
            />

            <HStack gap={1} align="center">
              <Text fontSize="11px" color="gray.600" _dark={{ color: 'gray.400' }} minW="35px">
                Seed:
              </Text>
              <Text fontSize="11px" fontFamily="mono" flex={1}>
                {seed}
              </Text>
              <PanelStyledButton size="xs" onClick={() => randomizeSeed?.()} leftIcon={<Shuffle size={10} />}>
                Randomize
              </PanelStyledButton>
            </HStack>

            <SliderControl
              label="Opacity:"
              value={opacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(val) => updateNoiseGeneratorState?.({ opacity: val })}
            />

            <CustomSelect
              value={blendMode}
              onChange={(val) => updateNoiseGeneratorState?.({ blendMode: val })}
              options={blendModeOptions}
              size="sm"
            />

            <PanelToggle
              isChecked={stitchTiles}
              onChange={() => updateNoiseGeneratorState?.({ stitchTiles: !stitchTiles })}
            >
              Stitch Tiles
            </PanelToggle>

            <PanelStyledButton onClick={handleApply} w="full" mt={1}>
              Apply Noise
            </PanelStyledButton>
          </>
        )}
      </VStack>
    </Panel>
  );
};

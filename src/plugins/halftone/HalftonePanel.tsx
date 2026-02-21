import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { CustomSelect } from '../../ui/CustomSelect';
import type { HalftonePluginSlice, HalftoneShape } from './slice';
import type { CanvasStore } from '../../store/canvasStore';
import { buildHalftoneFilterSvg } from './filterBuilder';
import { generateShortId } from '../../utils/idGenerator';

const shapeOptions = [
  { value: 'circle', label: 'Circle Dots' },
  { value: 'ellipse', label: 'Ellipse Dots' },
  { value: 'line', label: 'Line Pattern' },
];

const selectHalftoneData = (state: CanvasStore) => {
  const ht = (state as unknown as HalftonePluginSlice).halftone;
  return {
    dotSize: ht?.dotSize ?? 4,
    spacing: ht?.spacing ?? 8,
    angle: ht?.angle ?? 45,
    shape: ht?.shape ?? 'circle',
    contrast: ht?.contrast ?? 1.5,
    colorize: ht?.colorize ?? false,
    selectedCount: state.selectedIds.length,
  };
};

/**
 * Halftone Effect panel — apply a print-style halftone filter to selected elements
 */
export const HalftonePanel: React.FC = () => {
  const {
    dotSize,
    spacing,
    angle,
    shape,
    contrast,
    colorize,
    selectedCount,
  } = useShallowCanvasSelector(selectHalftoneData);

  const updateHalftoneState = useCanvasStore(
    (state) => (state as unknown as HalftonePluginSlice).updateHalftoneState
  );

  const handleApply = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    const halftoneState = (store as unknown as HalftonePluginSlice).halftone;
    if (!halftoneState) return;

    const selectedIds = store.selectedIds;
    if (selectedIds.length === 0) return;

    const filterId = generateShortId('halftone');
    const filterSvg = buildHalftoneFilterSvg(filterId, halftoneState);

    // Register via the filter plugin if available
    const filterStore = store as Record<string, unknown>;
    if (typeof filterStore.upsertFilter === 'function') {
      (filterStore.upsertFilter as (def: { id: string; type: string; value: number; svg: string }) => void)({
        id: filterId,
        type: 'custom',
        value: 50,
        svg: filterSvg,
      });
    }

    // Apply filter to all selected elements
    for (const id of selectedIds) {
      const element = store.elements.find((el) => el.id === id);
      if (element) {
        const data = element.data as Record<string, unknown>;
        store.updateElement(id, { data: { ...data, filterId } });
      }
    }
  };

  return (
    <Panel title="Halftone Effect" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        {selectedCount === 0 ? (
          <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
            Select elements to apply halftone effect.
          </Text>
        ) : (
          <>
            <CustomSelect
              value={shape}
              onChange={(val) => updateHalftoneState?.({ shape: val as HalftoneShape })}
              options={shapeOptions}
              size="sm"
            />

            <SliderControl
              label="Dot size"
              value={dotSize}
              min={1}
              max={20}
              step={0.5}
              onChange={(val) => updateHalftoneState?.({ dotSize: val })}
            />

            <SliderControl
              label="Spacing"
              value={spacing}
              min={2}
              max={30}
              step={1}
              onChange={(val) => updateHalftoneState?.({ spacing: val })}
            />

            <SliderControl
              label="Angle"
              value={angle}
              min={0}
              max={180}
              step={5}
              onChange={(val) => updateHalftoneState?.({ angle: val })}
            />

            <SliderControl
              label="Contrast"
              value={contrast}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(val) => updateHalftoneState?.({ contrast: val })}
            />

            <PanelToggle
              isChecked={colorize}
              onChange={() => updateHalftoneState?.({ colorize: !colorize })}
            >
              Preserve colors
            </PanelToggle>

            <PanelStyledButton onClick={handleApply} w="full" mt={1}>
              Apply Halftone
            </PanelStyledButton>
          </>
        )}
      </VStack>
    </Panel>
  );
};

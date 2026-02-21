import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { NumberInput } from '../../ui/NumberInput';
import { PanelTextActionButton } from '../../ui/PanelTextActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import type { KaleidoscopePluginSlice } from './slice';
import type { PathData } from '../../types';
import { applyKaleidoscope } from './kaleidoscopeUtils';

export const KaleidoscopePanel: React.FC = () => {
  const kState = useCanvasStore(
    (state) => (state as unknown as KaleidoscopePluginSlice).kaleidoscope
  );
  const updateState = useCanvasStore(
    (state) => (state as unknown as KaleidoscopePluginSlice).updateKaleidoscopeState
  );

  const handleApply = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    const selectedIds = store.selectedIds;
    if (selectedIds.length === 0 || !kState) return;

    const sourcePaths: PathData[] = [];
    for (const id of selectedIds) {
      const el = store.elements.find((e) => e.id === id);
      if (el?.type === 'path') sourcePaths.push(el.data as PathData);
    }
    if (sourcePaths.length === 0) return;

    const copies = applyKaleidoscope(
      sourcePaths,
      kState.segments,
      kState.centerX,
      kState.centerY,
      kState.rotationOffset,
      kState.reflect
    );

    for (const data of copies) {
      store.addElement({ type: 'path' as const, data });
    }

    if (kState.deleteOriginals) {
      for (const id of selectedIds) {
        store.deleteElement(id);
      }
    }
  };

  if (!kState) return null;

  const expectedCopies = kState.reflect
    ? kState.segments * 2 - 1
    : kState.segments - 1;

  return (
    <Panel title="Kaleidoscope" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.400' }}>
          Replicate selected paths with rotational symmetry.
          Creates {expectedCopies} copies per source path.
        </Text>

        <SliderControl
          label="Segments"
          value={kState.segments}
          min={2}
          max={24}
          step={1}
          onChange={(v) => updateState?.({ segments: v })}
        />

        <SliderControl
          label="Rotation"
          value={kState.rotationOffset}
          min={0}
          max={360}
          step={5}
          formatter={(v) => `${v}°`}
          onChange={(v) => updateState?.({ rotationOffset: v })}
        />

        <NumberInput
          label="Center X"
          value={kState.centerX}
          onChange={(v) => updateState?.({ centerX: v })}
        />

        <NumberInput
          label="Center Y"
          value={kState.centerY}
          onChange={(v) => updateState?.({ centerY: v })}
        />

        <PanelToggle
          isChecked={kState.reflect}
          onChange={() => updateState?.({ reflect: !kState.reflect })}
        >
          Mirror reflections
        </PanelToggle>

        <PanelToggle
          isChecked={kState.deleteOriginals}
          onChange={() => updateState?.({ deleteOriginals: !kState.deleteOriginals })}
        >
          Delete originals
        </PanelToggle>

        <PanelTextActionButton
          label="Apply Kaleidoscope"
          onClick={handleApply}
        />
      </VStack>
    </Panel>
  );
};

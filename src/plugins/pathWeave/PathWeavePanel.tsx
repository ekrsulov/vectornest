import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { Shuffle } from 'lucide-react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import type { PathWeavePluginSlice } from './slice';
import type { PathData } from '../../types';
import { applyWeave } from './weaveUtils';

export const PathWeavePanel: React.FC = () => {
  const weaveState = useCanvasStore(
    (state) => (state as unknown as PathWeavePluginSlice).pathWeave
  );
  const updateState = useCanvasStore(
    (state) => (state as unknown as PathWeavePluginSlice).updatePathWeaveState
  );

  const handleApply = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    const selectedIds = store.selectedIds;
    if (selectedIds.length < 2 || !weaveState) return;

    // Get selected path elements
    const pathElements = selectedIds
      .map((id) => store.elements.find((el) => el.id === id))
      .filter((el) => el?.type === 'path');

    if (pathElements.length < 2) return;

    const startOver = weaveState.startPattern === 'over';

    if (weaveState.mode === 'sequential') {
      // Weave each pair sequentially
      for (let i = 0; i < pathElements.length - 1; i++) {
        const elA = pathElements[i]!;
        const elB = pathElements[i + 1]!;
        const dataA = elA.data as PathData;
        const dataB = elB.data as PathData;

        const { resultA, resultB } = applyWeave(
          dataA, dataB, weaveState.gapSize, startOver, weaveState.alternate
        );

        store.updateElement(elA.id, { data: { ...dataA, subPaths: resultA } });
        store.updateElement(elB.id, { data: { ...dataB, subPaths: resultB } });
      }
    } else {
      // All-pairs: weave every path with every other path
      for (let i = 0; i < pathElements.length; i++) {
        for (let j = i + 1; j < pathElements.length; j++) {
          const elA = pathElements[i]!;
          const elB = pathElements[j]!;
          const dataA = elA.data as PathData;
          const dataB = elB.data as PathData;

          const { resultA, resultB } = applyWeave(
            dataA, dataB, weaveState.gapSize, startOver, weaveState.alternate
          );

          store.updateElement(elA.id, { data: { ...dataA, subPaths: resultA } });
          store.updateElement(elB.id, { data: { ...dataB, subPaths: resultB } });
        }
      }
    }
  };

  if (!weaveState) return null;

  return (
    <Panel title="Path Weave" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.400' }}>
          Select 2+ overlapping paths to create an over/under weave pattern.
        </Text>

        <CustomSelect
          value={weaveState.mode}
          onChange={(v) => updateState?.({ mode: v as 'all-pairs' | 'sequential' })}
          options={[
            { value: 'sequential', label: 'Sequential pairs' },
            { value: 'all-pairs', label: 'All pairs' },
          ]}
          size="sm"
        />

        <CustomSelect
          value={weaveState.startPattern}
          onChange={(v) => updateState?.({ startPattern: v as 'over' | 'under' })}
          options={[
            { value: 'over', label: 'Over first' },
            { value: 'under', label: 'Under first' },
          ]}
          size="sm"
        />

        <SliderControl
          label="Gap size"
          value={weaveState.gapSize}
          min={1}
          max={30}
          step={0.5}
          onChange={(v) => updateState?.({ gapSize: v })}
        />

        <PanelToggle
          isChecked={weaveState.alternate}
          onChange={() => updateState?.({ alternate: !weaveState.alternate })}
        >
          Alternate over/under
        </PanelToggle>

        <PanelActionButton
          icon={Shuffle}
          label="Apply weave"
          onClick={handleApply}
        />
      </VStack>
    </Panel>
  );
};

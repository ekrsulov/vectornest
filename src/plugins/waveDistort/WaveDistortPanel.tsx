import React from 'react';
import { VStack } from '@chakra-ui/react';
import { Waves } from 'lucide-react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelActionButton } from '../../ui/PanelActionButton';
import type { WaveDistortPluginSlice } from './slice';
import type { PathData } from '../../types';
import { applyWaveDistortion } from './waveUtils';

export const WaveDistortPanel: React.FC = () => {
  const waveState = useCanvasStore(
    (state) => (state as unknown as WaveDistortPluginSlice).waveDistort
  );
  const updateState = useCanvasStore(
    (state) => (state as unknown as WaveDistortPluginSlice).updateWaveDistortState
  );

  const handleApply = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    const selectedIds = store.selectedIds;
    if (selectedIds.length === 0 || !waveState) return;

    for (const id of selectedIds) {
      const element = store.elements.find((el) => el.id === id);
      if (element?.type === 'path') {
        const pathData = element.data as PathData;
        const newSubPaths = applyWaveDistortion(pathData.subPaths, waveState);
        store.updateElement(id, {
          data: { ...pathData, subPaths: newSubPaths },
        });
      }
    }
  };

  if (!waveState) return null;

  return (
    <Panel title="Wave Distort" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        <CustomSelect
          value={waveState.waveType}
          onChange={(v) =>
            updateState?.({
              waveType: v as 'sine' | 'sawtooth' | 'square' | 'triangle',
            })
          }
          options={[
            { value: 'sine', label: 'Sine' },
            { value: 'sawtooth', label: 'Sawtooth' },
            { value: 'square', label: 'Square' },
            { value: 'triangle', label: 'Triangle' },
          ]}
          size="sm"
        />

        <CustomSelect
          value={waveState.direction}
          onChange={(v) =>
            updateState?.({ direction: v as 'normal' | 'x' | 'y' })
          }
          options={[
            { value: 'normal', label: 'Along normal' },
            { value: 'x', label: 'X axis' },
            { value: 'y', label: 'Y axis' },
          ]}
          size="sm"
        />

        <SliderControl
          label="Amplitude"
          value={waveState.amplitude}
          min={1}
          max={100}
          step={0.5}
          onChange={(v) => updateState?.({ amplitude: v })}
        />

        <SliderControl
          label="Frequency"
          value={waveState.frequency}
          min={1}
          max={50}
          step={1}
          onChange={(v) => updateState?.({ frequency: v })}
        />

        <SliderControl
          label="Phase"
          value={waveState.phase}
          min={0}
          max={360}
          step={1}
          formatter={(v) => `${v}°`}
          onChange={(v) => updateState?.({ phase: v })}
        />

        <SliderControl
          label="Resolution"
          value={waveState.resolution}
          min={4}
          max={64}
          step={1}
          onChange={(v) => updateState?.({ resolution: v })}
        />

        <PanelActionButton
          icon={Waves}
          label="Apply wave distortion"
          onClick={handleApply}
        />
      </VStack>
    </Panel>
  );
};

import React from 'react';
import { VStack } from '@chakra-ui/react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelTextActionButton } from '../../ui/PanelTextActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { NumberInput } from '../../ui/NumberInput';
import type { SpiralGeneratorPluginSlice, SpiralType } from './slice';
import { generateSpiral } from './spiralUtils';

export const SpiralGeneratorPanel: React.FC = () => {
  const spiralState = useCanvasStore(
    (state) => (state as unknown as SpiralGeneratorPluginSlice).spiralGenerator
  );
  const updateState = useCanvasStore(
    (state) => (state as unknown as SpiralGeneratorPluginSlice).updateSpiralGeneratorState
  );

  const handleGenerate = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    if (!spiralState) return;

    const subPaths = generateSpiral(spiralState);
    if (subPaths.length === 0) return;

    // Get current style settings
    const style = (store as Record<string, unknown>).style as Record<string, unknown> | undefined;

    store.addElement({
      type: 'path' as const,
      data: {
        subPaths,
        strokeWidth: (style?.strokeWidth as number) ?? 2,
        strokeColor: (style?.strokeColor as string) ?? '#ffffff',
        strokeOpacity: 1,
        fillColor: 'none',
        fillOpacity: 1,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fillRule: 'nonzero',
        strokeDasharray: 'none',
      },
    });
  };

  if (!spiralState) return null;

  return (
    <Panel title="Spiral Generator" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        <CustomSelect
          value={spiralState.spiralType}
          onChange={(v) => updateState?.({ spiralType: v as SpiralType })}
          options={[
            { value: 'archimedean', label: 'Archimedean' },
            { value: 'logarithmic', label: 'Logarithmic' },
            { value: 'fibonacci', label: 'Fibonacci (Golden)' },
            { value: 'fermat', label: 'Fermat' },
          ]}
          size="sm"
        />

        <SliderControl
          label="Turns"
          value={spiralState.turns}
          min={1}
          max={20}
          step={0.5}
          onChange={(v) => updateState?.({ turns: v })}
        />

        <SliderControl
          label="Outer radius"
          value={spiralState.outerRadius}
          min={20}
          max={500}
          step={5}
          onChange={(v) => updateState?.({ outerRadius: v })}
        />

        <SliderControl
          label="Inner radius"
          value={spiralState.innerRadius}
          min={0}
          max={100}
          step={1}
          onChange={(v) => updateState?.({ innerRadius: v })}
        />

        <SliderControl
          label="Points / turn"
          value={spiralState.pointsPerTurn}
          min={8}
          max={64}
          step={4}
          onChange={(v) => updateState?.({ pointsPerTurn: v })}
        />

        {spiralState.spiralType === 'logarithmic' && (
          <SliderControl
            label="Growth rate"
            value={spiralState.growthRate}
            min={0.01}
            max={1}
            step={0.01}
            onChange={(v) => updateState?.({ growthRate: v })}
          />
        )}

        <PanelToggle
          isChecked={spiralState.clockwise}
          onChange={() => updateState?.({ clockwise: !spiralState.clockwise })}
        >
          Clockwise
        </PanelToggle>

        <NumberInput
          label="Center X"
          value={spiralState.centerX}
          onChange={(v) => updateState?.({ centerX: v })}
        />

        <NumberInput
          label="Center Y"
          value={spiralState.centerY}
          onChange={(v) => updateState?.({ centerY: v })}
        />

        <PanelTextActionButton
          label="Generate Spiral"
          onClick={handleGenerate}
        />
      </VStack>
    </Panel>
  );
};

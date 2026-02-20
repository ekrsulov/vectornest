import React from 'react';
import { VStack } from '@chakra-ui/react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { NumberInput } from '../../ui/NumberInput';
import type { SymmetryDrawPluginSlice, SymmetryMode } from './slice';

const modeOptions = [
  { value: 'mirror-x', label: 'Mirror X (Vertical)' },
  { value: 'mirror-y', label: 'Mirror Y (Horizontal)' },
  { value: 'mirror-xy', label: 'Mirror XY (Both)' },
  { value: 'radial', label: 'Radial / Kaleidoscope' },
];

/**
 * Symmetry Draw settings panel — configure symmetry mode, center, guides
 */
export const SymmetryDrawPanel: React.FC = () => {
  const symmetry = useCanvasStore(
    (state) => (state as CanvasStore & SymmetryDrawPluginSlice).symmetryDraw
  );
  const updateSymmetryDrawState = useCanvasStore(
    (state) => (state as CanvasStore & SymmetryDrawPluginSlice).updateSymmetryDrawState
  );

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSymmetryDrawState?.({ enabled: e.target.checked });
  };

  return (
    <Panel
      title="Symmetry"
      isCollapsible={symmetry?.enabled ?? false}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={symmetry?.enabled ?? false}
          onChange={handleToggle}
          aria-label="Toggle symmetry guides"
        />
      }
    >
      {symmetry?.enabled && (
        <VStack gap={1} align="stretch">
          <CustomSelect
            value={symmetry.mode}
            onChange={(val) => updateSymmetryDrawState?.({ mode: val as SymmetryMode })}
            options={modeOptions}
            size="sm"
          />

          {symmetry.mode === 'radial' && (
            <SliderControl
              label="Segments:"
              value={symmetry.segments}
              min={3}
              max={16}
              step={1}
              onChange={(val) => updateSymmetryDrawState?.({ segments: val })}
            />
          )}

          <NumberInput
            label="Center X"
            value={symmetry.centerX}
            min={-5000}
            max={5000}
            step={10}
            onChange={(val) => updateSymmetryDrawState?.({ centerX: val })}
          />

          <NumberInput
            label="Center Y"
            value={symmetry.centerY}
            min={-5000}
            max={5000}
            step={10}
            onChange={(val) => updateSymmetryDrawState?.({ centerY: val })}
          />

          <PanelToggle
            isChecked={symmetry.showGuides}
            onChange={() => updateSymmetryDrawState?.({ showGuides: !symmetry.showGuides })}
          >
            Show guide lines
          </PanelToggle>

          {symmetry.showGuides && (
            <SliderControl
              label="Guide opacity:"
              value={symmetry.guideOpacity}
              min={0.1}
              max={1}
              step={0.05}
              onChange={(val) => updateSymmetryDrawState?.({ guideOpacity: val })}
            />
          )}
        </VStack>
      )}
    </Panel>
  );
};

import React, { useCallback } from 'react';
import { Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { CustomSelect } from '../../ui/CustomSelect';
import { SliderControl } from '../../ui/SliderControl';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { SmartDistributePluginSlice, DistributeMode, EasingType, SpacingMode } from './slice';
import { computeDistribution } from './distributeUtils';
import type { CanvasElement, SubPath, Command } from '../../types';

type DistributeStore = CanvasStore & SmartDistributePluginSlice;

const modeOptions = [
  { label: 'Horizontal', value: 'horizontal' },
  { label: 'Vertical', value: 'vertical' },
  { label: 'Radial', value: 'radial' },
  { label: 'Along Line', value: 'along-line' },
];

const easingOptions = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease In', value: 'ease-in' },
  { label: 'Ease Out', value: 'ease-out' },
  { label: 'Ease In-Out', value: 'ease-in-out' },
];

const spacingOptions = [
  { label: 'Equal Gap', value: 'equal-gap' },
  { label: 'Equal Center', value: 'equal-center' },
  { label: 'Progressive', value: 'progressive' },
];

export const SmartDistributePanel: React.FC = () => {
  const { state, update, selectedIds, elements, updateElement } = useCanvasStore(
    useShallow((s) => {
      const st = s as DistributeStore;
      return {
        state: st.smartDistribute,
        update: st.updateSmartDistributeState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        updateElement: s.updateElement,
      };
    })
  );

  const handleDistribute = useCallback(() => {
    if (!state || selectedIds.length < 2) return;

    const selectedEls = elements.filter((el: CanvasElement) =>
      selectedIds.includes(el.id) && el.type === 'path'
    );

    const deltas = computeDistribution(selectedEls, {
      mode: state.mode,
      easing: state.easing,
      spacingMode: state.spacingMode,
      progressiveFactor: state.progressiveFactor,
      radialRadius: state.radialRadius,
      radialStartAngle: state.radialStartAngle,
      radialEndAngle: state.radialEndAngle,
      reverseOrder: state.reverseOrder,
    });

    for (const el of selectedEls) {
      const delta = deltas.get(el.id);
      if (!delta || (delta.dx === 0 && delta.dy === 0)) continue;
      if (el.type !== 'path') continue;

      const newSubPaths = el.data.subPaths.map((sp: SubPath) =>
        sp.map((cmd: Command) => {
          if (cmd.type === 'Z') return cmd;
          if (cmd.type === 'M' || cmd.type === 'L') {
            return {
              ...cmd,
              position: { x: cmd.position.x + delta.dx, y: cmd.position.y + delta.dy },
            };
          }
          if (cmd.type === 'C') {
            return {
              ...cmd,
              position: { x: cmd.position.x + delta.dx, y: cmd.position.y + delta.dy },
              controlPoint1: { ...cmd.controlPoint1, x: cmd.controlPoint1.x + delta.dx, y: cmd.controlPoint1.y + delta.dy },
              controlPoint2: { ...cmd.controlPoint2, x: cmd.controlPoint2.x + delta.dx, y: cmd.controlPoint2.y + delta.dy },
            };
          }
          return cmd;
        })
      );

      updateElement(el.id, { data: { ...el.data, subPaths: newSubPaths } });
    }
  }, [state, selectedIds, elements, updateElement]);

  if (!state || !update) return null;

  return (
    <Panel title="Smart Distribute" isCollapsible defaultOpen={false}>
      <CustomSelect
        size="sm"
        placeholder="Distribution Mode"
        value={state.mode}
        onChange={(val) => update({ mode: val as DistributeMode })}
        options={modeOptions}
      />

      <CustomSelect
        size="sm"
        placeholder="Spacing"
        value={state.spacingMode}
        onChange={(val) => update({ spacingMode: val as SpacingMode })}
        options={spacingOptions}
      />

      <CustomSelect
        size="sm"
        placeholder="Easing"
        value={state.easing}
        onChange={(val) => update({ easing: val as EasingType })}
        options={easingOptions}
      />

      {state.spacingMode === 'progressive' && (
        <SliderControl
          label="Progressive Factor"
          value={state.progressiveFactor}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(val) => update({ progressiveFactor: val })}
        />
      )}

      {state.mode === 'radial' && (
        <>
          <SectionHeader title="Radial Settings" />
          <SliderControl
            label="Radius"
            value={state.radialRadius}
            min={20}
            max={500}
            step={5}
            onChange={(val) => update({ radialRadius: val })}
          />
          <SliderControl
            label="Start Angle"
            value={state.radialStartAngle}
            min={0}
            max={360}
            step={5}
            onChange={(val) => update({ radialStartAngle: val })}
            formatter={(v) => `${v}°`}
          />
          <SliderControl
            label="End Angle"
            value={state.radialEndAngle}
            min={0}
            max={360}
            step={5}
            onChange={(val) => update({ radialEndAngle: val })}
            formatter={(v) => `${v}°`}
          />
        </>
      )}

      <PanelToggle
        isChecked={state.reverseOrder}
        onChange={(e) => update({ reverseOrder: e.target.checked })}
      >
        Reverse Order
      </PanelToggle>

      <PanelStyledButton
        onClick={handleDistribute}
        isDisabled={selectedIds.length < 2}
        size="sm"
        width="full"
      >
        Distribute ({selectedIds.length} elements)
      </PanelStyledButton>

      {selectedIds.length < 2 && (
        <Text fontSize="xs" color="gray.500" px={2} py={1}>
          Select at least 2 elements to distribute
        </Text>
      )}
    </Panel>
  );
};

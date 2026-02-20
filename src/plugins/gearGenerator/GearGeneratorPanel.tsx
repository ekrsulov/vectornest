import React, { useCallback } from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { NumberInput } from '../../ui/NumberInput';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { Cog } from 'lucide-react';
import type { GearGeneratorPluginSlice, GearType } from './slice';
import { generateGear } from './gearUtils';

type CombinedStore = CanvasStore & GearGeneratorPluginSlice;

const typeOptions = [
  { value: 'spur', label: 'Spur Gear' },
  { value: 'internal', label: 'Internal Gear' },
  { value: 'star', label: 'Star Gear' },
  { value: 'ratchet', label: 'Ratchet' },
  { value: 'sprocket', label: 'Sprocket' },
];

export const GearGeneratorPanel: React.FC = () => {
  const { gearState, update, addElement } = useCanvasStore(
    useShallow((state) => {
      const s = state as CombinedStore;
      return {
        gearState: s.gearGenerator,
        update: s.updateGearGeneratorState,
        addElement: s.addElement,
      };
    })
  );

  const handleGenerate = useCallback(() => {
    if (!gearState) return;
    const subPaths = generateGear(gearState);
    if (subPaths.length > 0) {
      addElement({
        type: 'path' as const,
        data: {
          subPaths,
          strokeWidth: 1.5,
          strokeColor: '#37474F',
          strokeOpacity: 1,
          fillColor: 'none',
          fillOpacity: 1,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fillRule: 'evenodd',
          strokeDasharray: 'none',
        },
      });
    }
  }, [gearState, addElement]);

  if (!gearState || !update) return null;

  const {
    gearType, teeth, outerRadius, innerRadius, hubRadius,
    toothWidth, rotation, centerX, centerY, showHub, spokes,
  } = gearState;

  const showSpokes = gearType === 'sprocket';

  return (
    <Panel title="Gear Generator" isCollapsible defaultOpen={false}>
      <CustomSelect
        size="sm"
        options={typeOptions}
        value={gearType}
        onChange={(val) => update({ gearType: val as GearType })}
        placeholder="Gear type"
      />

      <SliderControl
        label="Teeth"
        value={teeth}
        min={4}
        max={64}
        step={1}
        onChange={(val) => update({ teeth: val })}
      />

      <SliderControl
        label="Outer Radius"
        value={outerRadius}
        min={30}
        max={250}
        step={1}
        onChange={(val) => update({ outerRadius: val })}
      />

      <SliderControl
        label="Inner Radius"
        value={innerRadius}
        min={15}
        max={200}
        step={1}
        onChange={(val) => update({ innerRadius: val })}
      />

      <SliderControl
        label="Tooth Width"
        value={toothWidth}
        min={0.15}
        max={0.85}
        step={0.05}
        formatter={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(val) => update({ toothWidth: val })}
      />

      <SliderControl
        label="Rotation"
        value={rotation}
        min={0}
        max={360}
        step={1}
        formatter={(v) => `${v}°`}
        onChange={(val) => update({ rotation: val })}
      />

      {showSpokes && (
        <SliderControl
          label="Spokes"
          value={spokes}
          min={3}
          max={12}
          step={1}
          onChange={(val) => update({ spokes: val })}
        />
      )}

      <SectionHeader title="Hub" />

      <PanelToggle
        isChecked={showHub}
        onChange={() => update({ showHub: !showHub })}
      >
        Show hub hole
      </PanelToggle>

      {showHub && (
        <SliderControl
          label="Hub Radius"
          value={hubRadius}
          min={3}
          max={60}
          step={1}
          onChange={(val) => update({ hubRadius: val })}
        />
      )}

      <SectionHeader title="Position" />

      <NumberInput
        label="Center X"
        value={centerX}
        onChange={(val) => update({ centerX: val })}
        step={10}
        min={0}
        max={2000}
      />

      <NumberInput
        label="Center Y"
        value={centerY}
        onChange={(val) => update({ centerY: val })}
        step={10}
        min={0}
        max={2000}
      />

      <PanelActionButton
        icon={Cog}
        label="Generate Gear"
        onClick={handleGenerate}
      />
    </Panel>
  );
};

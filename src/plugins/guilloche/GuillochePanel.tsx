import React, { useCallback } from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { NumberInput } from '../../ui/NumberInput';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { Fingerprint } from 'lucide-react';
import type { GuillochePluginSlice, GuillochePreset } from './slice';
import { generateGuilloche } from './guillocheUtils';

type CombinedStore = CanvasStore & GuillochePluginSlice;

const presetOptions = [
  { value: 'spirograph', label: 'Spirograph' },
  { value: 'epitrochoid', label: 'Epitrochoid' },
  { value: 'rosette', label: 'Rosette' },
  { value: 'wave_guilloche', label: 'Wave Guilloche' },
  { value: 'lissajous', label: 'Lissajous' },
];

export const GuillochePanel: React.FC = () => {
  const { gState, update, addElement } = useCanvasStore(
    useShallow((state) => {
      const s = state as CombinedStore;
      return {
        gState: s.guilloche,
        update: s.updateGuillocheState,
        addElement: s.addElement,
      };
    })
  );

  const handleGenerate = useCallback(() => {
    if (!gState) return;
    const subPaths = generateGuilloche(gState);
    if (subPaths.length > 0) {
      addElement({
        type: 'path' as const,
        data: {
          subPaths,
          strokeWidth: 0.6,
          strokeColor: '#1A237E',
          strokeOpacity: 0.85,
          fillColor: 'none',
          fillOpacity: 1,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fillRule: 'nonzero',
          strokeDasharray: 'none',
        },
      });
    }
  }, [gState, addElement]);

  if (!gState || !update) return null;

  const {
    preset, R, r, d, revolutions, resolution,
    freqX, freqY, phase, layers, layerSpacing,
    centerX, centerY,
  } = gState;

  const showLissajous = preset === 'lissajous';
  const showWaveFreq = preset === 'wave_guilloche' || preset === 'lissajous';

  return (
    <Panel title="Guilloche Pattern" isCollapsible defaultOpen={false}>
      <CustomSelect
        size="sm"
        options={presetOptions}
        value={preset}
        onChange={(val) => update({ preset: val as GuillochePreset })}
        placeholder="Pattern preset"
      />

      <SliderControl
        label="Outer Radius (R)"
        value={R}
        min={20}
        max={300}
        step={1}
        onChange={(val) => update({ R: val })}
      />

      <SliderControl
        label="Inner Radius (r)"
        value={r}
        min={5}
        max={200}
        step={1}
        onChange={(val) => update({ r: val })}
      />

      <SliderControl
        label="Pen Distance (d)"
        value={d}
        min={1}
        max={200}
        step={1}
        onChange={(val) => update({ d: val })}
      />

      <SliderControl
        label="Revolutions"
        value={revolutions}
        min={1}
        max={30}
        step={1}
        onChange={(val) => update({ revolutions: val })}
      />

      <SliderControl
        label="Resolution"
        value={resolution}
        min={50}
        max={600}
        step={10}
        onChange={(val) => update({ resolution: val })}
      />

      {showWaveFreq && (
        <SliderControl
          label="Frequency X"
          value={freqX}
          min={1}
          max={20}
          step={1}
          onChange={(val) => update({ freqX: val })}
        />
      )}

      {showLissajous && (
        <SliderControl
          label="Frequency Y"
          value={freqY}
          min={1}
          max={20}
          step={1}
          onChange={(val) => update({ freqY: val })}
        />
      )}

      {showLissajous && (
        <SliderControl
          label="Phase"
          value={phase}
          min={0}
          max={360}
          step={1}
          formatter={(v) => `${v}°`}
          onChange={(val) => update({ phase: val })}
        />
      )}

      <SectionHeader title="Layers" />

      <SliderControl
        label="Layers"
        value={layers}
        min={1}
        max={12}
        step={1}
        onChange={(val) => update({ layers: val })}
      />

      <SliderControl
        label="Layer Spacing"
        value={layerSpacing}
        min={1}
        max={30}
        step={0.5}
        onChange={(val) => update({ layerSpacing: val })}
      />

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
        icon={Fingerprint}
        label="Generate Guilloche"
        onClick={handleGenerate}
      />
    </Panel>
  );
};

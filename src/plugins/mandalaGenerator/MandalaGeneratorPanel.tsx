import React, { useCallback } from 'react';
import { Flower2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { SectionHeader } from '../../ui/SectionHeader';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { MandalaGeneratorPluginSlice, MandalaLayer } from './slice';
import { generateMandala } from './mandalaUtils';

type StoreWithMandala = CanvasStore & MandalaGeneratorPluginSlice;

const LAYER_OPTIONS: { value: MandalaLayer; label: string }[] = [
  { value: 'petals', label: 'Petals' },
  { value: 'circles', label: 'Circles' },
  { value: 'dots', label: 'Dots' },
  { value: 'waves', label: 'Waves' },
  { value: 'spikes', label: 'Spikes' },
];

export const MandalaGeneratorPanel: React.FC = () => {
  const { state, update, addElement } = useCanvasStore(
    useShallow((s) => {
      const st = s as StoreWithMandala;
      return {
        state: st.mandalaGenerator,
        update: st.updateMandalaGeneratorState,
        addElement: s.addElement,
      };
    })
  );

  const handleGenerate = useCallback(() => {
    if (!state) return;
    const subPaths = generateMandala(state);
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
  }, [state, addElement]);

  const handleRandomize = useCallback(() => {
    if (!update) return;
    update({ seed: Math.floor(Math.random() * 99999) });
  }, [update]);

  if (!state) return null;

  return (
    <Panel
      title="Mandala Generator"
      isCollapsible
      defaultOpen={false}
    >
      <CustomSelect
        size="sm"
        placeholder="Base Layer Style"
        value={state.layerStyle}
        onChange={(val) => update?.({ layerStyle: val as MandalaLayer })}
        options={LAYER_OPTIONS}
      />

      <SliderControl
        label="Segments"
        value={state.segments}
        min={3}
        max={36}
        step={1}
        onChange={(v) => update?.({ segments: v })}
      />

      <SliderControl
        label="Layers"
        value={state.layerCount}
        min={1}
        max={10}
        step={1}
        onChange={(v) => update?.({ layerCount: v })}
      />

      <SliderControl
        label="Radius"
        value={state.radius}
        min={30}
        max={400}
        onChange={(v) => update?.({ radius: v })}
        formatter={(v) => `${v}px`}
      />

      <SliderControl
        label="Curvature"
        value={state.petalCurvature}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => update?.({ petalCurvature: v })}
        formatter={(v) => v.toFixed(2)}
      />

      <SliderControl
        label="Inner Ratio"
        value={state.innerRatio}
        min={0.05}
        max={0.6}
        step={0.01}
        onChange={(v) => update?.({ innerRatio: v })}
        formatter={(v) => v.toFixed(2)}
      />

      <SliderControl
        label="Rotation"
        value={state.rotation}
        min={0}
        max={360}
        onChange={(v) => update?.({ rotation: v })}
        formatter={(v) => `${v}°`}
      />

      <SliderControl
        label="Density"
        value={state.density}
        min={1}
        max={3}
        step={1}
        onChange={(v) => update?.({ density: v })}
      />

      <PanelToggle
        isChecked={state.alternateRotation}
        onChange={(e) => update?.({ alternateRotation: e.target.checked })}
      >
        Alternate Layers
      </PanelToggle>

      <SectionHeader title="Position" />

      <SliderControl
        label="Center X"
        value={state.centerX}
        min={0}
        max={1000}
        onChange={(v) => update?.({ centerX: v })}
      />

      <SliderControl
        label="Center Y"
        value={state.centerY}
        min={0}
        max={1000}
        onChange={(v) => update?.({ centerY: v })}
      />

      <SectionHeader
        title="Randomize"
        actionLabel="Shuffle"
        actionTitle="Random Seed"
        onAction={handleRandomize}
      />

      <SliderControl
        label="Seed"
        value={state.seed}
        min={0}
        max={99999}
        step={1}
        onChange={(v) => update?.({ seed: v })}
      />

      <PanelActionButton
        icon={Flower2}
        label="Generate Mandala"
        onClick={handleGenerate}
      />
    </Panel>
  );
};

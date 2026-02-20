import React, { useCallback } from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { NumberInput } from '../../ui/NumberInput';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { Infinity as InfinityIcon } from 'lucide-react';
import type { CelticKnotPluginSlice, KnotStyle } from './slice';
import { generateCelticKnot } from './celticKnotUtils';

type CombinedStore = CanvasStore & CelticKnotPluginSlice;

const styleOptions = [
  { value: 'basic', label: 'Basic Interlace' },
  { value: 'triquetra', label: 'Triquetra' },
  { value: 'quaternary', label: 'Quaternary' },
  { value: 'ring', label: 'Ring Knot' },
  { value: 'shield', label: 'Shield Knot' },
];

export const CelticKnotPanel: React.FC = () => {
  const { knotState, update, addElement } = useCanvasStore(
    useShallow((state) => {
      const s = state as CombinedStore;
      return {
        knotState: s.celticKnot,
        update: s.updateCelticKnotState,
        addElement: s.addElement,
      };
    })
  );

  const handleGenerate = useCallback(() => {
    if (!knotState) return;
    const subPaths = generateCelticKnot(knotState);
    if (subPaths.length > 0) {
      addElement({
        type: 'path' as const,
        data: {
          subPaths,
          strokeWidth: knotState.strandGap * 0.6,
          strokeColor: '#2E7D32',
          strokeOpacity: 1,
          fillColor: 'none',
          fillOpacity: 1,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fillRule: 'nonzero',
          strokeDasharray: 'none',
        },
      });
    }
  }, [knotState, addElement]);

  if (!knotState || !update) return null;

  const { style, size, loops, strandGap, curvature, rotation, centerX, centerY, rings } = knotState;
  const showLoops = style === 'basic';
  const showRings = style === 'ring';

  return (
    <Panel title="Celtic Knot" isCollapsible defaultOpen={false}>
      <CustomSelect
        size="sm"
        options={styleOptions}
        value={style}
        onChange={(val) => update({ style: val as KnotStyle })}
        placeholder="Knot style"
      />

      <SliderControl
        label="Size"
        value={size}
        min={30}
        max={250}
        step={5}
        onChange={(val) => update({ size: val })}
      />

      {showLoops && (
        <SliderControl
          label="Loops"
          value={loops}
          min={3}
          max={16}
          step={1}
          onChange={(val) => update({ loops: val })}
        />
      )}

      <SliderControl
        label="Strand Gap"
        value={strandGap}
        min={2}
        max={20}
        step={0.5}
        onChange={(val) => update({ strandGap: val })}
      />

      <SliderControl
        label="Curvature"
        value={curvature}
        min={0.1}
        max={1}
        step={0.05}
        formatter={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(val) => update({ curvature: val })}
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

      {showRings && (
        <SliderControl
          label="Rings"
          value={rings}
          min={1}
          max={6}
          step={1}
          onChange={(val) => update({ rings: val })}
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
        icon={InfinityIcon}
        label="Generate Knot"
        onClick={handleGenerate}
      />
    </Panel>
  );
};

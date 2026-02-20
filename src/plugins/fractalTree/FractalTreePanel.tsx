import React, { useCallback } from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { NumberInput } from '../../ui/NumberInput';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { TreePine } from 'lucide-react';
import type { FractalTreePluginSlice } from './slice';
import { generateFractalTree, generateOrganicTree } from './fractalTreeUtils';

type CombinedStore = CanvasStore & FractalTreePluginSlice;

export const FractalTreePanel: React.FC = () => {
  const { treeState, update, addElement } = useCanvasStore(
    useShallow((state) => {
      const s = state as CombinedStore;
      return {
        treeState: s.fractalTree,
        update: s.updateFractalTreeState,
        addElement: s.addElement,
      };
    })
  );

  const [organic, setOrganic] = React.useState(false);

  const handleGenerate = useCallback(() => {
    if (!treeState) return;
    const {
      branchAngle,
      depth,
      trunkLength,
      lengthRatio,
      trunkWidth,
      angleVariation,
      lengthVariation,
      startX,
      startY,
      seed,
    } = treeState;
    const params = {
      branchAngle,
      depth,
      trunkLength,
      lengthRatio,
      angleVariation,
      lengthVariation,
      startX,
      startY,
      seed,
    };

    const subPaths = organic
      ? generateOrganicTree(params)
      : generateFractalTree(params);

    if (subPaths.length > 0) {
      addElement({
        type: 'path' as const,
        data: {
          subPaths,
          strokeWidth: trunkWidth,
          strokeColor: '#5D4037',
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
  }, [treeState, organic, addElement]);

  const handleRandomSeed = useCallback(() => {
    update?.({ seed: Math.floor(Math.random() * 100000) });
  }, [update]);

  if (!treeState || !update) return null;

  const {
    branchAngle,
    depth,
    trunkLength,
    lengthRatio,
    trunkWidth,
    widthTaper,
    angleVariation,
    lengthVariation,
    startX,
    startY,
    seed,
  } = treeState;

  return (
    <Panel title="Fractal Tree" isCollapsible defaultOpen={false}>
      <SliderControl
        label="Branch Angle"
        value={branchAngle}
        min={5}
        max={60}
        step={1}
        formatter={(v) => `${v}°`}
        onChange={(val) => update({ branchAngle: val })}
      />

      <SliderControl
        label="Depth"
        value={depth}
        min={1}
        max={12}
        step={1}
        onChange={(val) => update({ depth: val })}
      />

      <SliderControl
        label="Trunk Length"
        value={trunkLength}
        min={20}
        max={250}
        step={5}
        onChange={(val) => update({ trunkLength: val })}
      />

      <SliderControl
        label="Length Ratio"
        value={lengthRatio}
        min={0.4}
        max={0.95}
        step={0.01}
        formatter={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(val) => update({ lengthRatio: val })}
      />

      <SliderControl
        label="Trunk Width"
        value={trunkWidth}
        min={0.5}
        max={12}
        step={0.5}
        onChange={(val) => update({ trunkWidth: val })}
      />

      <SliderControl
        label="Width Taper"
        value={widthTaper}
        min={0.3}
        max={1}
        step={0.05}
        formatter={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(val) => update({ widthTaper: val })}
      />

      <SectionHeader title="Variation" />

      <SliderControl
        label="Angle Variation"
        value={angleVariation}
        min={0}
        max={1}
        step={0.05}
        formatter={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(val) => update({ angleVariation: val })}
      />

      <SliderControl
        label="Length Variation"
        value={lengthVariation}
        min={0}
        max={1}
        step={0.05}
        formatter={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(val) => update({ lengthVariation: val })}
      />

      <SectionHeader title="Position" />

      <NumberInput
        label="X"
        value={startX}
        onChange={(val) => update({ startX: val })}
        step={10}
        min={0}
        max={1000}
      />

      <NumberInput
        label="Y"
        value={startY}
        onChange={(val) => update({ startY: val })}
        step={10}
        min={0}
        max={1000}
      />

      <NumberInput
        label="Seed"
        value={seed}
        onChange={(val) => update({ seed: val })}
        step={1}
        min={0}
        max={999999}
      />

      <PanelToggle
        isChecked={organic}
        onChange={() => setOrganic(!organic)}
      >
        Organic curves
      </PanelToggle>

      <PanelActionButton
        icon={TreePine}
        label="Random Seed"
        onClick={handleRandomSeed}
      />

      <PanelActionButton
        icon={TreePine}
        label="Generate Tree"
        onClick={handleGenerate}
      />
    </Panel>
  );
};

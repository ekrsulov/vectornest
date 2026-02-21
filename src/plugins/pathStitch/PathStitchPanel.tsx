import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelTextActionButton } from '../../ui/PanelTextActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { PathStitchPluginSlice, StitchStyle } from './slice';
import type { PathData, CanvasElement } from '../../types';
import { generateStitch } from './stitchUtils';

type CombinedStore = CanvasStore & PathStitchPluginSlice;

const styleOptions = [
  { value: 'zigzag', label: 'Zigzag' },
  { value: 'wave', label: 'Wave' },
  { value: 'cross', label: 'Cross Stitch' },
  { value: 'running', label: 'Running Stitch' },
  { value: 'chain', label: 'Chain Stitch' },
  { value: 'spiral', label: 'Spiral' },
];

const modeOptions = [
  { value: 'endpoints', label: 'Nearest Endpoints' },
  { value: 'centroids', label: 'Centroids' },
];

export const PathStitchPanel: React.FC = () => {
  const { stitchState, update, selectedIds, elements, addElement } = useCanvasStore(
    useShallow((state) => {
      const s = state as CombinedStore;
      return {
        stitchState: s.pathStitch,
        update: s.updatePathStitchState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        addElement: s.addElement,
      };
    })
  );

  if (!stitchState || !update) return null;

  const { stitchStyle, stitchWidth, spacing, density, connectionMode } = stitchState;

  const elArr = elements as CanvasElement[];
  const selectedPaths: CanvasElement[] = [];
  for (const id of selectedIds ?? []) {
    const found = elArr.find((e) => e.id === id);
    if (found && found.type === 'path') selectedPaths.push(found);
  }

  const canApply = selectedPaths.length >= 2;

  const handleApply = () => {
    if (!canApply) return;

    // Generate stitches between consecutive pairs
    for (let i = 0; i < selectedPaths.length - 1; i++) {
      const pathA = selectedPaths[i].data as PathData;
      const pathB = selectedPaths[i + 1].data as PathData;

      const stitchSubPaths = generateStitch(
        pathA,
        pathB,
        stitchStyle as StitchStyle,
        stitchWidth,
        spacing,
        density,
        connectionMode as 'endpoints' | 'centroids'
      );

      if (stitchSubPaths.length > 0) {
        addElement({
          type: 'path' as const,
          data: {
            subPaths: stitchSubPaths,
            strokeWidth: 1.5,
            strokeColor: pathA.strokeColor || '#666666',
            strokeOpacity: 0.8,
            fillColor: 'none',
            fillOpacity: 1,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            fillRule: 'nonzero',
            strokeDasharray: 'none',
          },
        });
      }
    }
  };

  return (
    <Panel title="Path Stitch" isCollapsible defaultOpen={false}>
      <CustomSelect
        size="sm"
        options={styleOptions}
        value={stitchStyle}
        onChange={(val) => update({ stitchStyle: val as StitchStyle })}
        placeholder="Stitch style"
      />

      <CustomSelect
        size="sm"
        options={modeOptions}
        value={connectionMode}
        onChange={(val) => update({ connectionMode: val as 'endpoints' | 'centroids' })}
        placeholder="Connection mode"
      />

      <SliderControl
        label="Width"
        value={stitchWidth}
        min={1}
        max={40}
        step={0.5}
        onChange={(val) => update({ stitchWidth: val })}
      />

      <SliderControl
        label="Spacing"
        value={spacing}
        min={1}
        max={30}
        step={0.5}
        onChange={(val) => update({ spacing: val })}
      />

      <SliderControl
        label="Density"
        value={density}
        min={3}
        max={80}
        step={1}
        onChange={(val) => update({ density: val })}
      />

      <PanelToggle
        isChecked={connectionMode === 'centroids'}
        onChange={() =>
          update({ connectionMode: connectionMode === 'centroids' ? 'endpoints' : 'centroids' })
        }
      >
        Connect by centroids
      </PanelToggle>

      <PanelTextActionButton
        label={canApply ? 'Generate Stitch' : 'Select 2+ paths'}
        onClick={handleApply}
        isDisabled={!canApply}
      />
    </Panel>
  );
};

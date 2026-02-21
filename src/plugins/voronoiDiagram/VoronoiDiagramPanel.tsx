import React, { useCallback } from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelTextActionButton } from '../../ui/PanelTextActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { NumberInput } from '../../ui/NumberInput';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { VoronoiDiagramPluginSlice, VoronoiMode, PointDistribution } from './slice';
import { generateVoronoiDiagram } from './voronoiUtils';

type CombinedStore = CanvasStore & VoronoiDiagramPluginSlice;

const modeOptions = [
  { value: 'voronoi', label: 'Voronoi' },
  { value: 'delaunay', label: 'Delaunay' },
  { value: 'both', label: 'Both' },
];

const distOptions = [
  { value: 'random', label: 'Random' },
  { value: 'grid', label: 'Grid' },
  { value: 'hex', label: 'Hexagonal' },
  { value: 'poisson', label: 'Poisson Disk' },
];

export const VoronoiDiagramPanel: React.FC = () => {
  const { state: vState, update, addElement } = useCanvasStore(
    useShallow((state) => {
      const s = state as CombinedStore;
      return {
        state: s.voronoiDiagram,
        update: s.updateVoronoiDiagramState,
        addElement: s.addElement,
      };
    })
  );

  const handleGenerate = useCallback(() => {
    if (!vState) return;
    const {
      pointCount,
      mode,
      distribution,
      width,
      height,
      offsetX,
      offsetY,
      margin,
      seed,
      showSeedPoints,
      jitter,
    } = vState;
    const result = generateVoronoiDiagram({
      pointCount,
      distribution: distribution as PointDistribution,
      width,
      height,
      offsetX,
      offsetY,
      margin,
      seed,
      jitter,
      showSeedPoints,
    });

    const generateMode = mode as VoronoiMode;

    // Generate Voronoi edges
    if ((generateMode === 'voronoi' || generateMode === 'both') && result.voronoiSubPaths.length > 0) {
      addElement({
        type: 'path' as const,
        data: {
          subPaths: result.voronoiSubPaths,
          strokeWidth: 1,
          strokeColor: '#1565C0',
          strokeOpacity: 0.9,
          fillColor: 'none',
          fillOpacity: 1,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fillRule: 'nonzero',
          strokeDasharray: 'none',
        },
      });
    }

    // Generate Delaunay triangulation
    if ((generateMode === 'delaunay' || generateMode === 'both') && result.delaunaySubPaths.length > 0) {
      addElement({
        type: 'path' as const,
        data: {
          subPaths: result.delaunaySubPaths,
          strokeWidth: 0.5,
          strokeColor: '#E65100',
          strokeOpacity: 0.6,
          fillColor: 'none',
          fillOpacity: 1,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fillRule: 'nonzero',
          strokeDasharray: 'none',
        },
      });
    }

    // Generate seed points
    if (showSeedPoints && result.seedSubPaths.length > 0) {
      addElement({
        type: 'path' as const,
        data: {
          subPaths: result.seedSubPaths,
          strokeWidth: 0.5,
          strokeColor: '#333333',
          strokeOpacity: 1,
          fillColor: '#333333',
          fillOpacity: 0.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fillRule: 'nonzero',
          strokeDasharray: 'none',
        },
      });
    }
  }, [vState, addElement]);

  const handleRandomSeed = useCallback(() => {
    update?.({ seed: Math.floor(Math.random() * 100000) });
  }, [update]);

  if (!vState || !update) return null;

  const {
    pointCount,
    mode,
    distribution,
    width,
    height,
    offsetX,
    offsetY,
    margin,
    seed,
    showSeedPoints,
    jitter,
  } = vState;

  return (
    <Panel title="Voronoi Diagram" isCollapsible defaultOpen={false}>
      <CustomSelect
        size="sm"
        options={modeOptions}
        value={mode}
        onChange={(val) => update({ mode: val as VoronoiMode })}
        placeholder="Diagram mode"
      />

      <CustomSelect
        size="sm"
        options={distOptions}
        value={distribution}
        onChange={(val) => update({ distribution: val as PointDistribution })}
        placeholder="Point distribution"
      />

      <SliderControl
        label="Points"
        value={pointCount}
        min={5}
        max={200}
        step={1}
        onChange={(val) => update({ pointCount: val })}
      />

      <SliderControl
        label="Jitter"
        value={jitter}
        min={0}
        max={1}
        step={0.05}
        formatter={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(val) => update({ jitter: val })}
      />

      <SliderControl
        label="Margin"
        value={margin}
        min={0}
        max={50}
        step={1}
        onChange={(val) => update({ margin: val })}
      />

      <SectionHeader title="Dimensions" />

      <NumberInput
        label="Width"
        value={width}
        onChange={(val) => update({ width: val })}
        step={10}
        min={50}
        max={2000}
      />

      <NumberInput
        label="Height"
        value={height}
        onChange={(val) => update({ height: val })}
        step={10}
        min={50}
        max={2000}
      />

      <NumberInput
        label="Offset X"
        value={offsetX}
        onChange={(val) => update({ offsetX: val })}
        step={10}
        min={0}
        max={2000}
      />

      <NumberInput
        label="Offset Y"
        value={offsetY}
        onChange={(val) => update({ offsetY: val })}
        step={10}
        min={0}
        max={2000}
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
        isChecked={showSeedPoints}
        onChange={() => update({ showSeedPoints: !showSeedPoints })}
      >
        Show seed points
      </PanelToggle>

      <PanelTextActionButton
        label="Random Seed"
        variant="secondary"
        onClick={handleRandomSeed}
      />

      <PanelTextActionButton
        label="Generate Diagram"
        onClick={handleGenerate}
      />
    </Panel>
  );
};

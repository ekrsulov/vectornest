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
import { LayoutGrid } from 'lucide-react';
import type { MazeGeneratorPluginSlice, MazeAlgorithm, MazeShape } from './slice';
import { generateMaze } from './mazeUtils';

type CombinedStore = CanvasStore & MazeGeneratorPluginSlice;

const algorithmOptions = [
  { value: 'backtracker', label: 'Recursive Backtracker' },
  { value: 'prims', label: "Prim's Algorithm" },
  { value: 'kruskal', label: "Kruskal's Algorithm" },
  { value: 'binary', label: 'Binary Tree' },
  { value: 'sidewinder', label: 'Sidewinder' },
];

const shapeOptions = [
  { value: 'rectangular', label: 'Rectangular' },
  { value: 'circular', label: 'Circular' },
];

export const MazeGeneratorPanel: React.FC = () => {
  const { mazeState, update, addElement } = useCanvasStore(
    useShallow((state) => {
      const s = state as CombinedStore;
      return {
        mazeState: s.mazeGenerator,
        update: s.updateMazeGeneratorState,
        addElement: s.addElement,
      };
    })
  );

  const handleGenerate = useCallback(() => {
    if (!mazeState) return;
    const {
      cols,
      rows,
      cellSize,
      wallThickness,
      algorithm,
      shape,
      offsetX,
      offsetY,
      seed,
      addOpenings,
      cornerRadius,
    } = mazeState;
    const subPaths = generateMaze({
      cols,
      rows,
      cellSize,
      algorithm: algorithm as MazeAlgorithm,
      shape,
      offsetX,
      offsetY,
      seed,
      addOpenings,
    });

    if (subPaths.length > 0) {
      addElement({
        type: 'path' as const,
        data: {
          subPaths,
          strokeWidth: wallThickness,
          strokeColor: '#222222',
          strokeOpacity: 1,
          fillColor: 'none',
          fillOpacity: 1,
          strokeLinecap: cornerRadius > 0 ? 'round' : 'square',
          strokeLinejoin: cornerRadius > 0 ? 'round' : 'miter',
          fillRule: 'nonzero',
          strokeDasharray: 'none',
        },
      });
    }
  }, [mazeState, addElement]);

  const handleRandomSeed = useCallback(() => {
    update?.({ seed: Math.floor(Math.random() * 100000) });
  }, [update]);

  if (!mazeState || !update) return null;

  const {
    cols,
    rows,
    cellSize,
    wallThickness,
    algorithm,
    shape,
    offsetX,
    offsetY,
    seed,
    addOpenings,
    cornerRadius,
  } = mazeState;

  return (
    <Panel title="Maze Generator" isCollapsible defaultOpen={false}>
      <CustomSelect
        size="sm"
        options={algorithmOptions}
        value={algorithm}
        onChange={(val) => update({ algorithm: val as MazeAlgorithm })}
        placeholder="Algorithm"
      />

      <CustomSelect
        size="sm"
        options={shapeOptions}
        value={shape}
        onChange={(val) => update({ shape: val as MazeShape })}
        placeholder="Shape"
      />

      <SliderControl
        label="Columns"
        value={cols}
        min={3}
        max={40}
        step={1}
        onChange={(val) => update({ cols: val })}
      />

      <SliderControl
        label="Rows"
        value={rows}
        min={3}
        max={40}
        step={1}
        onChange={(val) => update({ rows: val })}
      />

      <SliderControl
        label="Cell Size"
        value={cellSize}
        min={8}
        max={50}
        step={1}
        onChange={(val) => update({ cellSize: val })}
      />

      <SliderControl
        label="Wall Thickness"
        value={wallThickness}
        min={0.5}
        max={8}
        step={0.5}
        onChange={(val) => update({ wallThickness: val })}
      />

      <SliderControl
        label="Corner Radius"
        value={cornerRadius}
        min={0}
        max={10}
        step={0.5}
        onChange={(val) => update({ cornerRadius: val })}
      />

      <SectionHeader title="Position" />

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
        isChecked={addOpenings}
        onChange={() => update({ addOpenings: !addOpenings })}
      >
        Add entrance/exit
      </PanelToggle>

      <PanelActionButton
        icon={LayoutGrid}
        label="Random Seed"
        onClick={handleRandomSeed}
      />

      <PanelActionButton
        icon={LayoutGrid}
        label="Generate Maze"
        onClick={handleGenerate}
      />
    </Panel>
  );
};

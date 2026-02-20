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
import { Box } from 'lucide-react';
import type { IsometricGridPluginSlice, IsoStyle } from './slice';
import { generateIsometricGrid } from './isometricUtils';

type CombinedStore = CanvasStore & IsometricGridPluginSlice;

const styleOptions = [
  { value: 'grid', label: 'Isometric Grid' },
  { value: 'cubes', label: 'Isometric Cubes' },
  { value: 'hexGrid', label: 'Hexagonal Grid' },
  { value: 'triangleGrid', label: 'Triangle Grid' },
  { value: 'diamond', label: 'Diamond Grid' },
];

export const IsometricGridPanel: React.FC = () => {
  const { gridState, update, addElement } = useCanvasStore(
    useShallow((state) => {
      const s = state as CombinedStore;
      return {
        gridState: s.isometricGrid,
        update: s.updateIsometricGridState,
        addElement: s.addElement,
      };
    })
  );

  const handleGenerate = useCallback(() => {
    if (!gridState) return;
    const subPaths = generateIsometricGrid(gridState);
    if (subPaths.length > 0) {
      addElement({
        type: 'path' as const,
        data: {
          subPaths,
          strokeWidth: 1,
          strokeColor: '#455A64',
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
  }, [gridState, addElement]);

  if (!gridState || !update) return null;

  const { style, cols, rows, cellSize, angle, cubeHeight, offsetX, offsetY, alternateShading } = gridState;
  const showAngle = style === 'grid' || style === 'cubes';
  const showCubeHeight = style === 'cubes';

  return (
    <Panel title="Isometric Grid" isCollapsible defaultOpen={false}>
      <CustomSelect
        size="sm"
        options={styleOptions}
        value={style}
        onChange={(val) => update({ style: val as IsoStyle })}
        placeholder="Grid style"
      />

      <SliderControl
        label="Columns"
        value={cols}
        min={2}
        max={30}
        step={1}
        onChange={(val) => update({ cols: val })}
      />

      <SliderControl
        label="Rows"
        value={rows}
        min={2}
        max={30}
        step={1}
        onChange={(val) => update({ rows: val })}
      />

      <SliderControl
        label="Cell Size"
        value={cellSize}
        min={10}
        max={80}
        step={1}
        onChange={(val) => update({ cellSize: val })}
      />

      {showAngle && (
        <SliderControl
          label="Angle"
          value={angle}
          min={15}
          max={45}
          step={1}
          formatter={(v) => `${v}°`}
          onChange={(val) => update({ angle: val })}
        />
      )}

      {showCubeHeight && (
        <SliderControl
          label="Cube Height"
          value={cubeHeight}
          min={0.1}
          max={2}
          step={0.05}
          formatter={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(val) => update({ cubeHeight: val })}
        />
      )}

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

      {showCubeHeight && (
        <PanelToggle
          isChecked={alternateShading}
          onChange={() => update({ alternateShading: !alternateShading })}
        >
          Checkerboard pattern
        </PanelToggle>
      )}

      <PanelActionButton
        icon={Box}
        label="Generate Grid"
        onClick={handleGenerate}
      />
    </Panel>
  );
};

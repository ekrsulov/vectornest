import React from 'react';
import { VStack } from '@chakra-ui/react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { NumberInput } from '../../ui/NumberInput';
import { PanelTextActionButton } from '../../ui/PanelTextActionButton';
import type { GeometricPatternPluginSlice, PatternType } from './slice';
import { generatePattern } from './patternUtils';

export const GeometricPatternPanel: React.FC = () => {
  const patternState = useCanvasStore(
    (state) => (state as unknown as GeometricPatternPluginSlice).geometricPattern
  );
  const updateState = useCanvasStore(
    (state) => (state as unknown as GeometricPatternPluginSlice).updateGeometricPatternState
  );

  const handleGenerate = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    if (!patternState) return;

    const subPaths = generatePattern(patternState);
    if (subPaths.length === 0) return;

    const sysStyle = store.style;

    store.addElement({
      type: 'path' as const,
      data: {
        subPaths,
        strokeWidth: sysStyle.strokeWidth,
        strokeColor: sysStyle.strokeColor,
        strokeOpacity: sysStyle.strokeOpacity,
        fillColor: sysStyle.fillColor,
        fillOpacity: sysStyle.fillOpacity,
        strokeLinecap: sysStyle.strokeLinecap,
        strokeLinejoin: sysStyle.strokeLinejoin,
        fillRule: sysStyle.fillRule,
        strokeDasharray: sysStyle.strokeDasharray,
        opacity: sysStyle.opacity,
      },
    });
  };

  if (!patternState) return null;

  return (
    <Panel title="Geometric Pattern" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        <CustomSelect
          value={patternState.patternType}
          onChange={(v) => updateState?.({ patternType: v as PatternType })}
          options={[
            { value: 'hexagonal', label: 'Hexagonal' },
            { value: 'islamic-star', label: 'Islamic Star' },
            { value: 'penrose', label: 'Penrose Rhombi' },
            { value: 'celtic-knot', label: 'Celtic Knot' },
            { value: 'truchet', label: 'Truchet Tiles' },
            { value: 'chevron', label: 'Chevron' },
          ]}
          size="sm"
        />

        <SliderControl
          label="Columns"
          value={patternState.columns}
          min={1}
          max={20}
          step={1}
          onChange={(v) => updateState?.({ columns: v })}
        />

        <SliderControl
          label="Rows"
          value={patternState.rows}
          min={1}
          max={20}
          step={1}
          onChange={(v) => updateState?.({ rows: v })}
        />

        <SliderControl
          label="Cell size"
          value={patternState.cellSize}
          min={10}
          max={150}
          step={5}
          onChange={(v) => updateState?.({ cellSize: v })}
        />

        {patternState.patternType === 'islamic-star' && (
          <SliderControl
            label="Star points"
            value={patternState.starPoints}
            min={4}
            max={16}
            step={1}
            onChange={(v) => updateState?.({ starPoints: v })}
          />
        )}

        <SliderControl
          label="Line width"
          value={patternState.lineWidth}
          min={0.5}
          max={10}
          step={0.5}
          onChange={(v) => updateState?.({ lineWidth: v })}
        />

        <SliderControl
          label="Rotation"
          value={patternState.rotation}
          min={0}
          max={360}
          step={5}
          formatter={(v) => `${v}°`}
          onChange={(v) => updateState?.({ rotation: v })}
        />

        <NumberInput
          label="Origin X"
          value={patternState.originX}
          onChange={(v) => updateState?.({ originX: v })}
        />

        <NumberInput
          label="Origin Y"
          value={patternState.originY}
          onChange={(v) => updateState?.({ originY: v })}
        />

        <PanelTextActionButton
          label="Generate Pattern"
          onClick={handleGenerate}
        />
      </VStack>
    </Panel>
  );
};

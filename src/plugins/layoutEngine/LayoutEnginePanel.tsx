import React, { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelToggle } from '../../ui/PanelToggle';
import { SectionHeader } from '../../ui/SectionHeader';
import { PanelTextActionButton } from '../../ui/PanelTextActionButton';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { LayoutEnginePluginSlice, LayoutMode } from './slice';
import { computeLayout } from './layoutUtils';
import type { CanvasElement, SubPath, Command } from '../../types';

type LayoutStore = CanvasStore & LayoutEnginePluginSlice;

const MODE_OPTIONS: { value: LayoutMode; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'grid', label: 'Grid' },
  { value: 'wave', label: 'Wave' },
  { value: 'cascade', label: 'Cascade' },
  { value: 'fanOut', label: 'Fan Out' },
  { value: 'pack', label: 'Pack' },
];

export const LayoutEnginePanel: React.FC = () => {
  const { state, update, selectedIds, elements, updateElement } = useCanvasStore(
    useShallow((s) => {
      const st = s as LayoutStore;
      return {
        state: st.layoutEngine,
        update: st.updateLayoutEngineState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        updateElement: s.updateElement,
      };
    })
  );

  const handleApply = useCallback(() => {
    if (!state || selectedIds.length < 2) return;

    const selectedEls = elements.filter((el: CanvasElement) =>
      selectedIds.includes(el.id)
    );

    if (selectedEls.length < 2) return;

    const layout = computeLayout({
      count: selectedEls.length,
      mode: state.mode,
      spacing: state.spacing,
      startAngle: state.startAngle,
      columns: state.columns,
      waveFrequency: state.waveFrequency,
      cascadeX: state.cascadeX,
      cascadeY: state.cascadeY,
      fanSpread: state.fanSpread,
      centerX: state.centerX,
      centerY: state.centerY,
    });

    selectedEls.forEach((el: CanvasElement, i: number) => {
      if (i >= layout.positions.length) return;

      if (el.type === 'path') {
        // Get element center from its subpaths
        const allPts: { x: number; y: number }[] = [];
        el.data.subPaths.forEach((sp: SubPath) => {
          sp.forEach((c: Command) => {
            if (c.type !== 'Z') {
              allPts.push(c.position);
            }
          });
        });
        if (allPts.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of allPts) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }

        const elCx = (minX + maxX) / 2;
        const elCy = (minY + maxY) / 2;

        const dx = layout.positions[i].x - elCx;
        const dy = layout.positions[i].y - elCy;

        // Move the path by translating all subpaths
        const newSubPaths = el.data.subPaths.map((sp: SubPath) =>
          sp.map((cmd: Command) => {
            if (cmd.type === 'Z') return cmd;
            if (cmd.type === 'M' || cmd.type === 'L') {
              return {
                ...cmd,
                position: { x: cmd.position.x + dx, y: cmd.position.y + dy },
              };
            }
            if (cmd.type === 'C') {
              return {
                ...cmd,
                position: { x: cmd.position.x + dx, y: cmd.position.y + dy },
                controlPoint1: { ...cmd.controlPoint1, x: cmd.controlPoint1.x + dx, y: cmd.controlPoint1.y + dy },
                controlPoint2: { ...cmd.controlPoint2, x: cmd.controlPoint2.x + dx, y: cmd.controlPoint2.y + dy },
              };
            }
            return cmd;
          })
        );

        updateElement(el.id, { data: { ...el.data, subPaths: newSubPaths } });
      }
    });
  }, [state, selectedIds, elements, updateElement]);

  if (!state || !update) return null;

  const hasSelection = selectedIds.length >= 2;

  return (
    <Panel
      title="Layout Engine"
      isCollapsible
      defaultOpen={false}
    >
      <CustomSelect
        size="sm"
        placeholder="Layout Mode"
        value={state.mode}
        onChange={(val) => update({ mode: val as LayoutMode })}
        options={MODE_OPTIONS}
      />

      <SliderControl
        label="Spacing"
        value={state.spacing}
        min={20}
        max={500}
        onChange={(v) => update({ spacing: v })}
        formatter={(v) => `${v}px`}
      />

      {(state.mode === 'circle' || state.mode === 'fanOut') && (
        <SliderControl
          label="Start Angle"
          value={state.startAngle}
          min={0}
          max={360}
          onChange={(v) => update({ startAngle: v })}
          formatter={(v) => `${v}°`}
        />
      )}

      {state.mode === 'grid' && (
        <SliderControl
          label="Columns"
          value={state.columns}
          min={2}
          max={12}
          step={1}
          onChange={(v) => update({ columns: v })}
        />
      )}

      {state.mode === 'wave' && (
        <SliderControl
          label="Frequency"
          value={state.waveFrequency}
          min={0.5}
          max={5}
          step={0.5}
          onChange={(v) => update({ waveFrequency: v })}
        />
      )}

      {state.mode === 'cascade' && (
        <>
          <SliderControl
            label="Offset X"
            value={state.cascadeX}
            min={-100}
            max={100}
            onChange={(v) => update({ cascadeX: v })}
            formatter={(v) => `${v}px`}
          />
          <SliderControl
            label="Offset Y"
            value={state.cascadeY}
            min={-100}
            max={100}
            onChange={(v) => update({ cascadeY: v })}
            formatter={(v) => `${v}px`}
          />
        </>
      )}

      {state.mode === 'fanOut' && (
        <SliderControl
          label="Spread"
          value={state.fanSpread}
          min={30}
          max={360}
          onChange={(v) => update({ fanSpread: v })}
          formatter={(v) => `${v}°`}
        />
      )}

      <PanelToggle
        isChecked={state.rotateElements}
        onChange={(e) => update({ rotateElements: e.target.checked })}
      >
        Rotate to Follow Path
      </PanelToggle>

      <SectionHeader title="Center Position" />

      <SliderControl
        label="Center X"
        value={state.centerX}
        min={0}
        max={1000}
        onChange={(v) => update({ centerX: v })}
      />

      <SliderControl
        label="Center Y"
        value={state.centerY}
        min={0}
        max={1000}
        onChange={(v) => update({ centerY: v })}
      />

      <PanelTextActionButton
        label="Apply Layout"
        onClick={handleApply}
        isDisabled={!hasSelection}
      />
    </Panel>
  );
};

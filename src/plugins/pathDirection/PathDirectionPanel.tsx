import React, { useCallback } from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { PathDirectionPluginSlice } from './slice';
import { reverseSubPath } from './directionUtils';
import type { CanvasElement, SubPath } from '../../types';

type DirStore = CanvasStore & PathDirectionPluginSlice;

export const PathDirectionPanel: React.FC = () => {
  const { state, update, selectedIds, elements, updateElement } = useCanvasStore(
    useShallow((s) => {
      const st = s as DirStore;
      return {
        state: st.pathDirection,
        update: st.updatePathDirectionState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        updateElement: s.updateElement,
      };
    })
  );

  const handleReverse = useCallback(() => {
    const selectedPaths = elements.filter(
      (el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path'
    );

    selectedPaths.forEach((el: CanvasElement) => {
      if (el.type !== 'path') return;
      const newSubPaths = el.data.subPaths.map((sp: SubPath) => reverseSubPath(sp));
      updateElement(el.id, { data: { ...el.data, subPaths: newSubPaths } });
    });
  }, [selectedIds, elements, updateElement]);

  if (!state || !update) return null;

  return (
    <Panel
      title="Path Direction"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle path direction"
        />
      }
    >
      {state.enabled && (
        <>
          <PanelToggle
            isChecked={state.showArrows}
            onChange={(e) => update({ showArrows: e.target.checked })}
          >
            Show Direction Arrows
          </PanelToggle>

          <PanelToggle
            isChecked={state.showEndpoints}
            onChange={(e) => update({ showEndpoints: e.target.checked })}
          >
            Show Start/End Points
          </PanelToggle>

          <SliderControl
            label="Arrow Density"
            value={state.arrowDensity}
            min={1}
            max={10}
            step={1}
            onChange={(v) => update({ arrowDensity: v })}
          />

          <SliderControl
            label="Arrow Size"
            value={state.arrowSize}
            min={3}
            max={20}
            onChange={(v) => update({ arrowSize: v })}
            formatter={(v) => `${v}px`}
          />

          <SectionHeader
            title="Actions"
            onAction={handleReverse}
            actionLabel="Reverse"
            actionTitle="Reverse selected path directions"
          />
        </>
      )}
    </Panel>
  );
};

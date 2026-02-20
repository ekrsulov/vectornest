import React from 'react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { TangentVisualizerPluginSlice } from './slice';

type TVStore = CanvasStore & TangentVisualizerPluginSlice;

export const TangentVisualizerPanel: React.FC = () => {
  const { state, update } = useCanvasStore(
    useShallow((s) => {
      const st = s as TVStore;
      return {
        state: st.tangentVisualizer,
        update: st.updateTangentVisualizerState,
      };
    })
  );

  if (!state || !update) return null;

  return (
    <Panel
      title="Tangents"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle tangent visualizer"
        />
      }
    >
      {state.enabled && (
        <>
          <PanelToggle
            isChecked={state.selectedOnly}
            onChange={(e) => update({ selectedOnly: e.target.checked })}
          >
            Selected Only
          </PanelToggle>

          <PanelToggle
            isChecked={state.showTangents}
            onChange={(e) => update({ showTangents: e.target.checked })}
          >
            Tangent Lines
          </PanelToggle>

          <PanelToggle
            isChecked={state.showNormals}
            onChange={(e) => update({ showNormals: e.target.checked })}
          >
            Normal Lines
          </PanelToggle>

          <SliderControl
            label="Line Length"
            value={state.lineLength}
            min={10}
            max={100}
            step={5}
            onChange={(v) => update({ lineLength: v })}
            formatter={(v) => `${v}px`}
          />
        </>
      )}
    </Panel>
  );
};

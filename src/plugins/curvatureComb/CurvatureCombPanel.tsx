import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { CurvatureCombPluginSlice } from './slice';

type CombStore = CanvasStore & CurvatureCombPluginSlice;

export const CurvatureCombPanel: React.FC = () => {
  const { state, update } = useCanvasStore(
    useShallow((s) => {
      const st = s as CombStore;
      return {
        state: st.curvatureComb,
        update: st.updateCurvatureCombState,
      };
    })
  );

  if (!state || !update) return null;

  return (
    <Panel
      title="Curvature Comb"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle curvature comb"
        />
      }
    >
      {state.enabled && (
        <>
          <SliderControl
            label="Comb Scale"
            value={state.combScale}
            min={5}
            max={100}
            onChange={(v) => update({ combScale: v })}
          />

          <SliderControl
            label="Density"
            value={state.density}
            min={4}
            max={32}
            step={1}
            onChange={(v) => update({ density: v })}
          />

          <SectionHeader title="Markers" />

          <PanelToggle
            isChecked={state.showInflections}
            onChange={(e) => update({ showInflections: e.target.checked })}
          >
            Show Inflection Points
          </PanelToggle>

          <PanelToggle
            isChecked={state.showExtrema}
            onChange={(e) => update({ showExtrema: e.target.checked })}
          >
            Show Curvature Extrema
          </PanelToggle>

          <PanelToggle
            isChecked={state.showValues}
            onChange={(e) => update({ showValues: e.target.checked })}
          >
            Show Values
          </PanelToggle>
        </>
      )}
    </Panel>
  );
};

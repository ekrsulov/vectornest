import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { CompositionGuidesPluginSlice, GuideType } from './slice';

type GuidesStore = CanvasStore & CompositionGuidesPluginSlice;

const GUIDE_OPTIONS: { key: GuideType; label: string }[] = [
  { key: 'thirds', label: 'Rule of Thirds' },
  { key: 'golden', label: 'Golden Ratio' },
  { key: 'diagonal', label: 'Diagonal Grid' },
  { key: 'centerCross', label: 'Center Cross' },
  { key: 'phiGrid', label: 'Phi Grid' },
  { key: 'fibonacciSpiral', label: 'Fibonacci Spiral' },
];

export const CompositionGuidesPanel: React.FC = () => {
  const { state, update } = useCanvasStore(
    useShallow((s) => {
      const st = s as GuidesStore;
      return {
        state: st.compositionGuides,
        update: st.updateCompositionGuidesState,
      };
    })
  );

  if (!state || !update) return null;

  const toggleGuide = (guide: GuideType) => {
    const current = state.activeGuides;
    if (current.includes(guide)) {
      update({ activeGuides: current.filter((g) => g !== guide) });
    } else {
      update({ activeGuides: [...current, guide] });
    }
  };

  return (
    <Panel
      title="Composition Guides"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle composition guides"
        />
      }
    >
      {state.enabled && (
        <>
          <SectionHeader title="Guide Types" />

          {GUIDE_OPTIONS.map((opt) => (
            <PanelToggle
              key={opt.key}
              isChecked={state.activeGuides.includes(opt.key)}
              onChange={() => toggleGuide(opt.key)}
            >
              {opt.label}
            </PanelToggle>
          ))}

          <SectionHeader title="Appearance" />

          <SliderControl
            label="Opacity"
            value={state.opacity}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => update({ opacity: v })}
            formatter={(v) => `${Math.round(v * 100)}%`}
          />

          <SectionHeader title="Canvas Size" />

          <SliderControl
            label="Width"
            value={state.canvasWidth}
            min={100}
            max={2000}
            onChange={(v) => update({ canvasWidth: v })}
            formatter={(v) => `${v}px`}
          />

          <SliderControl
            label="Height"
            value={state.canvasHeight}
            min={100}
            max={2000}
            onChange={(v) => update({ canvasHeight: v })}
            formatter={(v) => `${v}px`}
          />
        </>
      )}
    </Panel>
  );
};

import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import type { LassoPluginSlice } from './slice';

export const LassoPanel: React.FC = () => {
  const lassoEnabled = useCanvasStore(s => (s as unknown as LassoPluginSlice).lassoEnabled ?? false);
  const lassoClosed = useCanvasStore(s => (s as unknown as LassoPluginSlice).lassoClosed ?? true);
  const setLassoEnabled = useCanvasStore(s => (s as unknown as LassoPluginSlice).setLassoEnabled);
  const setLassoClosed = useCanvasStore(s => (s as unknown as LassoPluginSlice).setLassoClosed);

  return (
    <Panel
      title="Lasso Selector"
      isCollapsible={lassoEnabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={lassoEnabled}
          onChange={(e) => setLassoEnabled?.(e.target.checked)}
          title="Toggle lasso selection mode"
          aria-label="Toggle lasso selection mode"
        />
      }
    >
      {lassoEnabled && (
        <PanelToggle
          isChecked={lassoClosed}
          onChange={(e) => setLassoClosed?.(e.target.checked)}
        >
          Closed
        </PanelToggle>
      )}
    </Panel>
  );
};

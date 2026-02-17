import React from 'react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { WireframePluginSlice } from './slice';

export const WireframePanel: React.FC = () => {
  const wireframe = useCanvasStore(
    (state) => (state as CanvasStore & WireframePluginSlice).wireframe
  );
  const updateWireframeState = useCanvasStore(
    (state) => (state as CanvasStore & WireframePluginSlice).updateWireframeState
  );

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateWireframeState?.({ enabled: event.target.checked });
  };

  const handleToggleFillMode = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateWireframeState?.({ removeFill: event.target.checked });
  };

  return (
    <Panel
      title="Wireframe"
      isCollapsible={wireframe?.enabled ?? false}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={wireframe?.enabled ?? false}
          onChange={handleToggle}
          aria-label="Toggle wireframe rendering"
        />
      }
    >
      {wireframe?.enabled && (
        <PanelToggle
          isChecked={wireframe?.removeFill ?? true}
          onChange={handleToggleFillMode}
        >
          Hide fills
        </PanelToggle>
      )}
    </Panel>
  );
};

/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import type { PluginSelectorSlice } from '../pluginSelector/slice';

const MinimapPanel = React.lazy(() =>
  import('./MinimapPanel').then((module) => ({ default: module.MinimapPanel }))
);
const MinimapToggle = React.lazy(() =>
  import('./MinimapToggle').then((module) => ({ default: module.MinimapToggle }))
);

const MinimapGlobalOverlay: React.FC = () => {
  const showMinimap = useCanvasStore((state) => state.settings.showMinimap);
  const isWithoutDistractionMode = useCanvasStore(
    (state) => Boolean(state.settings.withoutDistractionMode)
  );
  const enabledPlugins = useCanvasStore(
    (state) => ((state as unknown as PluginSelectorSlice).pluginSelector?.enabledPlugins) ?? []
  );
  const isMinimapPluginEnabled = enabledPlugins.length === 0 || enabledPlugins.includes('minimap');

  if (!showMinimap || isWithoutDistractionMode || !isMinimapPluginEnabled) {
    return null;
  }

  return (
    <React.Suspense fallback={null}>
      <MinimapPanel />
    </React.Suspense>
  );
};

const MinimapSettingsAction: React.FC = () => (
  <React.Suspense fallback={null}>
    <MinimapToggle />
  </React.Suspense>
);

export const minimapPlugin: PluginDefinition<CanvasStore> = {
  id: 'minimap',
  metadata: {
    label: 'Minimap',
    cursor: 'default',
  },
  supportsMobile: false,
  overlays: [
    {
      id: 'minimap-panel',
      placement: 'global',
      component: MinimapGlobalOverlay,
      condition: ({ state }) => {
        const casted = state as CanvasStore & PluginSelectorSlice;
        const enabledPlugins = casted.pluginSelector?.enabledPlugins ?? [];
        const isMinimapPluginEnabled = enabledPlugins.length === 0 || enabledPlugins.includes('minimap');
        return casted.settings.showMinimap &&
          !casted.settings.withoutDistractionMode &&
          isMinimapPluginEnabled;
      },
    },
  ],
  actions: [
    {
      id: 'minimap-settings-toggle',
      placement: 'settings-panel',
      component: MinimapSettingsAction,
    },
  ],
};

import { registerPersistenceContribution } from '../../store/persistenceRegistry';
import type { CanvasStore } from '../../store/canvasStore';
import type { PluginSelectorSlice } from './slice';

type PluginSelectorStore = CanvasStore & PluginSelectorSlice;

registerPersistenceContribution({
  pluginId: 'pluginSelector',
  persistPartialize: (state: CanvasStore) => {
    const pluginSelector = (state as PluginSelectorStore).pluginSelector;
    if (!pluginSelector) return {};
    return {
      pluginSelector: {
        ...pluginSelector,
        isDialogOpen: false,
      },
    };
  },
});

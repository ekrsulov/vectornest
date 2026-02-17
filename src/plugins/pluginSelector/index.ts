import { Settings } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSelectorSlice, type PluginSelectorSlice } from './slice';

type PluginSelectorStore = CanvasStore & PluginSelectorSlice;
import { PluginSelectorDialog } from './PluginSelectorDialog';
import { PluginSelectorAction } from './PluginSelectorAction';
import { pluginManager } from '../../utils/pluginManager';
import './persistence';

const DEFAULT_DISABLED_PLUGIN_IDS = new Set(import.meta.env.DEV ? [] : ['clipboard']);

export const pluginSelectorPlugin: PluginDefinition<CanvasStore> = {
    id: 'pluginSelector',
    metadata: {
        label: 'Plugin Selector',
        icon: Settings,
        cursor: 'default',
    },
    slices: [createPluginSelectorSlice],
    overlays: [
        {
            id: 'pluginSelector-dialog',
            component: PluginSelectorDialog,
            placement: 'global',
        },
    ],
    actions: [
        {
            id: 'pluginSelector-settings-action',
            component: PluginSelectorAction,
            placement: 'settings-panel',
        },
    ],
    init: (context) => {
        // Initialize enabled plugins with all registered plugins
        // Only if not already populated (first time use)
        const state = context.store.getState();
        const psState = (state as PluginSelectorStore).pluginSelector;

        const newState: Partial<PluginSelectorSlice['pluginSelector']> = psState ? { ...psState } : {};
        let hasChanges = false;

        // Only initialize if enabledPlugins is empty or doesn't exist
        if (psState && (!psState.enabledPlugins || psState.enabledPlugins.length === 0)) {
            const allPluginIds = pluginManager
                .getAll()
                .map((p) => p.id)
                .filter((id) => !DEFAULT_DISABLED_PLUGIN_IDS.has(id));
            newState.enabledPlugins = allPluginIds;
            hasChanges = true;
        }

        // Force dialog closed on init to prevent blocking UI (e.g. from persisted state)
        if (psState && psState.isDialogOpen) {
            newState.isDialogOpen = false;
            hasChanges = true;
        }

        if (hasChanges) {
            (context.store.setState as (partial: Partial<CanvasStore>) => void)({
                pluginSelector: newState
            });
        }

        return () => { };
    }
};

import type { PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';

const DEFAULT_DISABLED_PLUGIN_IDS = new Set(import.meta.env.DEV ? [] : ['clipboard']);

export interface PluginSelectorSlice {
    pluginSelector: {
        enabledPlugins: string[];
        isDialogOpen: boolean;
    };
    setPluginEnabled: (pluginId: string, enabled: boolean) => void;
    setPluginSelectorDialogOpen: (isOpen: boolean) => void;
}

type PluginSelectorStore = CanvasStore & PluginSelectorSlice;

export const createPluginSelectorSlice: PluginSliceFactory<CanvasStore> = (set) => ({
    state: {
        pluginSelector: {
            enabledPlugins: [], // Empty means "not initialized yet"; defaults are applied in pluginSelector init.
            isDialogOpen: false,
        },
        setPluginEnabled: (pluginId: string, enabled: boolean) =>
            set((state) => {
                let currentEnabled = (state as PluginSelectorStore).pluginSelector.enabledPlugins;
                
                // If list is empty, initialize with all plugin IDs first
                // This ensures proper tracking when first toggling
                if (currentEnabled.length === 0) {
                    currentEnabled = pluginManager
                        .getAll()
                        .map((p) => p.id)
                        .filter((id) => !DEFAULT_DISABLED_PLUGIN_IDS.has(id));
                }
                
                if (enabled) {
                    // Add to enabled list if not already present
                    if (!currentEnabled.includes(pluginId)) {
                        return {
                            pluginSelector: {
                                ...(state as PluginSelectorStore).pluginSelector,
                                enabledPlugins: [...currentEnabled, pluginId],
                            },
                        } as Partial<CanvasStore>;
                    }
                } else {
                    // Remove from enabled list
                    return {
                        pluginSelector: {
                            ...(state as PluginSelectorStore).pluginSelector,
                            enabledPlugins: currentEnabled.filter((id) => id !== pluginId),
                        },
                    } as Partial<CanvasStore>;
                }
                return state;
            }),
        setPluginSelectorDialogOpen: (isOpen: boolean) =>
            set((state) => ({
                pluginSelector: {
                    ...(state as PluginSelectorStore).pluginSelector,
                    isDialogOpen: isOpen
                },
            } as Partial<CanvasStore>)),
    },
});

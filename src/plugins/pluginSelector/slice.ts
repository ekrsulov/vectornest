import type { PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';

const DEFAULT_DISABLED_PLUGIN_IDS = new Set(import.meta.env.DEV ? [] : ['clipboard']);

export interface PluginSelectorSlice {
    pluginSelector: {
        enabledPlugins: string[];
        knownPluginIds: string[];
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
            knownPluginIds: [],
            isDialogOpen: false,
        },
        setPluginEnabled: (pluginId: string, enabled: boolean) =>
            set((state) => {
                const pluginSelectorState = (state as PluginSelectorStore).pluginSelector;
                let currentEnabled = pluginSelectorState.enabledPlugins;
                let knownPluginIds = pluginSelectorState.knownPluginIds ?? [];
                
                // If state is uninitialized, bootstrap from the currently registered plugins.
                if (currentEnabled.length === 0 || knownPluginIds.length === 0) {
                    const registeredPluginIds = pluginManager
                        .getAll()
                        .map((p) => p.id)
                        .filter((id) => !DEFAULT_DISABLED_PLUGIN_IDS.has(id));
                    if (currentEnabled.length === 0) {
                        currentEnabled = registeredPluginIds;
                    }
                    if (knownPluginIds.length === 0) {
                        knownPluginIds = registeredPluginIds;
                    }
                }

                if (!knownPluginIds.includes(pluginId)) {
                    knownPluginIds = [...knownPluginIds, pluginId];
                }
                
                if (enabled) {
                    // Add to enabled list if not already present
                    if (!currentEnabled.includes(pluginId)) {
                        return {
                            pluginSelector: {
                                ...pluginSelectorState,
                                enabledPlugins: [...currentEnabled, pluginId],
                                knownPluginIds,
                            },
                        } as Partial<CanvasStore>;
                    }
                } else {
                    // Remove from enabled list
                    return {
                        pluginSelector: {
                            ...pluginSelectorState,
                            enabledPlugins: currentEnabled.filter((id) => id !== pluginId),
                            knownPluginIds,
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

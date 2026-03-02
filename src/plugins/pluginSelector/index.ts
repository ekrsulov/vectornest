import React from 'react';
import { Settings } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSelectorSlice, type PluginSelectorSlice } from './slice';
import { pluginManager } from '../../utils/pluginManager';
import './persistence';

type PluginSelectorStore = CanvasStore & PluginSelectorSlice;

const DEFAULT_DISABLED_PLUGIN_IDS = new Set(import.meta.env.DEV ? [] : ['clipboard']);
const PluginSelectorDialog = React.lazy(() =>
    import('./PluginSelectorDialog').then((module) => ({ default: module.PluginSelectorDialog }))
);
const PluginSelectorAction = React.lazy(() =>
    import('./PluginSelectorAction').then((module) => ({ default: module.PluginSelectorAction }))
);

const PluginSelectorGlobalOverlay: React.FC = () => {
    const isDialogOpen = useCanvasStore(
        (state) => ((state as unknown as PluginSelectorSlice).pluginSelector?.isDialogOpen) ?? false
    );

    if (!isDialogOpen) {
        return null;
    }

    return React.createElement(
        React.Suspense,
        { fallback: null },
        React.createElement(PluginSelectorDialog)
    );
};

const PluginSelectorSettingsAction: React.FC = () =>
    React.createElement(
        React.Suspense,
        { fallback: null },
        React.createElement(PluginSelectorAction)
    );

const getRegisteredPluginIds = (): string[] => (
    pluginManager
        .getAll()
        .map((plugin) => plugin.id)
        .filter((id) => !DEFAULT_DISABLED_PLUGIN_IDS.has(id))
);

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
            component: PluginSelectorGlobalOverlay,
            placement: 'global',
            condition: ({ state }) =>
                Boolean((state as PluginSelectorStore).pluginSelector?.isDialogOpen),
        },
    ],
    actions: [
        {
            id: 'pluginSelector-settings-action',
            component: PluginSelectorSettingsAction,
            placement: 'settings-panel',
        },
    ],
    init: (context) => {
        const syncRegisteredPlugins = () => {
            const state = context.store.getState();
            const psState = (state as PluginSelectorStore).pluginSelector;
            if (!psState) {
                return;
            }

            const registeredPluginIds = getRegisteredPluginIds();
            const hadKnownPluginIds = (psState.knownPluginIds?.length ?? 0) > 0;
            const nextKnownPluginIds = hadKnownPluginIds
                ? [...psState.knownPluginIds]
                : Array.from(new Set([...registeredPluginIds, ...psState.enabledPlugins]));
            const nextEnabledPlugins = psState.enabledPlugins.length
                ? [...psState.enabledPlugins]
                : [...registeredPluginIds];

            let hasChanges = false;

            if (!hadKnownPluginIds) {
                hasChanges = true;
            } else {
                registeredPluginIds.forEach((pluginId) => {
                    if (!nextKnownPluginIds.includes(pluginId)) {
                        nextKnownPluginIds.push(pluginId);
                        hasChanges = true;
                        if (!nextEnabledPlugins.includes(pluginId)) {
                            nextEnabledPlugins.push(pluginId);
                        }
                    }
                });
            }

            if (psState.isDialogOpen) {
                hasChanges = true;
            }

            if (!hasChanges) {
                return;
            }

            (context.store.setState as (partial: Partial<CanvasStore>) => void)({
                pluginSelector: {
                    ...psState,
                    enabledPlugins: nextEnabledPlugins,
                    knownPluginIds: nextKnownPluginIds,
                    isDialogOpen: false,
                }
            });
        };

        syncRegisteredPlugins();
        return pluginManager.onPluginRegistrationChange(syncRegisteredPlugins);
    }
};

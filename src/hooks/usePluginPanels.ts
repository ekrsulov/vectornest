import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { pluginManager } from '../utils/pluginManager';
import type { PluginPanelContribution } from '../types/plugins';
import { useEnabledPlugins } from './useEnabledPlugins';

interface PluginPanel {
    id: string;
    component: ComponentType<Record<string, unknown>>;
    order: number;
}

/**
 * Hook to get panels contributed to a specific plugin.
 * Plugins can declare panels that appear in other plugins using the relatedPluginPanels field.
 * Only includes panels from enabled plugins.
 * 
 * @param targetPluginId - The plugin ID to get contributed panels for (e.g., 'edit')
 * @returns Sorted array of panel contributions, ordered by the order field (lower = first)
 * 
 * @example
 * const panels = usePluginPanels('edit');
 * // Render contributed panels
 * panels.map(panel => <panel.component key={panel.id} panelId={panel.id} />)
 */
export function usePluginPanels(targetPluginId: string): PluginPanel[] {
    // Subscribe to enabledPlugins to trigger re-render when plugins are toggled.
    // This is intentionally included in deps even though not directly used in computation -
    // the pluginManager.getRegisteredTools() result changes based on enabled plugins.
    const enabledPlugins = useEnabledPlugins();

    return useMemo(() => {
        const panels: PluginPanel[] = [];

        // Only get panels from enabled plugins
        pluginManager.getRegisteredTools().forEach((plugin) => {
            plugin.relatedPluginPanels?.forEach((panelContrib: PluginPanelContribution) => {
                if (panelContrib.targetPlugin === targetPluginId) {
                    panels.push({
                        id: panelContrib.id,
                        component: panelContrib.component,
                        order: panelContrib.order ?? 999,
                    });
                }
            });
        });

        // Sort by order (lower numbers first)
        panels.sort((a, b) => a.order - b.order);

        return panels;
        // enabledPlugins triggers re-computation when plugins are enabled/disabled
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetPluginId, enabledPlugins]);
}

import type { CanvasStore } from '../../store/canvasStore';
import type { PluginDefinition } from '../../types/plugins';
import type { PluginRegistry } from './PluginRegistry';

export interface PluginToolDefinition {
  mode: string;
  label: string;
  icon?: import('react').ComponentType<{ size?: number }>;
  cursor: string;
  order: number;
  visibility?: 'always-shown' | 'dynamic';
  isDisabled?: (store: CanvasStore) => boolean;
  isVisible?: (store: CanvasStore) => boolean;
}

export function getToolDefinitions(registry: PluginRegistry): PluginToolDefinition[] {
  const tools: PluginToolDefinition[] = [];

  Array.from(registry.values()).forEach((plugin) => {
    if (plugin.toolDefinition) {
      tools.push({
        mode: plugin.id,
        label: plugin.metadata.label,
        icon: plugin.metadata.icon,
        cursor: plugin.metadata.cursor ?? 'default',
        order: plugin.toolDefinition.order,
        visibility: plugin.toolDefinition.visibility,
        isDisabled: plugin.toolDefinition.isDisabled,
        isVisible: plugin.toolDefinition.isVisible,
      });
    }
  });

  return tools.sort((a, b) => a.order - b.order);
}

export function isToolDisabled(
  registry: PluginRegistry,
  toolId: string,
  store: CanvasStore
): boolean {
  const plugin = registry.get(toolId);
  if (!plugin?.toolDefinition?.isDisabled) return false;
  return plugin.toolDefinition.isDisabled(store);
}

export function isToolVisible(
  registry: PluginRegistry,
  toolId: string,
  store: CanvasStore
): boolean {
  const plugin = registry.get(toolId);
  if (!plugin?.toolDefinition?.isVisible) return true;
  return plugin.toolDefinition.isVisible(store);
}

export function getVisibleToolIds(
  registry: PluginRegistry,
  store: CanvasStore,
  isPluginEnabled: (pluginId: string) => boolean
): string[] {
  const visibleIds: string[] = [];
  Array.from(registry.values()).forEach((plugin) => {
    if (!plugin.toolDefinition) return;
    if (isPluginEnabled(plugin.id) && isToolVisible(registry, plugin.id, store)) {
      visibleIds.push(plugin.id);
    }
  });
  return visibleIds.sort();
}

export function getDisabledToolIds(registry: PluginRegistry, store: CanvasStore): string[] {
  const disabledIds: string[] = [];
  Array.from(registry.values()).forEach((plugin) => {
    if (!plugin.toolDefinition) return;
    if (isToolDisabled(registry, plugin.id, store)) {
      disabledIds.push(plugin.id);
    }
  });
  return disabledIds.sort();
}

export function getRegisteredTools(
  registry: PluginRegistry,
  isPluginEnabled: (pluginId: string) => boolean
): Array<PluginDefinition<CanvasStore>> {
  return registry.getAll().filter((plugin) => isPluginEnabled(plugin.id));
}

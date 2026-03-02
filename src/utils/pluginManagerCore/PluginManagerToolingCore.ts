import type React from 'react';
import type {
  PluginDefinition,
  PluginHookContribution,
} from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import {
  getDisabledToolIds,
  getToolDefinitions,
  getRegisteredTools,
  getVisibleToolIds,
  isToolDisabled,
  isToolVisible,
} from '../plugins/ToolVisibilityApi';
import {
  getGlobalPluginHooks,
  getPluginHooks,
} from '../plugins/PluginBehaviorApi';
import { PluginManagerBehaviorCore } from './PluginManagerBehaviorCore';

export abstract class PluginManagerToolingCore extends PluginManagerBehaviorCore {
  getAlwaysShownTools(): string[] {
    return this.tools.getAlwaysShownTools();
  }

  getDynamicTools(): string[] {
    return this.tools.getDynamicTools();
  }

  getAllTools(): string[] {
    return this.tools.getAllTools();
  }

  hasTool(name: string): boolean {
    return this.registry.has(name);
  }

  getCursor(toolName: string): string {
    return this.registry.get(toolName)?.metadata.cursor ?? 'default';
  }

  getRegisteredTools(): Array<PluginDefinition<CanvasStore>> {
    return getRegisteredTools(this.registry, (pluginId) => this.isPluginEnabled(pluginId));
  }

  getPluginHooks(pluginId: string | null): PluginHookContribution[] {
    return getPluginHooks(this.registry, pluginId, (id) => this.isPluginEnabled(id));
  }

  getGlobalPluginHooks(): PluginHookContribution[] {
    return getGlobalPluginHooks(this.registry, (id) => this.isPluginEnabled(id));
  }

  getToolDefinitions(): Array<{
    mode: string;
    label: string;
    icon?: React.ComponentType<{ size?: number }>;
    cursor: string;
    order: number;
    visibility?: 'always-shown' | 'dynamic';
    isDisabled?: (store: CanvasStore) => boolean;
    isVisible?: (store: CanvasStore) => boolean;
  }> {
    return getToolDefinitions(this.registry);
  }

  isToolDisabled(toolId: string, store: CanvasStore): boolean {
    return isToolDisabled(this.registry, toolId, store);
  }

  isToolVisible(toolId: string, store: CanvasStore): boolean {
    return isToolVisible(this.registry, toolId, store);
  }

  getVisibleToolIds(store: CanvasStore): string[] {
    return getVisibleToolIds(this.registry, store, (pluginId) => this.isPluginEnabled(pluginId));
  }

  getDisabledToolIds(store: CanvasStore): string[] {
    return getDisabledToolIds(this.registry, store);
  }
}

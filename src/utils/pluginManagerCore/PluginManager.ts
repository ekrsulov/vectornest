import type React from 'react';
import type {
  CanvasLayerContribution,
  PluginContextFull,
  PluginHookContribution,
} from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { DragModifier, ElementDragModifier, CanvasDecorator } from '../../types/interaction';
import type { Point } from '../../types';
import { UIContributionManager } from '../plugins/UIContributionManager';
import { ShortcutManager } from '../plugins/ShortcutManager';
import {
  getGlobalPluginHooks,
  getPluginHooks,
} from '../plugins/PluginBehaviorApi';
import {
  getDisabledToolIds,
  getToolDefinitions,
  getVisibleToolIds,
  isToolDisabled,
  isToolVisible,
} from '../plugins/ToolVisibilityApi';
import { buildPluginContext } from '../pluginContextBuilder';
import {
  PluginManagerServicesCore,
} from './PluginManagerServicesCore';
import type { PluginManagerOptions } from './PluginManagerBase';

export class PluginManager extends PluginManagerServicesCore {
  constructor(options: PluginManagerOptions = {}) {
    super(options);
  }

  registerCanvasLayers(pluginId: string, layers: CanvasLayerContribution[]): void {
    this.layerManager.registerCanvasLayers(pluginId, layers);
  }

  unregisterCanvasLayers(pluginId: string): void {
    this.layerManager.unregisterCanvasLayers(pluginId);
  }

  getCanvasLayers(): Array<CanvasLayerContribution & { pluginId: string }> {
    return this.layerManager.getCanvasLayers((id) => this.isPluginEnabled(id));
  }

  getPluginProviders(): Array<{
    id: string;
    component: React.ComponentType<{ children: React.ReactNode }>;
  }> {
    return this.uiContributionManager.getPluginProviders();
  }

  getCanvasOverlays(): Array<{
    id: string;
    component: React.ComponentType<{
      viewport: { zoom: number; panX: number; panY: number };
      canvasSize: { width: number; height: number };
    }>;
    condition?: (ctx: {
      viewport: { zoom: number; panX: number; panY: number };
      canvasSize: { width: number; height: number };
      activePlugin: string | null;
    }) => boolean;
  }> {
    return this.uiContributionManager.getCanvasOverlays();
  }

  getActivePlugin(): string | null {
    return this.storeApi?.getState().activePlugin ?? null;
  }

  getUIContributionManager(): UIContributionManager {
    return this.uiContributionManager;
  }

  getShortcutManager(): ShortcutManager {
    return this.shortcutManager;
  }

  executeHandler(
    toolName: string,
    event: React.PointerEvent,
    point: Point,
    target: Element,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    helpers: Record<string, (...args: any[]) => any>
  ): void {
    if (!this.isPluginEnabled(toolName)) {
      return;
    }

    const tool = this.registry.get(toolName);
    if (tool?.handler) {
      const api = this.pluginApis.get(toolName) ?? {};
      const context = buildPluginContext({
        store: this.createPluginApiContext().store,
        api,
        helpers,
        pluginApis: this.pluginApis,
      });
      tool.handler(event, point, target, context);
    }
  }

  protected createPluginContext(pluginId: string): PluginContextFull<CanvasStore> {
    if (!this.contextManager) {
      const api = this.pluginApis.get(pluginId) ?? {};
      return buildPluginContext({
        store: this.createPluginApiContext().store,
        api,
        helpers: {},
        pluginApis: this.pluginApis,
      });
    }

    const context = this.contextManager.createHandlerContext(pluginId);
    context.helpers = this.helpers.getAll();

    return context;
  }

  getExpandablePanel(pluginId: string): React.ComponentType | null {
    return this.registry.get(pluginId)?.expandablePanel ?? null;
  }

  registerDragModifier(modifier: DragModifier): () => void {
    return this.interactionManager.registerDragModifier(modifier);
  }

  getDragModifiers(): DragModifier[] {
    return this.interactionManager.getDragModifiers();
  }

  registerElementDragModifier(modifier: ElementDragModifier): () => void {
    return this.interactionManager.registerElementDragModifier(modifier);
  }

  getElementDragModifiers(): ElementDragModifier[] {
    return this.interactionManager.getElementDragModifiers();
  }

  registerCanvasDecorator(decorator: CanvasDecorator): () => void {
    return this.canvasDecoratorStore.register(decorator);
  }

  getCanvasDecorators(): CanvasDecorator[] {
    return this.canvasDecoratorStore.getAll();
  }

  getCanvasDecoratorsByPlacement(placement: CanvasDecorator['placement']): CanvasDecorator[] {
    return this.canvasDecoratorStore.getByPlacement(placement);
  }

  registerLifecycleAction(
    actionId: string,
    handler: () => void,
    options?: { global?: boolean }
  ): () => void {
    return this.lifecycleCompatibility.registerLifecycleAction(actionId, handler, options);
  }

  executeLifecycleAction(actionId: string): void {
    this.lifecycleCompatibility.executeLifecycleAction(actionId);
  }

  getGlobalTransitionActions(): string[] {
    return this.lifecycleCompatibility.getGlobalTransitionActions();
  }

  getPluginHooks(pluginId: string | null): PluginHookContribution[] {
    return getPluginHooks(this.registry, pluginId);
  }

  getGlobalPluginHooks(): PluginHookContribution[] {
    return getGlobalPluginHooks(this.registry);
  }

  getToolDefinitions(): Array<{
    mode: string;
    label: string;
    icon?: import('react').ComponentType<{ size?: number }>;
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

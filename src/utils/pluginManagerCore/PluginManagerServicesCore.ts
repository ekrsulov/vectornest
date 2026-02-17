import type React from 'react';
import type {
  PluginDefinition,
  PluginActionContribution,
  RendererOverrides,
  PluginRenderBehaviorContext,
  SidebarToolbarButtonContribution,
  PluginSelectionMode,
  SnapOverlayConfig,
} from '../../types/plugins';
import type { PanelConfig } from '../../types/panel';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasEventMap } from '../../canvas/CanvasEventBusContext';
import type { CanvasService, CanvasServiceContext } from '../plugins/CanvasServiceTypes';
import {
  getRegisteredTools,
} from '../plugins/ToolVisibilityApi';
import {
  getRendererOverrides,
  isGlobalUndoRedoDisabled,
  isPluginEnabled,
  notifyColorModeChange,
} from '../plugins/PluginBehaviorApi';
import { logger } from '../logger';
import type { RegisteredSvgStructureContribution } from '../svgStructureContributionRegistry';
import type { RegisteredSvgDefsEditor } from '../svgDefsEditorRegistry';
import { BehaviorFlagsManager } from '../plugins/BehaviorFlagsManager';
import { PluginManagerRegistrationCore } from './PluginManagerRegistrationCore';

export abstract class PluginManagerServicesCore extends PluginManagerRegistrationCore {
  registerCanvasService<TState>(service: CanvasService<TState>): void {
    this.canvasServiceBindings.registerCanvasService(service);
  }

  unregisterCanvasService(serviceId: string): void {
    this.canvasServiceBindings.unregisterCanvasService(serviceId);
  }

  activateCanvasService(serviceId: string, context: CanvasServiceContext): () => void {
    return this.canvasServiceBindings.activateCanvasService(serviceId, context);
  }

  updateCanvasServiceState<TState>(serviceId: string, state: TState): void {
    this.canvasServiceBindings.updateCanvasServiceState(serviceId, state);
  }

  deactivateCanvasService(serviceId: string): void {
    this.canvasServiceBindings.deactivateCanvasService(serviceId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHelper(name: string, helperFn: (...args: any[]) => any): void {
    this.helpers.register(name, helperFn);
  }

  unregisterHelper(name: string): void {
    this.helpers.unregister(name);
  }

  getHelper<T = unknown>(name: string): T | undefined {
    return this.helpers.get<T>(name);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAllHelpers(): Record<string, (...args: any[]) => any> {
    return this.helpers.getAll();
  }

  getAlwaysShownTools(): string[] {
    return this.tools.getAlwaysShownTools();
  }

  getDynamicTools(): string[] {
    return this.tools.getDynamicTools();
  }

  getAllTools(): string[] {
    return this.tools.getAllTools();
  }

  getBehaviorFlagsManager(): BehaviorFlagsManager<CanvasStore> {
    return this.behaviorFlagsManager;
  }

  shouldPreventSelection(): boolean {
    return this.behaviorFlagsManager.shouldPreventSelection();
  }

  shouldPreventSubpathInteraction(): boolean {
    return this.behaviorFlagsManager.shouldPreventSubpathInteraction();
  }

  getActiveSelectionMode(): PluginSelectionMode {
    return this.behaviorFlagsManager.getActiveSelectionMode();
  }

  shouldSkipSubpathMeasurements(): boolean {
    return this.behaviorFlagsManager.shouldSkipSubpathMeasurements();
  }

  shouldShowPointFeedback(): boolean {
    return this.behaviorFlagsManager.shouldShowPointFeedback();
  }

  isInPanMode(): boolean {
    return this.behaviorFlagsManager.isInPanMode();
  }

  isInSidebarPanelMode(): boolean {
    return this.behaviorFlagsManager.isInSidebarPanelMode();
  }

  shouldHideIndividualSelectionOverlays(): boolean {
    return this.behaviorFlagsManager.shouldHideIndividualSelectionOverlays();
  }

  shouldHideSelectionBbox(): boolean {
    return this.behaviorFlagsManager.shouldHideSelectionBbox();
  }

  shouldNotifyOnSelectionChange(): boolean {
    return this.behaviorFlagsManager.shouldNotifyOnSelectionChange();
  }

  shouldClearSubpathsOnElementSelect(): boolean {
    return this.behaviorFlagsManager.shouldClearSubpathsOnElementSelect();
  }

  getActivePluginSnapOverlayConfig(): SnapOverlayConfig | null {
    return this.behaviorFlagsManager.getActivePluginSnapOverlayConfig();
  }

  notifyColorModeChange(prevColorMode: 'light' | 'dark', nextColorMode: 'light' | 'dark'): void {
    notifyColorModeChange({
      prevColorMode,
      nextColorMode,
      storeApi: this.storeApi,
      registry: this.registry,
      isPluginEnabled: (pluginId) => this.isPluginEnabled(pluginId),
    });
  }

  getRendererOverrides(context: PluginRenderBehaviorContext): RendererOverrides {
    return getRendererOverrides({
      storeApi: this.storeApi,
      registry: this.registry,
      isPluginEnabled: (pluginId) => this.isPluginEnabled(pluginId),
      context,
    });
  }

  hasTool(name: string): boolean {
    return this.registry.has(name);
  }

  getPlugin(id: string): PluginDefinition<CanvasStore> | undefined {
    return this.registry.get(id);
  }

  getAll(): PluginDefinition<CanvasStore>[] {
    return this.registry.getAll();
  }

  hasPlugin(pluginId: string): boolean {
    return this.registry.has(pluginId);
  }

  getImporters(): PluginDefinition<CanvasStore>['importers'][] {
    return this.registry.getAll().map((p) => p.importers).filter(Boolean);
  }

  getImportDefHandlers(): NonNullable<PluginDefinition<CanvasStore>['importDefs']>[] {
    return this.registry.getAll().map((p) => p.importDefs).filter((h): h is NonNullable<typeof h> => Boolean(h));
  }

  getStyleAttributeExtractors(): NonNullable<PluginDefinition<CanvasStore>['styleAttributeExtractor']>[] {
    return this.registry.getAll().map((p) => p.styleAttributeExtractor).filter((h): h is NonNullable<typeof h> => Boolean(h));
  }

  registerInteractionHandler<K extends keyof CanvasEventMap>(
    pluginId: string,
    eventType: K,
    handler: (payload: CanvasEventMap[K]) => void
  ): () => void {
    return this.interactionManager.registerInteractionHandler(pluginId, eventType, handler);
  }

  getCursor(toolName: string): string {
    return this.registry.get(toolName)?.metadata.cursor ?? 'default';
  }

  getOverlays(toolName: string): React.ComponentType<Record<string, unknown>>[] {
    return this.uiContributionManager.getOverlays(toolName);
  }

  getGlobalOverlays(): React.ComponentType<Record<string, unknown>>[] {
    return this.uiContributionManager.getGlobalOverlays();
  }

  isPluginEnabled(pluginId: string): boolean {
    return isPluginEnabled(this.storeApi, pluginId);
  }

  getPanels(toolName: string): PanelConfig[] {
    return this.uiContributionManager.getPanels(toolName);
  }

  getSidebarToolbarButtons(): Array<SidebarToolbarButtonContribution & { pluginId: string }> {
    return this.uiContributionManager.getSidebarToolbarButtons();
  }

  getActions(placement: PluginActionContribution['placement']): PluginActionContribution[] {
    return this.uiContributionManager.getActions(placement);
  }

  getRegisteredTools(): Array<PluginDefinition<CanvasStore>> {
    return getRegisteredTools(this.registry, (pluginId) => this.isPluginEnabled(pluginId));
  }

  getSvgStructureContributions(): RegisteredSvgStructureContribution[] {
    return this.contributionAdapter.getSvgStructureContributions((pluginId) =>
      this.isPluginEnabled(pluginId)
    );
  }

  getSvgDefsEditors(): RegisteredSvgDefsEditor[] {
    return this.contributionAdapter.getSvgDefsEditors((pluginId) =>
      this.isPluginEnabled(pluginId)
    );
  }

  isGlobalUndoRedoDisabled(): boolean {
    return isGlobalUndoRedoDisabled({
      storeApi: this.storeApi,
      registry: this.registry,
    });
  }

  getPluginApi<T extends Record<string, (...args: unknown[]) => unknown>>(pluginId: string): T | undefined {
    return this.pluginApis.get(pluginId) as T | undefined;
  }

  callPluginApi<TArgs extends unknown[], TReturn>(
    pluginId: string,
    methodName: string,
    ...args: TArgs
  ): TReturn | undefined {
    const api = this.pluginApis.get(pluginId);
    if (!api || !api[methodName]) {
      logger.warn(`Plugin API method "${methodName}" not found in plugin "${pluginId}"`);
      return undefined;
    }
    return api[methodName](...args) as TReturn;
  }
}

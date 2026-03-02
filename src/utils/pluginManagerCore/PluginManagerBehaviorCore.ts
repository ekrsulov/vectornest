import type {
  RendererOverrides,
  PluginRenderBehaviorContext,
  PluginSelectionMode,
  SnapOverlayConfig,
} from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import {
  getRendererOverrides,
  isGlobalUndoRedoDisabled,
  isPluginEnabled,
  notifyColorModeChange,
} from '../plugins/PluginBehaviorApi';
import { BehaviorFlagsManager } from '../plugins/BehaviorFlagsManager';
import { PluginManagerUiCore } from './PluginManagerUiCore';

export abstract class PluginManagerBehaviorCore extends PluginManagerUiCore {
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

  isPluginEnabled(pluginId: string): boolean {
    return isPluginEnabled(this.storeApi, pluginId);
  }

  isGlobalUndoRedoDisabled(): boolean {
    return isGlobalUndoRedoDisabled({
      storeApi: this.storeApi,
      registry: this.registry,
    });
  }
}

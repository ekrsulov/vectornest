import type React from 'react';
import type {
  PluginActionContribution,
  SidebarToolbarButtonContribution,
} from '../../types/plugins';
import { ShortcutManager } from '../plugins/ShortcutManager';
import { PluginManagerCanvasCore } from './PluginManagerCanvasCore';

export abstract class PluginManagerUiCore extends PluginManagerCanvasCore {
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
      selectedIds: string[];
      selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
      selectedCommands: Array<{ elementId: string; subpathIndex: number; commandIndex: number }>;
      selectedElementsCount: number;
      selectedSubpathsCount: number;
      selectedCommandsCount: number;
      totalElementsCount: number;
      withoutDistractionMode: boolean;
      state: Record<string, unknown>;
    }) => boolean;
  }> {
    return this.uiContributionManager.getCanvasOverlays();
  }

  getGlobalOverlays(): Array<{ id: string; component: React.ComponentType<Record<string, unknown>> }> {
    return this.uiContributionManager.getGlobalOverlays();
  }

  getActivePlugin(): string | null {
    return this.storeApi?.getState().activePlugin ?? null;
  }

  getShortcutManager(): ShortcutManager {
    return this.shortcutManager;
  }

  getExpandablePanel(pluginId: string): React.ComponentType | null {
    return this.registry.get(pluginId)?.expandablePanel ?? null;
  }

  getSidebarToolbarButtons(): Array<SidebarToolbarButtonContribution & { pluginId: string }> {
    return this.uiContributionManager.getSidebarToolbarButtons();
  }

  getActions(placement: PluginActionContribution['placement']): PluginActionContribution[] {
    return this.uiContributionManager.getActions(placement);
  }
}

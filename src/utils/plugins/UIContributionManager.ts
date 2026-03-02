/**
 * UIContributionManager - Centralized management of plugin UI contributions
 *
 * Handles registration and retrieval of:
 * - Sidebar panels
 * - Canvas overlays
 * - Canvas layers
 * - Toolbar buttons
 * - Global overlays
 *
 * This manager consolidates UI contribution logic that was previously
 * scattered across PluginManager methods.
 *
 * @module UIContributionManager
 */

import type React from 'react';
import type {
  PluginDefinition,
  SidebarToolbarButtonContribution,
  PluginActionContribution,
} from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { panelRegistry, initializePanelRegistry } from '../panelRegistry';

/**
 * Registered overlay with resolved ID
 */
export interface RegisteredOverlay {
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
}

/**
 * Registered global overlay with resolved ID
 */
export interface RegisteredGlobalOverlay {
  id: string;
  component: React.ComponentType<Record<string, unknown>>;
}

/**
 * Callback type for checking if a plugin is enabled
 */
type PluginEnabledChecker = (pluginId: string) => boolean;

/**
 * Callback type for getting registered plugins
 */
type PluginGetter = () => PluginDefinition<CanvasStore>[];

/**
 * Callback type for getting store state
 */
type StateGetter = () => CanvasStore | null;

/**
 * Manager for all UI contributions from plugins
 */
export class UIContributionManager {
  private sidebarToolbarButtonContributions = new Map<string, SidebarToolbarButtonContribution[]>();
  private getPlugins: PluginGetter;
  private isPluginEnabled: PluginEnabledChecker;
  private getState: StateGetter;

  constructor(
    getPlugins: PluginGetter,
    isPluginEnabled: PluginEnabledChecker,
    getState: StateGetter
  ) {
    this.getPlugins = getPlugins;
    this.isPluginEnabled = isPluginEnabled;
    this.getState = getState;
  }

  // ─────────────────────────────────────────────────────────────
  // Sidebar Panel Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Register sidebar panels from a plugin into the panel registry.
   * This decouples the sidebar from direct plugin imports.
   */
  registerSidebarPanels(plugin: PluginDefinition<CanvasStore>): void {
    if (!plugin.sidebarPanels?.length) return;

    // Ensure panel registry is initialized
    initializePanelRegistry();

    plugin.sidebarPanels.forEach(panel => {
      const panelKey = `${plugin.id}:${panel.key}`;
      if (panelRegistry.has(panelKey)) return;

      // Determine position: settings-related panels go before documentation
      const docIndex = panelRegistry.getAll().findIndex(p => p.key === 'documentation');
      const isSettingsPanel = panel.condition?.({
        showSettingsPanel: true,
        showFilePanel: false,
        showLibraryPanel: false,
        isInSpecialPanelMode: true,
        activePlugin: '',
        canPerformOpticalAlignment: false,
        selectedSubpathsCount: 0,
        selectedCommandsCount: 0,
        selectedPathsCount: 0,
        selectedElementsCount: 0,
        totalElementsCount: 0,
        hasPathWithMultipleSubpaths: false,
      });
      const position = isSettingsPanel && docIndex >= 0 ? docIndex : 'end';

      panelRegistry.register({
        ...panel,
        key: panelKey,
        pluginId: plugin.id,
      }, position);
    });
  }

  /**
   * Unregister sidebar panels for a plugin
   */
  unregisterSidebarPanels(pluginId: string): void {
    const allPanels = panelRegistry.getAll();
    allPanels
      .filter(p => p.pluginId === pluginId)
      .forEach(p => panelRegistry.unregister(p.key));
  }

  // ─────────────────────────────────────────────────────────────
  // Toolbar Button Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Register toolbar buttons from a plugin
   */
  registerToolbarButtons(pluginId: string, buttons: SidebarToolbarButtonContribution[]): void {
    this.sidebarToolbarButtonContributions.set(pluginId, buttons);
  }

  /**
   * Unregister toolbar buttons for a plugin
   */
  unregisterToolbarButtons(pluginId: string): void {
    this.sidebarToolbarButtonContributions.delete(pluginId);
  }

  /**
   * Get all sidebar toolbar buttons, sorted by order
   */
  getSidebarToolbarButtons(): Array<SidebarToolbarButtonContribution & { pluginId: string }> {
    return Array.from(this.sidebarToolbarButtonContributions.entries())
      .filter(([pluginId]) => this.isPluginEnabled(pluginId))
      .flatMap(([pluginId, contributions]) =>
        contributions.map((contribution) => ({
          ...contribution,
          pluginId,
        }))
      )
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  // ─────────────────────────────────────────────────────────────
  // Overlay Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all global overlays from all plugins
   */
  getGlobalOverlays(): RegisteredGlobalOverlay[] {
    const state = this.getState();
    const activePlugin = state?.activePlugin ?? null;

    return this.getPlugins().flatMap((plugin) => {
      if (!this.isPluginEnabled(plugin.id)) {
        return [];
      }

      return (plugin.overlays?.filter((overlay) => {
        if (!overlay.condition) {
          return true;
        }

        try {
          return overlay.condition({
            activePlugin,
            state: (state ?? {}) as Record<string, unknown>,
          });
        } catch {
          return false;
        }
      }) ?? []).map((overlay) => ({
        id: `${plugin.id}:${overlay.id}`,
        component: overlay.component as React.ComponentType<Record<string, unknown>>,
      }));
    });
  }

  /**
   * Get canvas overlays with conditions
   */
  getCanvasOverlays(): RegisteredOverlay[] {
    const result: RegisteredOverlay[] = [];

    const state = this.getState();
    if (!state) return result;

    const viewport = state.viewport;
    const canvasSize = state.canvasSize;
    const activePlugin = state.activePlugin ?? null;
    const selectedIds = state.selectedIds ?? [];
    const selectedSubpaths = state.selectedSubpaths ?? [];
    const selectedCommands = state.selectedCommands ?? [];
    const totalElementsCount = state.elements?.length ?? 0;
    const withoutDistractionMode = Boolean(state.settings?.withoutDistractionMode);

    const plugins = this.getPlugins();
    for (const plugin of plugins) {
      if (!this.isPluginEnabled(plugin.id)) {
        continue;
      }

      const overlays = plugin.canvasOverlays ?? [];
      for (const overlay of overlays) {
        // Check condition if provided
        if (overlay.condition) {
          const ctx = {
            viewport,
            canvasSize,
            activePlugin,
            selectedIds,
            selectedSubpaths,
            selectedCommands,
            selectedElementsCount: selectedIds.length,
            selectedSubpathsCount: selectedSubpaths.length,
            selectedCommandsCount: selectedCommands.length,
            totalElementsCount,
            withoutDistractionMode,
            state: state as Record<string, unknown>,
          };
          try {
            if (!overlay.condition(ctx)) continue;
          } catch {
            continue;
          }
        }
        result.push({
          id: `${plugin.id}:${overlay.id}`,
          component: overlay.component,
          condition: overlay.condition,
        });
      }
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // Action Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Get actions by placement
   */
  getActions(placement: PluginActionContribution['placement']): PluginActionContribution[] {
    return this.getPlugins()
      .filter(plugin => this.isPluginEnabled(plugin.id))
      .flatMap((plugin) =>
        plugin.actions?.filter((action) => action.placement === placement) ?? []
      );
  }

  // ─────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────

  /**
   * Clean up all registrations for a plugin
   */
  cleanup(pluginId: string): void {
    this.unregisterSidebarPanels(pluginId);
    this.unregisterToolbarButtons(pluginId);
  }

  /**
   * Clear all contributions
   */
  clear(): void {
    this.sidebarToolbarButtonContributions.clear();
  }
}

/**
 * Factory function to create a UIContributionManager
 */
export function createUIContributionManager(
  getPlugins: PluginGetter,
  isPluginEnabled: PluginEnabledChecker,
  getState: StateGetter
): UIContributionManager {
  return new UIContributionManager(getPlugins, isPluginEnabled, getState);
}

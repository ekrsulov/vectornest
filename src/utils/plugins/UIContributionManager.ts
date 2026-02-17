/**
 * UIContributionManager - Centralized management of plugin UI contributions
 *
 * Handles registration and retrieval of:
 * - Sidebar panels
 * - Canvas overlays
 * - Canvas layers
 * - Plugin providers (React context providers)
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
  PluginUIContribution,
  SidebarToolbarButtonContribution,
  PluginActionContribution,
} from '../../types/plugins';
import type { PanelConfig } from '../../types/panel';
import type { CanvasStore } from '../../store/canvasStore';
import { panelRegistry, initializePanelRegistry } from '../panelRegistry';

/**
 * Registered provider with resolved ID
 */
export interface RegisteredProvider {
  id: string;
  component: React.ComponentType<{ children: React.ReactNode }>;
}

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
  }) => boolean;
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
 * Callback type for getting a single plugin by ID (O(1) lookup)
 */
type PluginByIdGetter = (id: string) => PluginDefinition<CanvasStore> | undefined;

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
  private getPluginById: PluginByIdGetter;
  private isPluginEnabled: PluginEnabledChecker;
  private getState: StateGetter;

  constructor(
    getPlugins: PluginGetter,
    isPluginEnabled: PluginEnabledChecker,
    getState: StateGetter,
    getPluginById: PluginByIdGetter
  ) {
    this.getPlugins = getPlugins;
    this.isPluginEnabled = isPluginEnabled;
    this.getState = getState;
    this.getPluginById = getPluginById;
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

  /**
   * Get panels for a specific tool/plugin
   */
  getPanels(toolName: string): PanelConfig[] {
    if (!this.isPluginEnabled(toolName)) return [];
    const plugin = this.getPluginById(toolName);
    return plugin?.sidebarPanels ?? [];
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
   * Get overlays for a specific tool (non-global)
   */
  getOverlays(toolName: string): React.ComponentType<Record<string, unknown>>[] {
    const plugin = this.getPluginById(toolName);
    return plugin?.overlays
      ?.filter((overlay: PluginUIContribution) => overlay.placement !== 'global')
      .map((overlay: PluginUIContribution) => overlay.component as React.ComponentType<Record<string, unknown>>)
      ?? [];
  }

  /**
   * Get all global overlays from all plugins
   */
  getGlobalOverlays(): React.ComponentType<Record<string, unknown>>[] {
    return this.getPlugins()
      .flatMap((plugin) =>
        plugin.overlays?.filter((overlay) => overlay.placement === 'global') ?? []
      )
      .map((overlay) => overlay.component as React.ComponentType<Record<string, unknown>>);
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

    const plugins = this.getPlugins();
    for (const plugin of plugins) {
      const overlays = plugin.canvasOverlays ?? [];
      for (const overlay of overlays) {
        // Check condition if provided
        if (overlay.condition) {
          const ctx = { viewport, canvasSize, activePlugin };
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
  // Provider Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all plugin providers (React context providers)
   */
  getPluginProviders(): RegisteredProvider[] {
    const result: RegisteredProvider[] = [];
    const state = this.getState();
    const activePlugin = state?.activePlugin ?? null;

    const plugins = this.getPlugins();
    for (const plugin of plugins) {
      const providers = plugin.providers ?? [];
      for (const provider of providers) {
        // Evaluate condition if provided
        if (provider.condition) {
          const ctx = { activePlugin };
          if (!provider.condition(ctx)) continue;
        }
        result.push({
          id: `${plugin.id}:${provider.id}`,
          component: provider.component,
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
  getState: StateGetter,
  getPluginById: PluginByIdGetter
): UIContributionManager {
  return new UIContributionManager(getPlugins, isPluginEnabled, getState, getPluginById);
}

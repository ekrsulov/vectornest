/**
 * BehaviorFlagsManager - Centralized behavior flags resolution
 *
 * Extracts all behavior flag related methods from PluginManager into
 * a focused, single-responsibility class.
 *
 * Responsibilities:
 * - Resolve behavior flags for plugins (static or dynamic)
 * - Query active plugin behavior (selection mode, snap usage, etc.)
 * - Aggregate flags across all plugins when needed
 *
 * @module BehaviorFlagsManager
 */

import type { StoreApi } from 'zustand';
import type { PluginDefinition, PluginBehaviorFlags, PluginSelectionMode, SnapOverlayConfig } from '../../types/plugins';

/**
 * Helper to resolve behavior flags from a plugin.
 * Handles both static objects and dynamic functions.
 */
export function resolveBehaviorFlags<TStore extends object>(
  behaviorFlags: PluginDefinition<TStore>['behaviorFlags'],
  state: TStore
): PluginBehaviorFlags {
  if (!behaviorFlags) return {};
  if (typeof behaviorFlags === 'function') {
    return behaviorFlags(state);
  }
  return behaviorFlags;
}

/**
 * Configuration for BehaviorFlagsManager
 */
export interface BehaviorFlagsManagerConfig<TStore extends object> {
  /** Function to get the store API */
  getStoreApi: () => StoreApi<TStore> | null;
  /** Function to get a plugin by ID */
  getPlugin: (id: string) => PluginDefinition<TStore> | undefined;
  /** Function to get all registered plugins */
  getAllPlugins: () => PluginDefinition<TStore>[];
  /** Function to get the active plugin ID from state */
  getActivePluginId: (state: TStore) => string | null;
}

/**
 * Manages behavior flags queries for the plugin system.
 *
 * This class centralizes all behavior flag related logic that was
 * previously scattered across PluginManager methods.
 *
 * @template TStore - The store type (usually CanvasStore)
 */
export class BehaviorFlagsManager<TStore extends object> {
  private config: BehaviorFlagsManagerConfig<TStore>;
  // No aggregate cache — behaviorFlags can be dynamic functions of store state,
  // so we always compute fresh values. The plugin list is small, so this is safe.

  constructor(config: BehaviorFlagsManagerConfig<TStore>) {
    this.config = config;
  }

  /**
   * Get the current state from the store.
   * Returns null if store is not available.
   */
  private getState(): TStore | null {
    const storeApi = this.config.getStoreApi();
    return storeApi ? storeApi.getState() : null;
  }

  /**
   * Get the active plugin definition.
   */
  private getActivePlugin(): PluginDefinition<TStore> | null {
    const state = this.getState();
    if (!state) return null;

    const activePluginId = this.config.getActivePluginId(state);
    if (!activePluginId) return null;

    return this.config.getPlugin(activePluginId) ?? null;
  }

  /**
   * Get resolved behavior flags for the active plugin.
   */
  getActivePluginBehaviorFlags(): PluginBehaviorFlags {
    const state = this.getState();
    if (!state) return {};

    const plugin = this.getActivePlugin();
    if (!plugin) return {};

    return resolveBehaviorFlags(plugin.behaviorFlags, state);
  }

  /**
   * Get resolved behavior flags for a specific plugin.
   */
  getPluginBehaviorFlags(pluginId: string): PluginBehaviorFlags {
    const state = this.getState();
    if (!state) return {};

    const plugin = this.config.getPlugin(pluginId);
    if (!plugin) return {};

    return resolveBehaviorFlags(plugin.behaviorFlags, state);
  }

  // ===== AGGREGATE QUERIES (check ALL plugins) =====

  /**
   * Check if ANY plugin prevents selection.
   * Always computed fresh because behaviorFlags may be dynamic functions of state.
   */
  shouldPreventSelection(): boolean {
    const state = this.getState();
    if (!state) return false;

    for (const plugin of this.config.getAllPlugins()) {
      const flags = resolveBehaviorFlags(plugin.behaviorFlags, state);
      if (flags.preventsSelection) return true;
    }
    return false;
  }

  /**
   * Check if ANY plugin prevents subpath interaction.
   * Always computed fresh because behaviorFlags may be dynamic functions of state.
   */
  shouldPreventSubpathInteraction(): boolean {
    const state = this.getState();
    if (!state) return false;

    for (const plugin of this.config.getAllPlugins()) {
      const flags = resolveBehaviorFlags(plugin.behaviorFlags, state);
      if (flags.preventsSubpathInteraction) return true;
    }
    return false;
  }

  // ===== ACTIVE PLUGIN QUERIES =====

  /**
   * Get the selection mode of the active plugin.
   * @returns The selection mode or 'elements' as default
   */
  getActiveSelectionMode(): PluginSelectionMode {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.selectionMode ?? 'elements';
  }

  /**
   * Check if the active plugin should skip subpath measurements.
   */
  shouldSkipSubpathMeasurements(): boolean {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.skipSubpathMeasurements ?? false;
  }

  /**
   * Check if the active plugin should show point position feedback.
   */
  shouldShowPointFeedback(): boolean {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.showPointFeedback ?? false;
  }

  /**
   * Check if the active plugin is a pan/navigation mode.
   */
  isInPanMode(): boolean {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.isPanMode ?? false;
  }

  /**
   * Check if the active plugin is a sidebar panel mode.
   */
  isInSidebarPanelMode(): boolean {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.isSidebarPanelMode ?? false;
  }

  /**
   * Check if the active plugin wants to hide individual selection overlays.
   */
  shouldHideIndividualSelectionOverlays(): boolean {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.hideSelectionOverlay ?? flags.hideIndividualSelectionOverlays ?? false;
  }

  /**
   * Check if the active plugin wants to hide the selection bounding box.
   */
  shouldHideSelectionBbox(): boolean {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.hideSelectionOverlay ?? flags.hideSelectionBbox ?? false;
  }

  /**
   * Check if the active plugin uses object snap functionality.
   */
  doesActivePluginUseObjectSnap(): boolean {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.usesObjectSnap ?? false;
  }

  /**
   * Check if the active plugin uses measurement snap functionality.
   */
  doesActivePluginUseMeasureSnap(): boolean {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.usesMeasureSnap ?? false;
  }

  /**
   * Check if the active plugin wants to be notified of selection changes.
   */
  shouldNotifyOnSelectionChange(): boolean {
    const flags = this.getActivePluginBehaviorFlags();
    return flags.notifyOnSelectionChange ?? false;
  }

  /**
   * Check if the active plugin should clear subpath selections when selecting elements.
   */
  shouldClearSubpathsOnElementSelect(): boolean {
    const state = this.getState();
    if (!state) return false;

    const plugin = this.getActivePlugin();
    if (!plugin) {
      // Default behavior: clear subpaths only in 'select' mode
      const activePluginId = this.config.getActivePluginId(state);
      return activePluginId === 'select';
    }

    const flags = resolveBehaviorFlags(plugin.behaviorFlags, state);

    // If explicitly set, use that value
    if (flags.clearsSubpathsOnElementSelect !== undefined) {
      return flags.clearsSubpathsOnElementSelect;
    }

    // Default: clear if in elements selection mode
    return flags.selectionMode === 'elements';
  }

  /**
   * Get the snap overlay configuration from the active plugin.
   */
  getActivePluginSnapOverlayConfig(): SnapOverlayConfig | null {
    const flags = this.getActivePluginBehaviorFlags();

    // Only get config if plugin uses snap
    if (!flags.usesObjectSnap && !flags.usesMeasureSnap) return null;

    return flags.getSnapOverlayConfig?.() ?? null;
  }

  // ===== BATCH QUERIES =====

  /**
   * Get all behavior-related info for the active plugin in one call.
   * Useful for components that need multiple flags.
   */
  getActivePluginBehaviorSummary(): {
    selectionMode: PluginSelectionMode;
    preventsSelection: boolean;
    preventsSubpathInteraction: boolean;
    isPanMode: boolean;
    isSidebarPanelMode: boolean;
    hideIndividualSelectionOverlays: boolean;
    hideSelectionBbox: boolean;
    usesObjectSnap: boolean;
    usesMeasureSnap: boolean;
    showPointFeedback: boolean;
    skipSubpathMeasurements: boolean;
  } {
    const flags = this.getActivePluginBehaviorFlags();

    return {
      selectionMode: flags.selectionMode ?? 'elements',
      preventsSelection: flags.preventsSelection ?? false,
      preventsSubpathInteraction: flags.preventsSubpathInteraction ?? false,
      isPanMode: flags.isPanMode ?? false,
      isSidebarPanelMode: flags.isSidebarPanelMode ?? false,
      hideIndividualSelectionOverlays: flags.hideSelectionOverlay ?? flags.hideIndividualSelectionOverlays ?? false,
      hideSelectionBbox: flags.hideSelectionOverlay ?? flags.hideSelectionBbox ?? false,
      usesObjectSnap: flags.usesObjectSnap ?? false,
      usesMeasureSnap: flags.usesMeasureSnap ?? false,
      showPointFeedback: flags.showPointFeedback ?? false,
      skipSubpathMeasurements: flags.skipSubpathMeasurements ?? false,
    };
  }
}

/**
 * Factory function to create a BehaviorFlagsManager.
 */
export function createBehaviorFlagsManager<TStore extends object>(
  config: BehaviorFlagsManagerConfig<TStore>
): BehaviorFlagsManager<TStore> {
  return new BehaviorFlagsManager(config);
}

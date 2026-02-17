// React import removed as it is no longer used for React.lazy
import type { PanelConfig, PanelConditionContext, PanelComponentProps } from '../types/panel';
import { logger } from './logger';

/**
 * Panel Registry - Manages dynamic panel registration.
 * 
 * Allows panels to be registered at runtime rather than requiring
 * static imports at module load time. This enables:
 * - Lazy loading of plugin panels
 * - Dynamic panel registration from plugins
 * - Clean separation between core and plugin panels
 */
class PanelRegistry {
  private panels: Map<string, PanelConfig> = new Map();
  private orderedKeys: string[] = [];
  private initialized = false;

  /**
   * Register a panel configuration.
   * @param config - Panel configuration
   * @param position - Optional position: 'start' | 'end' | number (index)
   */
  register(config: PanelConfig, position: 'start' | 'end' | number = 'end'): void {
    // Prevent duplicate registration
    if (this.panels.has(config.key)) {
      logger.warn(`Panel "${config.key}" is already registered. Skipping.`);
      return;
    }

    this.panels.set(config.key, config);

    // Handle position in ordered list
    if (position === 'start') {
      this.orderedKeys.unshift(config.key);
    } else if (position === 'end') {
      this.orderedKeys.push(config.key);
    } else if (typeof position === 'number') {
      this.orderedKeys.splice(position, 0, config.key);
    }
  }

  /**
   * Register multiple panels at once.
   */
  registerAll(configs: PanelConfig[]): void {
    configs.forEach(config => this.register(config));
  }

  /**
   * Unregister a panel by key.
   */
  unregister(key: string): boolean {
    const deleted = this.panels.delete(key);
    if (deleted) {
      this.orderedKeys = this.orderedKeys.filter(k => k !== key);
    }
    return deleted;
  }

  /**
   * Get a panel configuration by key.
   */
  get(key: string): PanelConfig | undefined {
    return this.panels.get(key);
  }

  /**
   * Get all registered panels in order.
   */
  getAll(): PanelConfig[] {
    return this.orderedKeys
      .map(key => this.panels.get(key))
      .filter((config): config is PanelConfig => config !== undefined);
  }

  /**
   * Get panels filtered by a condition context.
   */
  getVisible(context: PanelConditionContext): PanelConfig[] {
    return this.getAll().filter(config => config.condition(context));
  }

  /**
   * Check if a panel is registered.
   */
  has(key: string): boolean {
    return this.panels.has(key);
  }

  /**
   * Get count of registered panels.
   */
  get size(): number {
    return this.panels.size;
  }

  /**
   * Mark the registry as initialized (after core panels are loaded).
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Check if the registry has been initialized.
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear all registered panels (useful for testing).
   */
  clear(): void {
    this.panels.clear();
    this.orderedKeys = [];
    this.initialized = false;
  }
}

// Singleton instance
export const panelRegistry = new PanelRegistry();

// ============================================================================
// Core Panel Registration
// ============================================================================

import { FilePanel } from '../sidebar/panels/FilePanel';
import { SettingsPanel } from '../sidebar/panels/SettingsPanel';
import { DocumentationPanel } from '../sidebar/panels/DocumentationPanel';
import { SnapPointsPanel } from '../sidebar/panels/SnapPointsPanel';

/**
 * Core panel configurations (static panels always available).
 */
const CORE_PANELS: PanelConfig[] = [
  // Special panels (file and settings)
  {
    key: 'file',
    condition: (ctx) => ctx.showFilePanel,
    component: FilePanel,
  },
  {
    key: 'settings',
    condition: (ctx) => ctx.showSettingsPanel,
    component: SettingsPanel,
  },
  {
    key: 'snap-points',
    condition: (ctx) => ctx.showSettingsPanel,
    component: SnapPointsPanel,
  },
  // Regular panels
];

/**
 * Documentation panel (shown in settings).
 */
const DOCUMENTATION_PANEL: PanelConfig = {
  key: 'documentation',
  condition: (ctx) => ctx.showSettingsPanel,
  component: DocumentationPanel,
};

/**
 * Initialize the panel registry with core panels.
 * Call this once during app startup.
 */
export function initializePanelRegistry(): void {
  if (panelRegistry.isInitialized) {
    return;
  }

  // Register core panels first
  panelRegistry.registerAll(CORE_PANELS);

  // Documentation panel is registered but positioned at the end
  // Plugin panels will be inserted before it
  panelRegistry.register(DOCUMENTATION_PANEL);

  panelRegistry.markInitialized();
}

/**
 * Register panels from a plugin.
 * Should be called after core initialization.
 * 
 * @param pluginId - ID of the plugin registering the panels
 * @param panels - Array of panel configurations
 */
export function registerPluginPanels(pluginId: string, panels: PanelConfig[]): void {
  // Insert plugin panels before documentation panel
  const docIndex = panelRegistry.getAll().findIndex(p => p.key === 'documentation');
  const insertPosition = docIndex >= 0 ? docIndex : 'end';

  panels.forEach((panel, i) => {
    const config: PanelConfig = {
      ...panel,
      key: `${pluginId}:${panel.key}`,
    };

    // Calculate insert position for each panel
    const position = typeof insertPosition === 'number'
      ? insertPosition + i
      : insertPosition;

    panelRegistry.register(config, position);
  });
}

// Type exports for external use
export type { PanelConfig, PanelConditionContext, PanelComponentProps };

/**
 * ShortcutManager - Centralized management of keyboard shortcuts from plugins
 *
 * Handles:
 * - Collection of shortcuts from all registered plugins
 * - Normalization of shortcut definitions
 * - Scope-based shortcut resolution (activePlugin vs global)
 * - Shortcut execution with proper context
 *
 * This manager consolidates shortcut-related logic for plugin shortcuts.
 *
 * @module ShortcutManager
 */

import type {
  PluginDefinition,
  CanvasShortcutMap,
  CanvasShortcutHandler,
  CanvasShortcutDefinition,
  CanvasShortcutContext,
  CanvasShortcutOptions,
} from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { logger } from '../logger';

/**
 * Normalized shortcut entry with resolved properties
 */
export interface NormalizedShortcut {
  /** The shortcut key combination (e.g., 'Mod+Shift+D') */
  key: string;
  /** The handler function */
  handler: CanvasShortcutHandler;
  /** Options for the shortcut */
  options: Required<CanvasShortcutOptions>;
  /** The plugin that registered this shortcut */
  pluginId: string;
  /** The scope of this shortcut */
  scope: 'activePlugin' | 'global';
}

/**
 * Result of attempting to execute a shortcut
 */
export interface ShortcutExecutionResult {
  /** Whether the shortcut was handled */
  handled: boolean;
  /** The plugin that handled the shortcut */
  handledBy?: string;
  /** Whether the default action should be prevented */
  preventDefault: boolean;
  /** Whether propagation should be stopped */
  stopPropagation: boolean;
}

/**
 * Default options for shortcuts
 */
const DEFAULT_SHORTCUT_OPTIONS: Required<CanvasShortcutOptions> = {
  preventDefault: true,
  stopPropagation: false,
  allowWhileTyping: false,
  when: () => true,
};

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
 * Callback type for getting active plugin
 */
type ActivePluginGetter = () => string | null;

/**
 * Manager for keyboard shortcuts from plugins
 */
export class ShortcutManager {
  private getPlugins: PluginGetter;
  private getPluginById: PluginByIdGetter;
  private isPluginEnabled: PluginEnabledChecker;
  private getActivePlugin: ActivePluginGetter;

  /** Cached shortcuts indexed by normalized key for O(1) lookup */
  private shortcutCache: Map<string, NormalizedShortcut[]> | null = null;
  /** All shortcuts cache */
  private allShortcutsCache: NormalizedShortcut[] | null = null;

  constructor(
    getPlugins: PluginGetter,
    isPluginEnabled: PluginEnabledChecker,
    getActivePlugin: ActivePluginGetter,
    getPluginById: PluginByIdGetter
  ) {
    this.getPlugins = getPlugins;
    this.isPluginEnabled = isPluginEnabled;
    this.getActivePlugin = getActivePlugin;
    this.getPluginById = getPluginById;
  }

  /**
   * Invalidate shortcut caches. Call when plugins are registered/unregistered.
   */
  invalidateCache(): void {
    this.shortcutCache = null;
    this.allShortcutsCache = null;
  }

  // ─────────────────────────────────────────────────────────────
  // Shortcut Collection
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all shortcuts from a specific plugin
   */
  getPluginShortcuts(pluginId: string): NormalizedShortcut[] {
    const plugin = this.getPluginById(pluginId);
    if (!plugin || !plugin.keyboardShortcuts) return [];

    return this.normalizeShortcutMap(
      plugin.keyboardShortcuts,
      pluginId,
      plugin.keyboardShortcutScope ?? 'activePlugin'
    );
  }

  /**
   * Get all shortcuts from all enabled plugins (cached)
   */
  getAllShortcuts(): NormalizedShortcut[] {
    if (this.allShortcutsCache) return this.allShortcutsCache;

    const shortcuts: NormalizedShortcut[] = [];

    for (const plugin of this.getPlugins()) {
      if (!this.isPluginEnabled(plugin.id)) continue;
      if (!plugin.keyboardShortcuts) continue;

      const normalized = this.normalizeShortcutMap(
        plugin.keyboardShortcuts,
        plugin.id,
        plugin.keyboardShortcutScope ?? 'activePlugin'
      );
      shortcuts.push(...normalized);
    }

    this.allShortcutsCache = shortcuts;
    return shortcuts;
  }

  /**
   * Get shortcuts applicable to the current context
   * (active plugin shortcuts + global shortcuts)
   */
  getApplicableShortcuts(): NormalizedShortcut[] {
    const activePlugin = this.getActivePlugin();
    const allShortcuts = this.getAllShortcuts();

    return allShortcuts.filter(shortcut => {
      // Global shortcuts are always applicable
      if (shortcut.scope === 'global') return true;
      // Active plugin shortcuts only when plugin is active
      return shortcut.pluginId === activePlugin;
    });
  }

  /**
   * Find shortcuts matching a key combination (uses cached index for O(1) lookup)
   */
  findShortcutsForKey(key: string): NormalizedShortcut[] {
    const normalizedKey = this.normalizeKey(key);
    const activePlugin = this.getActivePlugin();

    // Build & cache key index on first access
    if (!this.shortcutCache) {
      this.shortcutCache = new Map();
      for (const shortcut of this.getAllShortcuts()) {
        const nk = this.normalizeKey(shortcut.key);
        const existing = this.shortcutCache.get(nk);
        if (existing) {
          existing.push(shortcut);
        } else {
          this.shortcutCache.set(nk, [shortcut]);
        }
      }
    }

    const candidates = this.shortcutCache.get(normalizedKey);
    if (!candidates) return [];

    // Filter by scope (same logic as getApplicableShortcuts)
    return candidates.filter(shortcut => {
      if (shortcut.scope === 'global') return true;
      return shortcut.pluginId === activePlugin;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Shortcut Execution
  // ─────────────────────────────────────────────────────────────

  /**
   * Try to execute a shortcut
   */
  executeShortcut(
    key: string,
    event: KeyboardEvent,
    context: CanvasShortcutContext
  ): ShortcutExecutionResult {
    const shortcuts = this.findShortcutsForKey(key);

    // Check if we're in an input field
    const isTyping = this.isTypingContext(event);

    for (const shortcut of shortcuts) {
      // Skip if typing and not allowed while typing
      if (isTyping && !shortcut.options.allowWhileTyping) {
        continue;
      }

      // Check the 'when' condition
      try {
        if (!shortcut.options.when(context, event)) {
          continue;
        }
      } catch {
        continue;
      }

      // Execute the handler
      try {
        shortcut.handler(event, context);
        
        return {
          handled: true,
          handledBy: shortcut.pluginId,
          preventDefault: shortcut.options.preventDefault,
          stopPropagation: shortcut.options.stopPropagation,
        };
      } catch (error) {
        logger.error(`Error executing shortcut ${key} in plugin ${shortcut.pluginId}:`, error);
        continue;
      }
    }

    return {
      handled: false,
      preventDefault: false,
      stopPropagation: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Normalization Helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Normalize a shortcut map into an array of normalized shortcuts
   */
  private normalizeShortcutMap(
    map: CanvasShortcutMap,
    pluginId: string,
    scope: 'activePlugin' | 'global'
  ): NormalizedShortcut[] {
    const shortcuts: NormalizedShortcut[] = [];

    for (const [key, definition] of Object.entries(map)) {
      const normalized = this.normalizeShortcutDefinition(key, definition, pluginId, scope);
      shortcuts.push(normalized);
    }

    return shortcuts;
  }

  /**
   * Normalize a single shortcut definition
   */
  private normalizeShortcutDefinition(
    key: string,
    definition: CanvasShortcutDefinition | CanvasShortcutHandler,
    pluginId: string,
    scope: 'activePlugin' | 'global'
  ): NormalizedShortcut {
    // Handle function shorthand
    if (typeof definition === 'function') {
      return {
        key,
        handler: definition,
        options: { ...DEFAULT_SHORTCUT_OPTIONS },
        pluginId,
        scope,
      };
    }

    // Handle full definition
    return {
      key,
      handler: definition.handler,
      options: {
        ...DEFAULT_SHORTCUT_OPTIONS,
        ...definition.options,
      },
      pluginId,
      scope,
    };
  }

  /**
   * Normalize a key string for comparison
   */
  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .split('+')
      .map(part => part.trim())
      .sort()
      .join('+');
  }

  /**
   * Check if the event target is a text input context
   */
  private isTypingContext(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) return false;

    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') return true;
    if (target.isContentEditable) return true;

    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────

/**
 * Factory function to create a ShortcutManager
 */
export function createShortcutManager(
  getPlugins: PluginGetter,
  isPluginEnabled: PluginEnabledChecker,
  getActivePlugin: ActivePluginGetter,
  getPluginById: PluginByIdGetter
): ShortcutManager {
  return new ShortcutManager(getPlugins, isPluginEnabled, getActivePlugin, getPluginById);
}

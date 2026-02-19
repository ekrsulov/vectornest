/**
 * Shortcut Context Factory
 *
 * Provides factory functions for creating CanvasShortcutContext.
 *
 * Note: CanvasShortcutContext is intentionally separate from PluginContextFull
 * because it serves a different purpose:
 * - PluginContextFull: For plugin callbacks (handlers, lifecycle, etc.)
 * - CanvasShortcutContext: For keyboard shortcut handlers
 *
 * The key differences are:
 * 1. Store API: CanvasShortcutContext uses a read-only subset (no setState)
 * 2. Special properties: eventBus, controller, and svg for keyboard handling
 * 3. Lifetime: Tied to the shortcut registry, not individual plugins
 */

import type { CanvasEventBus } from '../CanvasEventBusContext';
import type { CanvasControllerActions } from '../controller/CanvasControllerContext';
import type { CanvasShortcutContext, CanvasShortcutStoreApi } from '../../types/plugins';

/**
 * Create a CanvasShortcutContext with all required properties.
 * Factory function ensures consistent context creation across the codebase.
 *
 * @param eventBus - The canvas event bus
 * @param controller - The canvas controller
 * @param store - The store API (getState, subscribe)
 * @param svg - Optional SVG element reference
 * @returns A complete CanvasShortcutContext
 */
export function createShortcutContext(
  eventBus: CanvasEventBus,
  controller: CanvasControllerActions,
  store: CanvasShortcutStoreApi,
  svg?: SVGSVGElement | null
): CanvasShortcutContext {
  return {
    eventBus,
    controller,
    store,
    svg: svg ?? null,
  };
}


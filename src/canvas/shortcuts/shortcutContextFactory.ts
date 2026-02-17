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

/**
 * Validate that a CanvasShortcutContext has all required properties.
 * Useful for runtime validation in development or testing.
 *
 * @param context - The context to validate
 * @returns True if valid, false otherwise
 */
export function isValidShortcutContext(context: unknown): context is CanvasShortcutContext {
  if (typeof context !== 'object' || context === null) {
    return false;
  }

  const ctx = context as Partial<CanvasShortcutContext>;

  // Check eventBus
  if (typeof ctx.eventBus !== 'object' || ctx.eventBus === null) {
    return false;
  }

  // Check controller
  if (typeof ctx.controller !== 'object' || ctx.controller === null) {
    return false;
  }

  // Check store
  if (typeof ctx.store !== 'object' || ctx.store === null) {
    return false;
  }
  if (typeof ctx.store.getState !== 'function') {
    return false;
  }
  if (typeof ctx.store.subscribe !== 'function') {
    return false;
  }

  // svg is optional, but if present must be an SVG element or null
  if ('svg' in ctx && ctx.svg !== null && !(ctx.svg instanceof SVGSVGElement)) {
    return false;
  }

  return true;
}

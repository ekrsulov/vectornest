/**
 * PathData Behavior Registry
 * 
 * Provides extension points for path data behaviors that were previously
 * hardcoded to specific plugin properties (like isPencilPath).
 * 
 * This allows plugins to register custom behaviors without polluting
 * the core PathData type with plugin-specific properties.
 */

import type { PathData } from '../types';

/**
 * Behavior handler that can modify path data properties during serialization.
 */
export interface PathDataBehaviorHandler {
  /**
   * Get effective stroke color for a path.
   * Return undefined to use the default (pathData.strokeColor).
   */
  getEffectiveStrokeColor?: (pathData: PathData) => string | undefined;
}

/**
 * Registry of path data behavior handlers.
 * Plugins can register handlers to customize serialization behavior.
 */
const behaviorHandlers: Map<string, PathDataBehaviorHandler> = new Map();

/**
 * Register a path data behavior handler.
 * @param id - Unique identifier for the handler
 * @param handler - The behavior handler
 */
export function registerPathDataBehavior(id: string, handler: PathDataBehaviorHandler): void {
  behaviorHandlers.set(id, handler);
}

/**
 * Unregister a path data behavior handler.
 * @param id - Handler identifier to remove
 */
export function unregisterPathDataBehavior(id: string): void {
  behaviorHandlers.delete(id);
}

/**
 * Get the effective stroke color for a path, applying registered behavior handlers.
 * 
 * Behavior handlers are checked in order. The first handler that returns a
 * non-undefined value is used. Falls back to pathData.strokeColor if no
 * handler provides a value.
 * 
 * This replaces the hardcoded isPencilPath logic:
 * Before: pathData.isPencilPath && pathData.strokeColor === 'none' ? '#000000' : pathData.strokeColor
 * After: getEffectiveStrokeColor(pathData)
 * 
 * @param pathData - The path data to get stroke color for
 * @returns The effective stroke color
 */
export function getEffectiveStrokeColor(pathData: PathData): string {
  // Check registered handlers
  for (const handler of behaviorHandlers.values()) {
    if (handler.getEffectiveStrokeColor) {
      const result = handler.getEffectiveStrokeColor(pathData);
      if (result !== undefined) {
        return result;
      }
    }
  }
  
  // Fallback: legacy isPencilPath behavior for backwards compatibility
  // This can be removed once the pencil plugin registers its own handler
  if (pathData.isPencilPath && pathData.strokeColor === 'none') {
    return '#000000';
  }
  
  return pathData.strokeColor;
}

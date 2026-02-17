/**
 * Deletion Scope Utilities
 * 
 * Centralized logic for determining and executing deletion operations
 * based on current selection state and active plugin's selection mode.
 */

import { pluginManager } from './pluginManager';

export interface DeletionScope {
  type: 'commands' | 'subpaths' | 'elements' | 'none';
  count: number;
}

export interface DeletionHandlers {
  deleteSelectedCommands?: () => void;
  deleteSelectedSubpaths?: () => void;
  deleteSelectedElements: () => void;
}

export interface SelectionState {
  selectedCommandsCount: number;
  selectedSubpathsCount: number;
  selectedElementsCount: number;
  activePlugin?: string | null;
}

/**
 * Determines what should be deleted based on current selection state and active plugin.
 * 
 * Two strategies:
 * - Plugin-aware: Uses activePlugin's selectionMode to determine scope (for UI buttons in specific contexts)
 * - Priority-based: Uses selection count priority (commands > subpaths > elements) for keyboard shortcuts
 * 
 * @param state - Current selection state
 * @param usePluginStrategy - If true, uses activePlugin's selectionMode; if false, uses priority order
 * @returns The deletion scope (what to delete and how many items)
 */
export function getDeletionScope(
  state: SelectionState,
  usePluginStrategy: boolean = false
): DeletionScope {
  if (usePluginStrategy && state.activePlugin) {
    // Plugin-aware strategy: respect the active plugin's selection mode
    const selectionMode = pluginManager.getActiveSelectionMode();
    
    if (selectionMode === 'commands' && state.selectedCommandsCount > 0) {
      return { type: 'commands', count: state.selectedCommandsCount };
    }
    if (selectionMode === 'subpaths' && state.selectedSubpathsCount > 0) {
      return { type: 'subpaths', count: state.selectedSubpathsCount };
    }
    if (selectionMode === 'elements' && state.selectedElementsCount > 0) {
      return { type: 'elements', count: state.selectedElementsCount };
    }
  } else {
    // Priority-based strategy: commands > subpaths > elements
    if (state.selectedCommandsCount > 0) {
      return { type: 'commands', count: state.selectedCommandsCount };
    }
    if (state.selectedSubpathsCount > 0) {
      return { type: 'subpaths', count: state.selectedSubpathsCount };
    }
    if (state.selectedElementsCount > 0) {
      return { type: 'elements', count: state.selectedElementsCount };
    }
  }

  return { type: 'none', count: 0 };
}

/**
 * Executes the deletion based on the determined scope.
 * 
 * @param scope - The deletion scope from getDeletionScope
 * @param handlers - The deletion handler functions
 * @returns true if deletion was executed, false otherwise
 */
export function executeDeletion(
  scope: DeletionScope,
  handlers: DeletionHandlers
): boolean {
  switch (scope.type) {
    case 'commands':
      if (handlers.deleteSelectedCommands) {
        handlers.deleteSelectedCommands();
        return true;
      }
      break;
    case 'subpaths':
      if (handlers.deleteSelectedSubpaths) {
        handlers.deleteSelectedSubpaths();
        return true;
      }
      break;
    case 'elements':
      handlers.deleteSelectedElements();
      return true;
    case 'none':
      return false;
  }
  return false;
}

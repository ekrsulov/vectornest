import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData, Point } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import type { GroupEditorSlice } from './groupEditorSlice';
import { pluginManager } from '../../../utils/pluginManager';
import { applyStylesToGenericData } from '../../../utils/stylePropertyMap';
import {
  moveSelectedElementsWithService,
  type MovementGetState,
  type MovementSetState,
} from '../../../services/MovementService';

export interface SelectionSlice {
  // State
  selectedIds: string[];
  selectionPath: Point[];

  // Actions
  selectElement: (id: string, multiSelect?: boolean) => void;
  selectElements: (ids: string[]) => void;
  selectAllElements: () => void;
  clearSelection: () => void;
  moveSelectedElements: (deltaX: number, deltaY: number, precisionOverride?: number) => void;
  updateSelectedPaths: (properties: Partial<import('../../../types').PathData>) => void;
  setSelectionPath: (path: Point[]) => void;
  clearSelectionPath: () => void;
}

/** Notify plugins that selection has changed, if the active plugin requests it. */
const notifySelectionChanged = () => {
  if (pluginManager.shouldNotifyOnSelectionChange()) {
    queueMicrotask(() => {
      pluginManager.executeLifecycleAction('onSelectionChanged');
    });
  }
};

/**
 * Auto-enter group editor when selecting a child element that belongs to a group.
 * Extracted from selectElement to reduce slice complexity.
 */
const autoEnterGroupEditorIfNeeded = (state: CanvasStore & GroupEditorSlice, elementId: string): void => {
  if (state.selectedIds.length !== 1 || state.selectedIds[0] !== elementId) return;

  const elementMap = getCachedElementMap(state.elements);

  const selectedElement = elementMap.get(elementId);
  if (!selectedElement || selectedElement.type === 'group' || !selectedElement.parentId) return;

  const groupEditor = state.groupEditor;
  const activeGroupId = groupEditor.isEditing && groupEditor.activeGroupId ? groupEditor.activeGroupId : null;

  let current: CanvasElement | undefined = selectedElement;
  let topMost: CanvasElement = selectedElement;
  const visited = new Set<string>();
  let isWithinActiveGroup = false;

  while (current?.parentId) {
    if (visited.has(current.parentId)) break;
    visited.add(current.parentId);

    if (activeGroupId && current.parentId === activeGroupId) {
      isWithinActiveGroup = true;
    }

    const parent = elementMap.get(current.parentId);
    if (!parent) break;

    topMost = parent;
    current = parent;
  }

  const rootGroupId = topMost.type === 'group' ? topMost.id : null;
  if (rootGroupId && !isWithinActiveGroup && activeGroupId !== rootGroupId) {
    state.enterGroupEditor(rootGroupId);
  }
};

// Module-level cached element map to avoid O(n) reconstruction on every selection click.
// Invalidated by reference equality on the elements array.
let _cachedElements: CanvasElement[] | null = null;
let _cachedElementMap: Map<string, CanvasElement> = new Map();

const getCachedElementMap = (elements: CanvasElement[]): Map<string, CanvasElement> => {
  if (_cachedElements !== elements) {
    _cachedElements = elements;
    _cachedElementMap = new Map<string, CanvasElement>();
    elements.forEach((el) => _cachedElementMap.set(el.id, el));
  }
  return _cachedElementMap;
};

export const createSelectionSlice: StateCreator<CanvasStore, [], [], SelectionSlice> = (set, get, _api) => ({
  // Initial state
  selectedIds: [],
  selectionPath: [],

  // Actions
  selectElement: (id, multiSelect = false) => {
    set((state) => {
      const fullState = state as CanvasStore;

      // Use cached element map for O(1) lookups
      const elementMap = getCachedElementMap(fullState.elements);

      // Clear subpath selection when selecting a different path.
      const shouldClearSubpaths = pluginManager.shouldClearSubpathsOnElementSelect();
      let clearSubpaths = false;
      if (shouldClearSubpaths && !multiSelect) {
        const currentlySelectedPaths = fullState.selectedIds.filter((selId: string) => {
          const element = elementMap.get(selId);
          return element && element.type === 'path';
        });

        const newElement = elementMap.get(id);
        const isSelectingDifferentPath = newElement && newElement.type === 'path' &&
          currentlySelectedPaths.length > 0 && !currentlySelectedPaths.includes(id);

        if (isSelectingDifferentPath) {
          clearSubpaths = true;
        }
      }

      const targetElement = elementMap.get(id);
      if (!targetElement) {
        return { selectedIds: state.selectedIds };
      }

      if (fullState.isElementHidden && fullState.isElementHidden(targetElement.id)) {
        return { selectedIds: state.selectedIds };
      }

      if (fullState.isElementLocked && fullState.isElementLocked(targetElement.id)) {
        return { selectedIds: state.selectedIds };
      }

      const result: Partial<CanvasStore> = {
        selectedIds: multiSelect
          ? state.selectedIds.includes(id)
            ? state.selectedIds.filter((selId: string) => selId !== id)
            : [...state.selectedIds, id]
          : [id],
      };

      if (clearSubpaths) {
        result.selectedSubpaths = [];
      }

      return result;
    });

    if (!multiSelect) {
      autoEnterGroupEditorIfNeeded(get() as CanvasStore & GroupEditorSlice, id);
    }

    // Notify plugins that selection has changed
    notifySelectionChanged();
  },

  selectElements: (ids) => {
    const state = get() as CanvasStore;
    // Use cached element map for O(1) lookups
    const elementMap = getCachedElementMap(state.elements);

    const filteredIds = ids.filter((id) => {
      const element = elementMap.get(id);
      if (!element) return false;
      if (state.isElementHidden && state.isElementHidden(id)) return false;
      if (state.isElementLocked && state.isElementLocked(id)) return false;
      return true;
    });
    set({ selectedIds: filteredIds });

    // Notify plugins that selection has changed
    notifySelectionChanged();
  },

  selectAllElements: () => {
    const state = get() as CanvasStore;
    const allIds = state.elements
      .filter((el: CanvasElement) => {
        if (state.isElementHidden && state.isElementHidden(el.id)) {
          return false;
        }
        if (state.isElementLocked && state.isElementLocked(el.id)) {
          return false;
        }
        return true;
      })
      .map((el: CanvasElement) => el.id);
    set({ selectedIds: allIds });

    // Notify plugins that selection has changed
    notifySelectionChanged();
  },

  clearSelection: () => {
    set({ selectedIds: [] });

    // Notify plugins that selection has changed
    notifySelectionChanged();
  },

  moveSelectedElements: (deltaX, deltaY, precisionOverride) => {
    moveSelectedElementsWithService({
      deltaX,
      deltaY,
      precisionOverride,
      setState: set as MovementSetState,
      getState: get as MovementGetState,
    });
  },

  updateSelectedPaths: (properties) => {
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((currentState) => {
      const selectedSet = new Set(currentState.selectedIds);
      return {
        elements: currentState.elements.map((el: CanvasElement) => {
          if (!selectedSet.has(el.id)) {
            return el;
          }

        // Paths keep existing behavior
        if (el.type === 'path') {
          const pathData = el.data as PathData;
          return {
            ...el,
            data: {
              ...pathData,
              ...properties,
            },
          };
        }

        // Generic elements: apply style-like properties when present
        const data = el.data as Record<string, unknown>;
        const updatedData = applyStylesToGenericData(data, properties as Record<string, unknown>);
        return { ...el, data: updatedData as CanvasElement['data'] };
      }),
    };
    });
  },

  setSelectionPath: (path) => {
    set({ selectionPath: path });
  },

  clearSelectionPath: () => {
    set({ selectionPath: [] });
  },
});

import type { StateCreator } from 'zustand';
import type { CanvasElement, CanvasElementInput, GroupElement, PathElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { defsContributionRegistry } from '../../../utils/defsContributionRegistry';
import { exportSelection } from '../../../utils/exportUtils';
import { generateShortId } from '../../../utils/idGenerator';
import { loadDocumentFromFilePicker, saveDocumentToFile } from '../../../services/DocumentService';
import { DEFAULT_MODE } from '../../../constants';
import { logger } from '../../../utils/logger';
import { deleteElementsBatch } from './baseSliceDeletion';
import type { BaseSlice } from './baseSliceTypes';
import { resolveExportChainDelays, type AnimationStatePreparationHost } from '../../../utils/animationStatePreparation';

type BaseSet = Parameters<StateCreator<BaseSlice>>[0];
type BaseGet = Parameters<StateCreator<BaseSlice>>[1];

const exportAs = (get: BaseGet, format: 'svg' | 'png', selectedOnly: boolean) => {
  const state = get() as CanvasStore;
  const elementsToExport = selectedOnly
    ? (() => { const s = new Set(state.selectedIds); return state.elements.filter((element) => s.has(element.id)); })()
    : state.elements;
  const defs = defsContributionRegistry.serializeDefs(state, elementsToExport);
  exportSelection(
    format,
    state.elements,
    state.selectedIds,
    state.documentName,
    selectedOnly,
    state.settings.exportPadding,
    defs,
    state
  );
};

export const createBaseSliceActions = (
  set: BaseSet,
  get: BaseGet,
  applyModeTransition: (requestedMode: string) => void
) => ({
  addElement: (element: CanvasElementInput, explicitZIndex?: number): string => {
    const id = generateShortId('el');
    const parentId = element.parentId ?? null;
    const existingElements = get().elements;
    let zIndex: number;
    if (explicitZIndex !== undefined) {
      zIndex = explicitZIndex;
    } else {
      let siblingCount = 0;
      for (const existingElement of existingElements) {
        if (parentId ? existingElement.parentId === parentId : !existingElement.parentId) {
          siblingCount++;
        }
      }
      zIndex = siblingCount;
    }

    let newElement: CanvasElement;
    if (element.type === 'group') {
      const groupData = (element as GroupElement).data;
      newElement = {
        id,
        type: 'group',
        parentId,
        zIndex,
        data: {
          ...groupData,
          transform: groupData.transform ?? {
            translateX: 0,
            translateY: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        },
      };
    } else if (element.type === 'path') {
      newElement = {
        id,
        type: 'path',
        parentId,
        zIndex,
        data: (element as CanvasElement).data as import('../../../types').PathData,
      };
    } else {
      newElement = {
        id,
        type: element.type,
        parentId,
        zIndex,
        data: (element as CanvasElement).data,
      };
    }

    set((state) => ({
      elements: [...state.elements, newElement],
    }));

    return id;
  },

  updateElement: (id: string, updates: Omit<Partial<CanvasElement>, 'data'> & { data?: unknown }) => {
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id !== id) {
          return element;
        }

        if (element.type === 'group') {
          const groupUpdates = updates as Omit<Partial<GroupElement>, 'data'> & { data?: unknown };
          const updatedData = groupUpdates.data
            ? { ...element.data, ...(groupUpdates.data as Record<string, unknown>) }
            : element.data;
          return { ...element, ...groupUpdates, data: updatedData };
        }

        const pathUpdates = updates as Omit<Partial<PathElement>, 'data'> & { data?: unknown };
        const updatedPathData = pathUpdates.data
          ? { ...element.data, ...(pathUpdates.data as Record<string, unknown>) }
          : element.data;
        return { ...element, ...pathUpdates, data: updatedPathData };
      }) as CanvasElement[],
    }));
  },

  deleteElement: (id: string) => {
    set((state) => {
      const currentState = state as CanvasStore;
      const hasElement = currentState.elements.some((element) => element.id === id);
      if (!hasElement) {
        return { elements: currentState.elements };
      }
      return deleteElementsBatch(currentState, [id], { clearSelection: false });
    });
  },

  deleteSelectedElements: () => {
    const state = get() as CanvasStore;
    if (state.selectedIds.length === 0) {
      return;
    }

    set((currentState) => {
      const fullState = currentState as CanvasStore;
      return deleteElementsBatch(fullState, fullState.selectedIds, { clearSelection: true });
    });
  },

  setActivePlugin: (plugin: string | null) => {
    if (!plugin) {
      set({ activePlugin: null });
      return;
    }
    applyModeTransition(plugin);
  },

  setMode: (mode: string) => {
    applyModeTransition(mode);
  },

  updateLastUsedTool: (group: string, toolId: string) => {
    set((state) => ({
      lastUsedToolByGroup: { ...state.lastUsedToolByGroup, [group]: toolId },
    }));
  },

  setDocumentName: (name: string) => {
    set({ documentName: name });
  },

  setVirtualShift: (active: boolean) => {
    set({ isVirtualShiftActive: active });
  },

  toggleVirtualShift: () => {
    set((state) => ({ isVirtualShiftActive: !state.isVirtualShiftActive }));
  },

  setPathInteractionDisabled: (disabled: boolean) => {
    set({ isPathInteractionDisabled: disabled });
  },

  setPathCursorMode: (mode: 'select' | 'default' | 'pointer') => {
    set({ pathCursorMode: mode });
  },

  updateSettings: (updates: Partial<BaseSlice['settings']>) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },

  saveDocument: () => {
    const state = get() as CanvasStore;
    const defs = defsContributionRegistry.serializeDefs(state, state.elements);

    const animState = state as unknown as AnimationStatePreparationHost & {
      animations?: unknown[];
    };

    const chainDelays = resolveExportChainDelays(animState);

    saveDocumentToFile({
      documentName: state.documentName,
      elements: state.elements,
      viewport: state.viewport,
      defs,
      animationDebug: {
        animations: animState.animations ?? [],
        animationState: animState.animationState,
        chainDelays: Array.from(chainDelays.entries()),
      },
    });
  },

  saveAsSvg: (selectedOnly: boolean = false) => {
    exportAs(get, 'svg', selectedOnly);
  },

  saveAsPng: (selectedOnly: boolean = false) => {
    exportAs(get, 'png', selectedOnly);
  },

  loadDocument: async (append: boolean = false) => {
    try {
      // Read elements lazily after await to avoid stale state during file picker
      const loadedDocument = await loadDocumentFromFilePicker({
        append,
        existingElements: (get() as CanvasStore).elements,
        generateElementId: () => generateShortId('el'),
      });

      if (!loadedDocument) return; // User cancelled the file picker

      // Atomic set: update elements, mode, and clear selection in a single call
      if (append) {
        set({
          elements: loadedDocument.elements,
          activePlugin: DEFAULT_MODE,
        } as Partial<BaseSlice>);
      } else {
        set({
          elements: loadedDocument.elements,
          documentName: loadedDocument.documentName || 'Loaded Document',
          activePlugin: DEFAULT_MODE,
        } as Partial<BaseSlice>);
      }

      // Clear selection synchronously after setting elements
      (get() as CanvasStore).clearSelection?.();
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('[loadDocument] Failed to load document:', error);
      }
    }
  },
});

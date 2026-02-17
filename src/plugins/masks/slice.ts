import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { PathData } from '../../types';

type FullStore = CanvasStore & MasksSlice;
import { measurePath } from '../../utils/measurementUtils';
import { commandsToString } from '../../utils/pathParserUtils';
import type { MasksSlice, MaskDefinition } from './types';

const makeMaskId = () => `mask-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const ensurePositiveDimension = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 1;

export const createMasksSlice: StateCreator<
  CanvasStore & MasksSlice,
  [],
  [],
  MasksSlice
> = (set, get) => {
  const current = get() as FullStore;
  const persistedMasks = current.masks;

  return {
    masks: Array.isArray(persistedMasks) ? persistedMasks : [],
    importedMasks: current.importedMasks ?? [],
    createMaskFromSelection: () => {
      const store = get() as FullStore;
      const pathElement = store.elements.find((el) => store.selectedIds.includes(el.id) && el.type === 'path');
      if (!pathElement) return;

      const pathData = pathElement.data as PathData;
      const bounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
      const width = ensurePositiveDimension(bounds.maxX - bounds.minX);
      const height = ensurePositiveDimension(bounds.maxY - bounds.minY);
      const d = commandsToString(pathData.subPaths.flat());
      const maskId = makeMaskId();
      const maskName = `Mask ${((get() as FullStore).masks?.length ?? 0) + 1}`;
      const mask = {
        id: maskId,
        name: maskName,
        x: `${bounds.minX}`,
        y: `${bounds.minY}`,
        width: `${width}`,
        height: `${height}`,
        maskUnits: 'userSpaceOnUse',
        maskContentUnits: 'userSpaceOnUse',
        content: `<path d="${d}" fill="white" />`,
      };

      set((state) => ({
        masks: [...(state.masks ?? []), mask],
      }));

      return maskId;
    },
    assignMaskToSelection: (maskId: string) => {
      const store = get() as FullStore;
      const { selectedIds, elements, updateElement } = store;

      selectedIds.forEach((id) => {
        const element = elements.find((el) => el.id === id);
        if (!element) return;
        updateElement?.(id, {
          data: {
            ...(element.data as Record<string, unknown>),
            maskId,
          },
        });
      });
    },
    clearMaskFromSelection: () => {
      const store = get() as FullStore;
      const { selectedIds, elements, updateElement, temporal } = store;

      temporal?.getState().pause();
      selectedIds.forEach((id) => {
        const element = elements.find((el) => el.id === id);
        if (!element) return;
        const nextData = { ...(element.data as Record<string, unknown>), maskId: undefined };
        updateElement?.(id, {
          data: nextData,
        });
      });
      temporal?.getState().resume();
    },
    removeMask: (maskId: string) => {
      set((state) => ({
        masks: (state.masks ?? []).filter((mask) => mask.id !== maskId),
      }));

      const store = get() as FullStore;
      const { elements, updateElement } = store;
      elements.forEach((element) => {
        const data = element.data as Record<string, unknown>;
        if ((data as { maskId?: string }).maskId === maskId) {
          const nextData = { ...data, maskId: undefined };
          updateElement?.(element.id, {
            data: nextData,
          });
        }
      });
    },
    updateMask: (maskId: string, updates: Partial<MaskDefinition>) => {
      set((state) => ({
        masks: (state.masks ?? []).map((mask) =>
          mask.id === maskId ? { ...mask, ...updates } : mask
        ),
      }));
    },
    renameMask: (maskId: string, name: string) => {
      set((state) => ({
        masks: (state.masks ?? []).map((mask) => mask.id === maskId ? { ...mask, name } : mask),
      }));
    },
    selectedFromSearch: null,
    selectFromSearch: (id: string | null) => set(() => ({ selectedFromSearch: id })),
  };
};

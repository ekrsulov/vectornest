import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

type FullStore = CanvasStore & SelectSimilarSlice;

interface SelectSimilarCriteria {
  fillColor: boolean;
  fillOpacity: boolean;
  strokeColor: boolean;
  strokeOpacity: boolean;
  strokeWidth: boolean;
  strokeLinecap: boolean;
  strokeLinejoin: boolean;
  strokeDasharray: boolean;
  elementType: boolean;
  width: boolean;
  height: boolean;
}

export interface SelectSimilarState {
  isActive: boolean;
  referenceElementId: string | null;
  criteria: SelectSimilarCriteria;
}

export interface SelectSimilarSlice {
  selectSimilar: SelectSimilarState;
  updateSelectSimilarState: (updates: Partial<SelectSimilarState>) => void;
  resetSelectSimilarState: () => void;
  activateSelectSimilar: () => void;
}

export const createInitialSelectSimilarState = (): SelectSimilarState => ({
  isActive: false,
  referenceElementId: null,
  criteria: {
    fillColor: false,
    fillOpacity: false,
    strokeColor: false,
    strokeOpacity: false,
    strokeWidth: false,
    strokeLinecap: false,
    strokeLinejoin: false,
    strokeDasharray: false,
    elementType: false,
    width: false,
    height: false,
  },
});

export const createSelectSimilarSlice: StateCreator<
  SelectSimilarSlice,
  [],
  [],
  SelectSimilarSlice
> = (set, get) => ({
  selectSimilar: createInitialSelectSimilarState(),

  updateSelectSimilarState: (updates) => {
    set((state) => ({
      selectSimilar: {
        ...state.selectSimilar,
        ...updates,
      },
    }));
  },

  resetSelectSimilarState: () => {
    set({ selectSimilar: createInitialSelectSimilarState() });
  },

  activateSelectSimilar: () => {
    const state = get() as FullStore;
    const selectedId = state.selectedIds[0];
    if (selectedId) {
      set({
        selectSimilar: {
          ...createInitialSelectSimilarState(),
          isActive: true,
          referenceElementId: selectedId,
        },
      });
    }
  },
});

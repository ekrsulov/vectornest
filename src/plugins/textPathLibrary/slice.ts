import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

export interface TextPathLibrarySlice {
  placingTextPathPresetId: string | null;
  selectedFromSearch: string | null;
  setPlacingTextPathPresetId: (id: string | null) => void;
  selectFromSearch: (id: string | null) => void;
}

export const createTextPathLibrarySlice: StateCreator<
  CanvasStore,
  [],
  [],
  TextPathLibrarySlice
> = (set) => ({
  placingTextPathPresetId: null,
  selectedFromSearch: null,
  setPlacingTextPathPresetId: (id) => {
    set((state) => ({ ...state, placingTextPathPresetId: id }));
  },
  selectFromSearch: (id) => {
    set((state) => ({ ...state, selectedFromSearch: id }));
  },
});

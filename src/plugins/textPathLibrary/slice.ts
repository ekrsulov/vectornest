import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';

export interface TextPathLibrarySlice {
  placingTextPathPresetId: string | null;
  selectedFromSearch: string | null;
  textPathPlacementInteraction: {
    isActive: boolean;
    pointerId: number | null;
    startPoint: Point | null;
    targetPoint: Point | null;
    sourceWidth: number;
    sourceHeight: number;
    isShiftPressed: boolean;
  };
  setPlacingTextPathPresetId: (id: string | null) => void;
  selectFromSearch: (id: string | null) => void;
  setTextPathPlacementInteraction: (
    updates: Partial<TextPathLibrarySlice['textPathPlacementInteraction']>
  ) => void;
}

export const createTextPathLibrarySlice: StateCreator<
  CanvasStore,
  [],
  [],
  TextPathLibrarySlice
> = (set) => ({
  placingTextPathPresetId: null,
  selectedFromSearch: null,
  textPathPlacementInteraction: {
    isActive: false,
    pointerId: null,
    startPoint: null,
    targetPoint: null,
    sourceWidth: 1,
    sourceHeight: 1,
    isShiftPressed: false,
  },
  setPlacingTextPathPresetId: (id) => {
    set((state) => ({
      ...state,
      placingTextPathPresetId: id,
      textPathPlacementInteraction: {
        ...state.textPathPlacementInteraction,
        isActive: false,
        pointerId: null,
        startPoint: null,
        targetPoint: null,
        isShiftPressed: false,
      },
    }));
  },
  selectFromSearch: (id) => {
    set((state) => ({ ...state, selectedFromSearch: id }));
  },
  setTextPathPlacementInteraction: (updates) => {
    set((state) => ({
      ...state,
      textPathPlacementInteraction: {
        ...state.textPathPlacementInteraction,
        ...updates,
      },
    }));
  },
});

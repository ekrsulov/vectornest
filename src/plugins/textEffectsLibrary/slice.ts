import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { TextEffectsLibrarySlice } from './types';

export const createTextEffectsLibrarySlice: StateCreator<
  CanvasStore,
  [],
  [],
  TextEffectsLibrarySlice
> = (set) => ({
  textEffectsSelectedFromSearch: null,
  selectTextEffectFromSearch: (id) => {
    set((state) => ({ ...state, textEffectsSelectedFromSearch: id }));
  },
});

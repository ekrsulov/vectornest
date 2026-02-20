import type { StateCreator } from 'zustand';

export interface PathMorphState extends Record<string, unknown> {
  steps: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  distributeColors: boolean;
}

export interface PathMorphPluginSlice {
  pathMorph: PathMorphState;
  updatePathMorphState: (state: Partial<PathMorphState>) => void;
}

const initialState: PathMorphState = {
  steps: 5,
  easing: 'linear',
  distributeColors: true,
};

export const createPathMorphSlice: StateCreator<
  PathMorphPluginSlice,
  [],
  [],
  PathMorphPluginSlice
> = (set) => ({
  pathMorph: { ...initialState },

  updatePathMorphState: (updates) => {
    set((state) => ({
      pathMorph: { ...state.pathMorph, ...updates },
    }));
  },
});

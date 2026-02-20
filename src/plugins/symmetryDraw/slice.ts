import type { StateCreator } from 'zustand';

export type SymmetryMode = 'mirror-x' | 'mirror-y' | 'mirror-xy' | 'radial';

export interface SymmetryDrawState extends Record<string, unknown> {
  enabled: boolean;
  mode: SymmetryMode;
  segments: number; // for radial mode (3..16)
  centerX: number;
  centerY: number;
  showGuides: boolean;
  guideOpacity: number;
}

export interface SymmetryDrawPluginSlice {
  symmetryDraw: SymmetryDrawState;
  updateSymmetryDrawState: (state: Partial<SymmetryDrawState>) => void;
}

const initialState: SymmetryDrawState = {
  enabled: false,
  mode: 'mirror-x',
  segments: 6,
  centerX: 400,
  centerY: 300,
  showGuides: true,
  guideOpacity: 0.4,
};

export const createSymmetryDrawSlice: StateCreator<
  SymmetryDrawPluginSlice,
  [],
  [],
  SymmetryDrawPluginSlice
> = (set) => ({
  symmetryDraw: { ...initialState },

  updateSymmetryDrawState: (updates) => {
    set((state) => ({
      symmetryDraw: { ...state.symmetryDraw, ...updates },
    }));
  },
});

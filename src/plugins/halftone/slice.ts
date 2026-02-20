import type { StateCreator } from 'zustand';

export type HalftoneShape = 'circle' | 'ellipse' | 'line';

export interface HalftoneState extends Record<string, unknown> {
  dotSize: number;
  spacing: number;
  angle: number;
  shape: HalftoneShape;
  contrast: number;
  colorize: boolean;
}

export interface HalftonePluginSlice {
  halftone: HalftoneState;
  updateHalftoneState: (state: Partial<HalftoneState>) => void;
}

const initialState: HalftoneState = {
  dotSize: 4,
  spacing: 8,
  angle: 45,
  shape: 'circle',
  contrast: 1.5,
  colorize: false,
};

export const createHalftoneSlice: StateCreator<
  HalftonePluginSlice,
  [],
  [],
  HalftonePluginSlice
> = (set) => ({
  halftone: { ...initialState },

  updateHalftoneState: (updates) => {
    set((state) => ({
      halftone: { ...state.halftone, ...updates },
    }));
  },
});

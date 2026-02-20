import type { StateCreator } from 'zustand';

export type GlitchMode = 'displacement' | 'rgb-shift' | 'scanlines' | 'pixelate' | 'noise';

export interface GlitchEffectState extends Record<string, unknown> {
  mode: GlitchMode;
  intensity: number;
  frequency: number;
  /** Horizontal shift for RGB mode */
  shiftX: number;
  /** Vertical shift for RGB mode */
  shiftY: number;
  /** Scanline gap */
  scanlineGap: number;
  /** Seed for noise/turbulence */
  seed: number;
}

export interface GlitchEffectPluginSlice {
  glitchEffect: GlitchEffectState;
  updateGlitchEffectState: (state: Partial<GlitchEffectState>) => void;
}

const initialState: GlitchEffectState = {
  mode: 'displacement',
  intensity: 10,
  frequency: 0.03,
  shiftX: 5,
  shiftY: 0,
  scanlineGap: 4,
  seed: 1,
};

export const createGlitchEffectSlice: StateCreator<
  GlitchEffectPluginSlice,
  [],
  [],
  GlitchEffectPluginSlice
> = (set) => ({
  glitchEffect: { ...initialState },

  updateGlitchEffectState: (updates) => {
    set((state) => ({
      glitchEffect: { ...state.glitchEffect, ...updates },
    }));
  },
});

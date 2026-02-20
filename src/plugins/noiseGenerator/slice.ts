import type { StateCreator } from 'zustand';

export type NoiseType = 'fractalNoise' | 'turbulence';

export interface NoiseGeneratorState extends Record<string, unknown> {
  noiseType: NoiseType;
  baseFrequencyX: number;
  baseFrequencyY: number;
  numOctaves: number;
  seed: number;
  stitchTiles: boolean;
  opacity: number;
  blendMode: string;
}

export interface NoiseGeneratorPluginSlice {
  noiseGenerator: NoiseGeneratorState;
  updateNoiseGeneratorState: (state: Partial<NoiseGeneratorState>) => void;
  randomizeSeed: () => void;
}

const initialState: NoiseGeneratorState = {
  noiseType: 'turbulence',
  baseFrequencyX: 0.02,
  baseFrequencyY: 0.02,
  numOctaves: 3,
  seed: 0,
  stitchTiles: false,
  opacity: 1,
  blendMode: 'normal',
};

export const createNoiseGeneratorSlice: StateCreator<
  NoiseGeneratorPluginSlice,
  [],
  [],
  NoiseGeneratorPluginSlice
> = (set) => ({
  noiseGenerator: { ...initialState },

  updateNoiseGeneratorState: (updates) => {
    set((state) => ({
      noiseGenerator: { ...state.noiseGenerator, ...updates },
    }));
  },

  randomizeSeed: () => {
    set((state) => ({
      noiseGenerator: {
        ...state.noiseGenerator,
        seed: Math.floor(Math.random() * 10000),
      },
    }));
  },
});

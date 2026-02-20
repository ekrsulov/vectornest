import type { StateCreator } from 'zustand';

export type ParticleShape = 'circle' | 'square' | 'star' | 'cross' | 'triangle' | 'line';
export type ParticleDistribution = 'random' | 'poisson' | 'grid-jitter';

export interface ParticleFieldState extends Record<string, unknown> {
  shape: ParticleShape;
  distribution: ParticleDistribution;
  count: number;
  minSize: number;
  maxSize: number;
  /** Whether to randomly rotate each particle */
  randomRotation: boolean;
  /** Whether to use source element's color */
  useElementColor: boolean;
  particleColor: string;
  particleOpacity: number;
  /** Whether particles are filled or stroked */
  filled: boolean;
  strokeWidth: number;
  seed: number;
}

export interface ParticleFieldPluginSlice {
  particleField: ParticleFieldState;
  updateParticleFieldState: (state: Partial<ParticleFieldState>) => void;
}

const initialState: ParticleFieldState = {
  shape: 'circle',
  distribution: 'random',
  count: 80,
  minSize: 1.5,
  maxSize: 4,
  randomRotation: true,
  useElementColor: false,
  particleColor: '#000000',
  particleOpacity: 0.9,
  filled: true,
  strokeWidth: 0.5,
  seed: 42,
};

export const createParticleFieldSlice: StateCreator<
  ParticleFieldPluginSlice,
  [],
  [],
  ParticleFieldPluginSlice
> = (set) => ({
  particleField: { ...initialState },

  updateParticleFieldState: (updates) => {
    set((state) => ({
      particleField: { ...state.particleField, ...updates },
    }));
  },
});

import type { StateCreator } from 'zustand';

export type ScatterMode = 'even' | 'random';
export type ScatterAlign = 'tangent' | 'fixed' | 'none';

export interface ScatterAlongPathState extends Record<string, unknown> {
  /** Number of copies to scatter */
  copies: number;
  /** Distribution mode: even spacing or random */
  mode: ScatterMode;
  /** Scale of each scattered copy (0.1 to 3.0) */
  scale: number;
  /** Whether to vary scale randomly (±percentage) */
  scaleVariation: number;
  /** How copies align to the path */
  align: ScatterAlign;
  /** Extra rotation offset in degrees */
  rotationOffset: number;
  /** Whether to vary rotation randomly (±degrees) */
  rotationVariation: number;
  /** Offset perpendicular to the path */
  perpendicularOffset: number;
  /** Random seed for reproducible results */
  seed: number;
}

export interface ScatterAlongPathPluginSlice {
  scatterAlongPath: ScatterAlongPathState;
  updateScatterAlongPathState: (state: Partial<ScatterAlongPathState>) => void;
}

const initialState: ScatterAlongPathState = {
  copies: 10,
  mode: 'even',
  scale: 1.0,
  scaleVariation: 0,
  align: 'tangent',
  rotationOffset: 0,
  rotationVariation: 0,
  perpendicularOffset: 0,
  seed: 42,
};

export const createScatterAlongPathSlice: StateCreator<
  ScatterAlongPathPluginSlice,
  [],
  [],
  ScatterAlongPathPluginSlice
> = (set) => ({
  scatterAlongPath: { ...initialState },

  updateScatterAlongPathState: (updates) => {
    set((state) => ({
      scatterAlongPath: { ...state.scatterAlongPath, ...updates },
    }));
  },
});

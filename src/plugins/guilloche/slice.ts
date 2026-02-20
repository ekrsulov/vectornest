import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type GuillochePreset = 'spirograph' | 'rosette' | 'wave_guilloche' | 'lissajous' | 'epitrochoid';

export interface GuillocheState extends Record<string, unknown> {
  preset: GuillochePreset;
  /** Outer radius */
  R: number;
  /** Inner radius */
  r: number;
  /** Pen offset distance */
  d: number;
  /** Number of revolutions to compute */
  revolutions: number;
  /** Resolution (points per revolution) */
  resolution: number;
  /** Lissajous frequency X */
  freqX: number;
  /** Lissajous frequency Y */
  freqY: number;
  /** Phase offset in degrees */
  phase: number;
  /** Number of concentric copies */
  layers: number;
  /** Spacing between layers */
  layerSpacing: number;
  /** Center X */
  centerX: number;
  /** Center Y */
  centerY: number;
}

export interface GuillochePluginSlice {
  guilloche: GuillocheState;
  updateGuillocheState: (state: Partial<GuillocheState>) => void;
}

export const createGuillocheSlice: StateCreator<
  GuillochePluginSlice,
  [],
  [],
  GuillochePluginSlice
> = createSimplePluginSlice<'guilloche', GuillocheState, GuillochePluginSlice>(
  'guilloche',
  {
    preset: 'spirograph',
    R: 120,
    r: 45,
    d: 60,
    revolutions: 10,
    resolution: 200,
    freqX: 3,
    freqY: 5,
    phase: 0,
    layers: 1,
    layerSpacing: 8,
    centerX: 250,
    centerY: 250,
  }
);

import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type MandalaLayer = 'petals' | 'circles' | 'dots' | 'waves' | 'spikes';

export interface MandalaGeneratorState extends Record<string, unknown> {
  /** Number of radial segments */
  segments: number;
  /** Number of concentric layers */
  layerCount: number;
  /** Outer radius */
  radius: number;
  /** Layer types (comma-separated for multi-layer) */
  layerStyle: MandalaLayer;
  /** Petal curvature (0-1) */
  petalCurvature: number;
  /** Inner ring ratio (0-1) */
  innerRatio: number;
  /** Rotation offset in degrees */
  rotation: number;
  /** Whether alternate layers are rotated by half-segment */
  alternateRotation: boolean;
  /** Center X */
  centerX: number;
  /** Center Y */
  centerY: number;
  /** Random seed for variation */
  seed: number;
  /** Decoration density (1-3) */
  density: number;
}

export interface MandalaGeneratorPluginSlice {
  mandalaGenerator: MandalaGeneratorState;
  updateMandalaGeneratorState: (state: Partial<MandalaGeneratorState>) => void;
}

export const createMandalaGeneratorSlice: StateCreator<
  MandalaGeneratorPluginSlice,
  [],
  [],
  MandalaGeneratorPluginSlice
> = createSimplePluginSlice<'mandalaGenerator', MandalaGeneratorState, MandalaGeneratorPluginSlice>(
  'mandalaGenerator',
  {
    segments: 12,
    layerCount: 5,
    radius: 150,
    layerStyle: 'petals',
    petalCurvature: 0.65,
    innerRatio: 0.15,
    rotation: 0,
    alternateRotation: true,
    centerX: 250,
    centerY: 250,
    seed: 42,
    density: 2,
  }
);

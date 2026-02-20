import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type KnotStyle = 'basic' | 'triquetra' | 'quaternary' | 'ring' | 'shield';

export interface CelticKnotState extends Record<string, unknown> {
  style: KnotStyle;
  /** Size of the knot */
  size: number;
  /** Number of loops/petals */
  loops: number;
  /** Strand width (visual gap between strands) */
  strandGap: number;
  /** Curvature tightness (0-1) */
  curvature: number;
  /** Rotation in degrees */
  rotation: number;
  /** Center X */
  centerX: number;
  /** Center Y */
  centerY: number;
  /** Number of concentric rings for ring style */
  rings: number;
}

export interface CelticKnotPluginSlice {
  celticKnot: CelticKnotState;
  updateCelticKnotState: (state: Partial<CelticKnotState>) => void;
}

export const createCelticKnotSlice: StateCreator<
  CelticKnotPluginSlice,
  [],
  [],
  CelticKnotPluginSlice
> = createSimplePluginSlice<'celticKnot', CelticKnotState, CelticKnotPluginSlice>(
  'celticKnot',
  {
    style: 'basic',
    size: 120,
    loops: 5,
    strandGap: 6,
    curvature: 0.7,
    rotation: 0,
    centerX: 250,
    centerY: 250,
    rings: 2,
  }
);

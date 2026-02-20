import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export interface FractalTreeState extends Record<string, unknown> {
  /** Branching angle in degrees */
  branchAngle: number;
  /** Recursion depth */
  depth: number;
  /** Length of the initial trunk */
  trunkLength: number;
  /** Ratio of child branch length to parent */
  lengthRatio: number;
  /** Width of the trunk */
  trunkWidth: number;
  /** Width taper ratio per level */
  widthTaper: number;
  /** Random variation in angle (0-1) */
  angleVariation: number;
  /** Random variation in length (0-1) */
  lengthVariation: number;
  /** Starting X position */
  startX: number;
  /** Starting Y position */
  startY: number;
  /** Random seed for variation */
  seed: number;
}

export interface FractalTreePluginSlice {
  fractalTree: FractalTreeState;
  updateFractalTreeState: (state: Partial<FractalTreeState>) => void;
}

export const createFractalTreeSlice: StateCreator<
  FractalTreePluginSlice,
  [],
  [],
  FractalTreePluginSlice
> = createSimplePluginSlice<'fractalTree', FractalTreeState, FractalTreePluginSlice>(
  'fractalTree',
  {
    branchAngle: 25,
    depth: 8,
    trunkLength: 100,
    lengthRatio: 0.72,
    trunkWidth: 6,
    widthTaper: 0.7,
    angleVariation: 0.1,
    lengthVariation: 0.1,
    startX: 250,
    startY: 450,
    seed: 42,
  }
);

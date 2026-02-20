import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface SymmetryResult {
  elementId: string;
  horizontal: number;
  vertical: number;
  rotational180: number;
  bestAxis: 'horizontal' | 'vertical' | 'rotational' | 'none';
  bestScore: number;
}

export interface SymmetryDetectorState extends Record<string, unknown> {
  enabled: boolean;
  tolerance: number;
  results: SymmetryResult[];
  avgSymmetry: number;
}

export interface SymmetryDetectorPluginSlice {
  symmetryDetector: SymmetryDetectorState;
  updateSymmetryDetectorState: (state: Partial<SymmetryDetectorState>) => void;
}

export const createSymmetryDetectorSlice: StateCreator<
  SymmetryDetectorPluginSlice,
  [],
  [],
  SymmetryDetectorPluginSlice
> = createSimplePluginSlice<'symmetryDetector', SymmetryDetectorState, SymmetryDetectorPluginSlice>(
  'symmetryDetector',
  {
    enabled: false,
    tolerance: 5,
    results: [],
    avgSymmetry: 0,
  }
);

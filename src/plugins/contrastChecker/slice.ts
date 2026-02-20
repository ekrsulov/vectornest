import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface ContrastResult {
  foregroundColor: string;
  backgroundColor: string;
  ratio: number;
  passAA: boolean;
  passAAA: boolean;
  passAALarge: boolean;
  passAAALarge: boolean;
}

export interface ContrastCheckerState extends Record<string, unknown> {
  results: ContrastResult[];
  checkStroke: boolean;
  checkFill: boolean;
}

export interface ContrastCheckerPluginSlice {
  contrastChecker: ContrastCheckerState;
  updateContrastCheckerState: (state: Partial<ContrastCheckerState>) => void;
}

export const createContrastCheckerSlice: StateCreator<
  ContrastCheckerPluginSlice,
  [],
  [],
  ContrastCheckerPluginSlice
> = createSimplePluginSlice<'contrastChecker', ContrastCheckerState, ContrastCheckerPluginSlice>(
  'contrastChecker',
  {
    results: [],
    checkStroke: false,
    checkFill: true,
  }
);

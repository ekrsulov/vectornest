import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface ProportionResult {
  elementId: string;
  label: string;
  width: number;
  height: number;
  ratio: number;
  closestStandard: string;
  closestRatioValue: number;
  deviation: number;
}

export interface ProportionCheckerState extends Record<string, unknown> {
  results: ProportionResult[];
  tolerancePercent: number;
}

export interface ProportionCheckerPluginSlice {
  proportionChecker: ProportionCheckerState;
  updateProportionCheckerState: (state: Partial<ProportionCheckerState>) => void;
}

export const createProportionCheckerSlice: StateCreator<
  ProportionCheckerPluginSlice,
  [],
  [],
  ProportionCheckerPluginSlice
> = createSimplePluginSlice<'proportionChecker', ProportionCheckerState, ProportionCheckerPluginSlice>(
  'proportionChecker',
  { results: [], tolerancePercent: 5 }
);

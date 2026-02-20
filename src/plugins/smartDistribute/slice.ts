import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export type DistributeMode = 'horizontal' | 'vertical' | 'radial' | 'along-line';
export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
export type SpacingMode = 'equal-gap' | 'equal-center' | 'progressive';

export interface SmartDistributeState extends Record<string, unknown> {
  mode: DistributeMode;
  easing: EasingType;
  spacingMode: SpacingMode;
  progressiveFactor: number;
  radialRadius: number;
  radialStartAngle: number;
  radialEndAngle: number;
  reverseOrder: boolean;
}

export interface SmartDistributePluginSlice {
  smartDistribute: SmartDistributeState;
  updateSmartDistributeState: (state: Partial<SmartDistributeState>) => void;
}

export const createSmartDistributeSlice: StateCreator<
  SmartDistributePluginSlice,
  [],
  [],
  SmartDistributePluginSlice
> = createSimplePluginSlice<'smartDistribute', SmartDistributeState, SmartDistributePluginSlice>(
  'smartDistribute',
  {
    mode: 'horizontal',
    easing: 'linear',
    spacingMode: 'equal-gap',
    progressiveFactor: 1.5,
    radialRadius: 150,
    radialStartAngle: 0,
    radialEndAngle: 360,
    reverseOrder: false,
  }
);

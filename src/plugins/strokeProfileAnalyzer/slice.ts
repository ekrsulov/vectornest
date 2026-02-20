import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface StrokeProfile {
  width: number;
  color: string;
  linecap: string;
  linejoin: string;
  dasharray: string;
  elementCount: number;
  elementIds: string[];
}

export interface StrokeProfileAnalyzerState extends Record<string, unknown> {
  profiles: StrokeProfile[];
  totalStroked: number;
  totalUnstroked: number;
  uniqueWidths: number;
  uniqueColors: number;
  consistencyScore: number;
}

export interface StrokeProfileAnalyzerPluginSlice {
  strokeProfileAnalyzer: StrokeProfileAnalyzerState;
  updateStrokeProfileAnalyzerState: (state: Partial<StrokeProfileAnalyzerState>) => void;
}

export const createStrokeProfileAnalyzerSlice: StateCreator<
  StrokeProfileAnalyzerPluginSlice,
  [],
  [],
  StrokeProfileAnalyzerPluginSlice
> = createSimplePluginSlice<'strokeProfileAnalyzer', StrokeProfileAnalyzerState, StrokeProfileAnalyzerPluginSlice>(
  'strokeProfileAnalyzer',
  {
    profiles: [],
    totalStroked: 0,
    totalUnstroked: 0,
    uniqueWidths: 0,
    uniqueColors: 0,
    consistencyScore: 0,
  }
);

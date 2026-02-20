import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface GradientInfo {
  gradientId: string;
  name: string;
  type: 'linear' | 'radial';
  stopCount: number;
  colors: string[];
  usedByElements: string[];
}

export interface GradientSimilarityPair {
  idA: string;
  idB: string;
  nameA: string;
  nameB: string;
  similarity: number;
}

export interface GradientMapperState extends Record<string, unknown> {
  gradientInfos: GradientInfo[];
  similarPairs: GradientSimilarityPair[];
  totalGradients: number;
  linearCount: number;
  radialCount: number;
  avgStopCount: number;
}

export interface GradientMapperPluginSlice {
  gradientMapper: GradientMapperState;
  updateGradientMapperState: (state: Partial<GradientMapperState>) => void;
}

export const createGradientMapperSlice: StateCreator<
  GradientMapperPluginSlice,
  [],
  [],
  GradientMapperPluginSlice
> = createSimplePluginSlice<'gradientMapper', GradientMapperState, GradientMapperPluginSlice>(
  'gradientMapper',
  {
    gradientInfos: [],
    similarPairs: [],
    totalGradients: 0,
    linearCount: 0,
    radialCount: 0,
    avgStopCount: 0,
  }
);

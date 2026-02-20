import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface ElementWeight {
  id: string;
  type: string;
  points: number;
  segments: number;
  estimatedBytes: number;
  percentOfTotal: number;
  complexity: 'low' | 'medium' | 'high' | 'very-high';
}

export type SizeSortMode = 'size' | 'points' | 'complexity';

export interface SvgSizeAnalyzerState extends Record<string, unknown> {
  weights: ElementWeight[];
  totalBytes: number;
  totalPoints: number;
  totalElements: number;
  sortMode: SizeSortMode;
  scopeSelection: boolean;
}

export interface SvgSizeAnalyzerPluginSlice {
  svgSizeAnalyzer: SvgSizeAnalyzerState;
  updateSvgSizeAnalyzerState: (state: Partial<SvgSizeAnalyzerState>) => void;
}

export const createSvgSizeAnalyzerSlice: StateCreator<
  SvgSizeAnalyzerPluginSlice,
  [],
  [],
  SvgSizeAnalyzerPluginSlice
> = createSimplePluginSlice<'svgSizeAnalyzer', SvgSizeAnalyzerState, SvgSizeAnalyzerPluginSlice>(
  'svgSizeAnalyzer',
  {
    weights: [],
    totalBytes: 0,
    totalPoints: 0,
    totalElements: 0,
    sortMode: 'size',
    scopeSelection: false,
  }
);

import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface WindingResult {
  elementId: string;
  label: string;
  subPathWindings: Array<{
    index: number;
    direction: 'CW' | 'CCW';
    area: number;
  }>;
  fillRule: 'nonzero' | 'evenodd';
  hasConflict: boolean;
}

export interface PathWindingAnalyzerState extends Record<string, unknown> {
  results: WindingResult[];
  showOverlay: boolean;
}

export interface PathWindingAnalyzerPluginSlice {
  pathWindingAnalyzer: PathWindingAnalyzerState;
  updatePathWindingAnalyzerState: (state: Partial<PathWindingAnalyzerState>) => void;
}

export const createPathWindingAnalyzerSlice: StateCreator<
  PathWindingAnalyzerPluginSlice,
  [],
  [],
  PathWindingAnalyzerPluginSlice
> = createSimplePluginSlice<'pathWindingAnalyzer', PathWindingAnalyzerState, PathWindingAnalyzerPluginSlice>(
  'pathWindingAnalyzer',
  { results: [], showOverlay: false }
);

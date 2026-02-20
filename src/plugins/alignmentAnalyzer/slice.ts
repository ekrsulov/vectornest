import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface AlignmentIssue {
  type: 'near-align-h' | 'near-align-v' | 'near-same-width' | 'near-same-height' | 'near-equal-gap';
  elementIds: string[];
  offset: number;
  description: string;
}

export interface AlignmentAnalyzerState extends Record<string, unknown> {
  enabled: boolean;
  tolerance: number;
  showNearMisses: boolean;
  showPerfectAligns: boolean;
  issues: AlignmentIssue[];
}

export interface AlignmentAnalyzerPluginSlice {
  alignmentAnalyzer: AlignmentAnalyzerState;
  updateAlignmentAnalyzerState: (state: Partial<AlignmentAnalyzerState>) => void;
}

export const createAlignmentAnalyzerSlice: StateCreator<
  AlignmentAnalyzerPluginSlice,
  [],
  [],
  AlignmentAnalyzerPluginSlice
> = createSimplePluginSlice<'alignmentAnalyzer', AlignmentAnalyzerState, AlignmentAnalyzerPluginSlice>(
  'alignmentAnalyzer',
  {
    enabled: false,
    tolerance: 3,
    showNearMisses: true,
    showPerfectAligns: true,
    issues: [],
  }
);

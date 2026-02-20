import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface SpacingGap {
  fromId: string;
  toId: string;
  axis: 'horizontal' | 'vertical';
  gap: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  midpoint: { x: number; y: number };
  isInconsistent: boolean;
}

export interface SpacingAnalyzerState extends Record<string, unknown> {
  enabled: boolean;
  showHorizontal: boolean;
  showVertical: boolean;
  inconsistencyThreshold: number;
  gaps: SpacingGap[];
  avgHGap: number;
  avgVGap: number;
  inconsistentCount: number;
}

export interface SpacingAnalyzerPluginSlice {
  spacingAnalyzer: SpacingAnalyzerState;
  updateSpacingAnalyzerState: (state: Partial<SpacingAnalyzerState>) => void;
}

export const createSpacingAnalyzerSlice: StateCreator<
  SpacingAnalyzerPluginSlice,
  [],
  [],
  SpacingAnalyzerPluginSlice
> = createSimplePluginSlice<'spacingAnalyzer', SpacingAnalyzerState, SpacingAnalyzerPluginSlice>(
  'spacingAnalyzer',
  {
    enabled: false,
    showHorizontal: true,
    showVertical: true,
    inconsistencyThreshold: 3,
    gaps: [],
    avgHGap: 0,
    avgVGap: 0,
    inconsistentCount: 0,
  }
);

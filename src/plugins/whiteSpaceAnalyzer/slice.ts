import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface WhiteSpaceMetrics {
  canvasArea: number;
  elementsArea: number;
  whiteSpaceArea: number;
  whiteSpacePercent: number;
  utilization: number;
  density: number;
  balanceH: number;
  balanceV: number;
}

export interface WhiteSpaceAnalyzerState extends Record<string, unknown> {
  metrics: WhiteSpaceMetrics | null;
  canvasWidth: number;
  canvasHeight: number;
  autoDetectBounds: boolean;
}

export interface WhiteSpaceAnalyzerPluginSlice {
  whiteSpaceAnalyzer: WhiteSpaceAnalyzerState;
  updateWhiteSpaceAnalyzerState: (state: Partial<WhiteSpaceAnalyzerState>) => void;
}

export const createWhiteSpaceAnalyzerSlice: StateCreator<
  WhiteSpaceAnalyzerPluginSlice,
  [],
  [],
  WhiteSpaceAnalyzerPluginSlice
> = createSimplePluginSlice<'whiteSpaceAnalyzer', WhiteSpaceAnalyzerState, WhiteSpaceAnalyzerPluginSlice>(
  'whiteSpaceAnalyzer',
  {
    metrics: null,
    canvasWidth: 800,
    canvasHeight: 600,
    autoDetectBounds: true,
  }
);

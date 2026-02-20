import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface AnchorInfo {
  elementId: string;
  subPathIndex: number;
  commandIndex: number;
  x: number;
  y: number;
  type: 'smooth' | 'corner' | 'cusp' | 'endpoint';
  handleAngle: number | null;
  handleLengthDiff: number | null;
}

export interface AnchorPointAnalysis {
  totalAnchors: number;
  smoothCount: number;
  cornerCount: number;
  cuspCount: number;
  endpointCount: number;
  avgHandleLength: number;
  shortHandles: number;
  longHandles: number;
  anchors: AnchorInfo[];
}

export interface AnchorPointAnalyzerState extends Record<string, unknown> {
  analysis: AnchorPointAnalysis | null;
  smoothThreshold: number;
  shortHandleThreshold: number;
  longHandleMultiplier: number;
}

export interface AnchorPointAnalyzerPluginSlice {
  anchorPointAnalyzer: AnchorPointAnalyzerState;
  updateAnchorPointAnalyzerState: (state: Partial<AnchorPointAnalyzerState>) => void;
}

export const createAnchorPointAnalyzerSlice: StateCreator<
  AnchorPointAnalyzerPluginSlice,
  [],
  [],
  AnchorPointAnalyzerPluginSlice
> = createSimplePluginSlice<'anchorPointAnalyzer', AnchorPointAnalyzerState, AnchorPointAnalyzerPluginSlice>(
  'anchorPointAnalyzer',
  {
    analysis: null,
    smoothThreshold: 15,
    shortHandleThreshold: 2,
    longHandleMultiplier: 5,
  }
);

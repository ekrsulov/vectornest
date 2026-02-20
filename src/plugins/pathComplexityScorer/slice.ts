import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface PathComplexityResult {
  elementId: string;
  label: string;
  score: number;
  grade: 'simple' | 'moderate' | 'complex' | 'very-complex';
  points: number;
  curves: number;
  cusps: number;
  subPaths: number;
  density: number;
}

export interface PathComplexityScorerState extends Record<string, unknown> {
  results: PathComplexityResult[];
  sortBy: 'score' | 'points' | 'curves';
  scopeAll: boolean;
}

export interface PathComplexityScorerPluginSlice {
  pathComplexityScorer: PathComplexityScorerState;
  updatePathComplexityScorerState: (state: Partial<PathComplexityScorerState>) => void;
}

export const createPathComplexityScorerSlice: StateCreator<
  PathComplexityScorerPluginSlice,
  [],
  [],
  PathComplexityScorerPluginSlice
> = createSimplePluginSlice<'pathComplexityScorer', PathComplexityScorerState, PathComplexityScorerPluginSlice>(
  'pathComplexityScorer',
  { results: [], sortBy: 'score', scopeAll: false }
);

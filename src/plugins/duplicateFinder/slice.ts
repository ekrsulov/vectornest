import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface DuplicateGroup {
  /** IDs in this group of duplicates */
  elementIds: string[];
  /** What kind of similarity was detected */
  matchType: 'exact-shape' | 'similar-shape' | 'same-style' | 'overlapping';
  /** Similarity score 0-100 */
  similarity: number;
  description: string;
}

export interface DuplicateFinderState extends Record<string, unknown> {
  shapeTolerance: number;
  positionTolerance: number;
  checkShape: boolean;
  checkStyle: boolean;
  checkOverlap: boolean;
  groups: DuplicateGroup[];
  totalDuplicates: number;
  scopeAll: boolean;
}

export interface DuplicateFinderPluginSlice {
  duplicateFinder: DuplicateFinderState;
  updateDuplicateFinderState: (state: Partial<DuplicateFinderState>) => void;
}

export const createDuplicateFinderSlice: StateCreator<
  DuplicateFinderPluginSlice,
  [],
  [],
  DuplicateFinderPluginSlice
> = createSimplePluginSlice<'duplicateFinder', DuplicateFinderState, DuplicateFinderPluginSlice>(
  'duplicateFinder',
  {
    shapeTolerance: 5,
    positionTolerance: 2,
    checkShape: true,
    checkStyle: true,
    checkOverlap: true,
    groups: [],
    totalDuplicates: 0,
    scopeAll: true,
  }
);

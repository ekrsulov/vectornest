import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface ComparisonDiff {
  property: string;
  valueA: string;
  valueB: string;
  isDifferent: boolean;
  category: 'geometry' | 'style' | 'structure';
}

export interface ElementComparatorState extends Record<string, unknown> {
  diffs: ComparisonDiff[];
  idA: string;
  idB: string;
  matchPercent: number;
  showOnlyDiffs: boolean;
}

export interface ElementComparatorPluginSlice {
  elementComparator: ElementComparatorState;
  updateElementComparatorState: (state: Partial<ElementComparatorState>) => void;
}

export const createElementComparatorSlice: StateCreator<
  ElementComparatorPluginSlice,
  [],
  [],
  ElementComparatorPluginSlice
> = createSimplePluginSlice<'elementComparator', ElementComparatorState, ElementComparatorPluginSlice>(
  'elementComparator',
  {
    diffs: [],
    idA: '',
    idB: '',
    matchPercent: 0,
    showOnlyDiffs: false,
  }
);

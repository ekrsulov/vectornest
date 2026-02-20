import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface SelectionStats {
  count: number;
  pathCount: number;
  groupCount: number;
  otherCount: number;
  totalArea: number;
  totalPerimeter: number;
  avgWidth: number;
  avgHeight: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  totalPoints: number;
  totalSegments: number;
  closedPaths: number;
  openPaths: number;
}

export interface SelectionStatisticsState extends Record<string, unknown> {
  stats: SelectionStats | null;
  autoUpdate: boolean;
}

export interface SelectionStatisticsPluginSlice {
  selectionStatistics: SelectionStatisticsState;
  updateSelectionStatisticsState: (state: Partial<SelectionStatisticsState>) => void;
}

export const createSelectionStatisticsSlice: StateCreator<
  SelectionStatisticsPluginSlice,
  [],
  [],
  SelectionStatisticsPluginSlice
> = createSimplePluginSlice<'selectionStatistics', SelectionStatisticsState, SelectionStatisticsPluginSlice>(
  'selectionStatistics',
  {
    stats: null,
    autoUpdate: true,
  }
);

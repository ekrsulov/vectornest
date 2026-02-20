import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface PathStats {
  totalPaths: number;
  totalPoints: number;
  totalSegments: number;
  totalSubPaths: number;
  lineSegments: number;
  curveSegments: number;
  closeCommands: number;
  curveRatio: number;
  avgPointsPerPath: number;
  avgSegmentsPerPath: number;
  totalPathLength: number;
  avgPathLength: number;
  shortestPath: number;
  longestPath: number;
  nodeDensity: number;
  efficiencyScore: number;
}

export interface PathStatisticsState extends Record<string, unknown> {
  stats: PathStats | null;
  scopeAll: boolean;
}

export interface PathStatisticsPluginSlice {
  pathStatistics: PathStatisticsState;
  updatePathStatisticsState: (state: Partial<PathStatisticsState>) => void;
}

export const createPathStatisticsSlice: StateCreator<
  PathStatisticsPluginSlice,
  [],
  [],
  PathStatisticsPluginSlice
> = createSimplePluginSlice<'pathStatistics', PathStatisticsState, PathStatisticsPluginSlice>(
  'pathStatistics',
  {
    stats: null,
    scopeAll: true,
  }
);

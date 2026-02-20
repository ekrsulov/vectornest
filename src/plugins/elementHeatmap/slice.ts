import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface HeatmapCell {
  x: number;
  y: number;
  count: number;
  intensity: number;
}

export interface ElementHeatmapState extends Record<string, unknown> {
  enabled: boolean;
  gridSize: number;
  opacity: number;
  cells: HeatmapCell[];
}

export interface ElementHeatmapPluginSlice {
  elementHeatmap: ElementHeatmapState;
  updateElementHeatmapState: (state: Partial<ElementHeatmapState>) => void;
}

export const createElementHeatmapSlice: StateCreator<
  ElementHeatmapPluginSlice,
  [],
  [],
  ElementHeatmapPluginSlice
> = createSimplePluginSlice<'elementHeatmap', ElementHeatmapState, ElementHeatmapPluginSlice>(
  'elementHeatmap',
  { enabled: false, gridSize: 50, opacity: 40, cells: [] }
);

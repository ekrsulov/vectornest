import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface BBoxInfo {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  perimeter: number;
}

export interface OverlapInfo {
  idA: string;
  idB: string;
  overlapArea: number;
  overlapPercent: number;
}

export interface BboxVisualizerState extends Record<string, unknown> {
  enabled: boolean;
  showDimensions: boolean;
  showArea: boolean;
  showOverlaps: boolean;
  showAllElements: boolean;
  bboxes: BBoxInfo[];
  overlaps: OverlapInfo[];
  totalArea: number;
  totalOverlapArea: number;
}

export interface BboxVisualizerPluginSlice {
  bboxVisualizer: BboxVisualizerState;
  updateBboxVisualizerState: (state: Partial<BboxVisualizerState>) => void;
}

export const createBboxVisualizerSlice: StateCreator<
  BboxVisualizerPluginSlice,
  [],
  [],
  BboxVisualizerPluginSlice
> = createSimplePluginSlice<'bboxVisualizer', BboxVisualizerState, BboxVisualizerPluginSlice>(
  'bboxVisualizer',
  {
    enabled: false,
    showDimensions: true,
    showArea: false,
    showOverlaps: true,
    showAllElements: false,
    bboxes: [],
    overlaps: [],
    totalArea: 0,
    totalOverlapArea: 0,
  }
);

import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface TangentLine {
  x: number;
  y: number;
  angle: number;
  length: number;
}

export interface TangentVisualizerState extends Record<string, unknown> {
  enabled: boolean;
  showTangents: boolean;
  showNormals: boolean;
  lineLength: number;
  selectedOnly: boolean;
}

export interface TangentVisualizerPluginSlice {
  tangentVisualizer: TangentVisualizerState;
  updateTangentVisualizerState: (state: Partial<TangentVisualizerState>) => void;
}

export const createTangentVisualizerSlice: StateCreator<
  TangentVisualizerPluginSlice,
  [],
  [],
  TangentVisualizerPluginSlice
> = createSimplePluginSlice<'tangentVisualizer', TangentVisualizerState, TangentVisualizerPluginSlice>(
  'tangentVisualizer',
  { enabled: false, showTangents: true, showNormals: false, lineLength: 30, selectedOnly: true }
);

import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface LayerInfo {
  id: string;
  zIndex: number;
  name: string;
  area: number;
  obscuredBy: string[];
  obscuredPercent: number;
  isFullyObscured: boolean;
}

export interface LayerDepthState extends Record<string, unknown> {
  enabled: boolean;
  showZIndexLabels: boolean;
  highlightObscured: boolean;
  layers: LayerInfo[];
  totalLayers: number;
  fullyObscuredCount: number;
  partiallyObscuredCount: number;
}

export interface LayerDepthPluginSlice {
  layerDepth: LayerDepthState;
  updateLayerDepthState: (state: Partial<LayerDepthState>) => void;
}

export const createLayerDepthSlice: StateCreator<
  LayerDepthPluginSlice,
  [],
  [],
  LayerDepthPluginSlice
> = createSimplePluginSlice<'layerDepth', LayerDepthState, LayerDepthPluginSlice>(
  'layerDepth',
  {
    enabled: false,
    showZIndexLabels: true,
    highlightObscured: true,
    layers: [],
    totalLayers: 0,
    fullyObscuredCount: 0,
    partiallyObscuredCount: 0,
  }
);

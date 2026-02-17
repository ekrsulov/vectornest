import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface WireframeState extends Record<string, unknown> {
  enabled: boolean;
  removeFill: boolean;
}

export interface WireframePluginSlice {
  wireframe: WireframeState;
  updateWireframeState: (state: Partial<WireframeState>) => void;
}

export const createWireframePluginSlice: StateCreator<
  WireframePluginSlice,
  [],
  [],
  WireframePluginSlice
> = createSimplePluginSlice<'wireframe', WireframeState, WireframePluginSlice>(
  'wireframe',
  {
    enabled: false,
    removeFill: true,
  }
);

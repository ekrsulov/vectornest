import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface ElementRulerState extends Record<string, unknown> {
  enabled: boolean;
  showDistances: boolean;
  showAngles: boolean;
  showGaps: boolean;
  showDimensions: boolean;
  rulerColor: string;
  textColor: string;
}

export interface ElementRulerPluginSlice {
  elementRuler: ElementRulerState;
  updateElementRulerState: (state: Partial<ElementRulerState>) => void;
}

export const createElementRulerSlice: StateCreator<
  ElementRulerPluginSlice,
  [],
  [],
  ElementRulerPluginSlice
> = createSimplePluginSlice<'elementRuler', ElementRulerState, ElementRulerPluginSlice>(
  'elementRuler',
  {
    enabled: false,
    showDistances: true,
    showAngles: true,
    showGaps: true,
    showDimensions: true,
    rulerColor: '#F6AD55',
    textColor: '#FFFFFF',
  }
);

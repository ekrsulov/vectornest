import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type GuideType = 'thirds' | 'golden' | 'diagonal' | 'centerCross' | 'phiGrid' | 'fibonacciSpiral';

export interface CompositionGuidesState extends Record<string, unknown> {
  enabled: boolean;
  /** Which guide overlays are active */
  activeGuides: GuideType[];
  /** Guide line opacity */
  opacity: number;
  /** Guide line color */
  color: string;
  /** Canvas width for guides */
  canvasWidth: number;
  /** Canvas height for guides */
  canvasHeight: number;
}

export interface CompositionGuidesPluginSlice {
  compositionGuides: CompositionGuidesState;
  updateCompositionGuidesState: (state: Partial<CompositionGuidesState>) => void;
}

export const createCompositionGuidesSlice: StateCreator<
  CompositionGuidesPluginSlice,
  [],
  [],
  CompositionGuidesPluginSlice
> = createSimplePluginSlice<'compositionGuides', CompositionGuidesState, CompositionGuidesPluginSlice>(
  'compositionGuides',
  {
    enabled: false,
    activeGuides: ['thirds'],
    opacity: 0.5,
    color: '#805AD5',
    canvasWidth: 500,
    canvasHeight: 500,
  }
);

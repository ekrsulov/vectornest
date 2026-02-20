import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export interface CurvatureCombState extends Record<string, unknown> {
  enabled: boolean;
  /** Scale factor for comb teeth height */
  combScale: number;
  /** Number of sample points per curve segment */
  density: number;
  /** Show inflection point markers */
  showInflections: boolean;
  /** Show curvature extrema markers */
  showExtrema: boolean;
  /** Comb color */
  combColor: string;
  /** Show curvature values */
  showValues: boolean;
}

export interface CurvatureCombPluginSlice {
  curvatureComb: CurvatureCombState;
  updateCurvatureCombState: (state: Partial<CurvatureCombState>) => void;
}

export const createCurvatureCombSlice: StateCreator<
  CurvatureCombPluginSlice,
  [],
  [],
  CurvatureCombPluginSlice
> = createSimplePluginSlice<'curvatureComb', CurvatureCombState, CurvatureCombPluginSlice>(
  'curvatureComb',
  {
    enabled: false,
    combScale: 30,
    density: 12,
    showInflections: true,
    showExtrema: true,
    combColor: '#E53E3E',
    showValues: false,
  }
);

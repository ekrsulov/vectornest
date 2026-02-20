import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type SpiralType = 'archimedean' | 'logarithmic' | 'fibonacci' | 'fermat';

export interface SpiralGeneratorState extends Record<string, unknown> {
  /** Type of spiral */
  spiralType: SpiralType;
  /** Number of full turns */
  turns: number;
  /** Maximum radius of the spiral */
  outerRadius: number;
  /** Inner radius (gap at center) */
  innerRadius: number;
  /** Points per turn (affects smoothness) */
  pointsPerTurn: number;
  /** Growth rate for logarithmic spirals */
  growthRate: number;
  /** Whether spiral goes clockwise */
  clockwise: boolean;
  /** Center X position */
  centerX: number;
  /** Center Y position */
  centerY: number;
}

export interface SpiralGeneratorPluginSlice {
  spiralGenerator: SpiralGeneratorState;
  updateSpiralGeneratorState: (state: Partial<SpiralGeneratorState>) => void;
}

export const createSpiralGeneratorSlice: StateCreator<
  SpiralGeneratorPluginSlice,
  [],
  [],
  SpiralGeneratorPluginSlice
> = createSimplePluginSlice<'spiralGenerator', SpiralGeneratorState, SpiralGeneratorPluginSlice>(
  'spiralGenerator',
  {
    spiralType: 'archimedean',
    turns: 5,
    outerRadius: 150,
    innerRadius: 5,
    pointsPerTurn: 32,
    growthRate: 0.2,
    clockwise: true,
    centerX: 250,
    centerY: 250,
  }
);

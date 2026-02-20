import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type GearType = 'spur' | 'internal' | 'star' | 'ratchet' | 'sprocket';

export interface GearGeneratorState extends Record<string, unknown> {
  gearType: GearType;
  /** Number of teeth */
  teeth: number;
  /** Outer radius */
  outerRadius: number;
  /** Inner radius (root circle) */
  innerRadius: number;
  /** Hub hole radius */
  hubRadius: number;
  /** Tooth depth factor */
  toothDepth: number;
  /** Tooth width factor (0-1) */
  toothWidth: number;
  /** Pressure angle in degrees (standard: 20) */
  pressureAngle: number;
  /** Rotation in degrees */
  rotation: number;
  /** Center X */
  centerX: number;
  /** Center Y */
  centerY: number;
  /** Whether to include hub hole */
  showHub: boolean;
  /** Number of spokes for sprocket */
  spokes: number;
}

export interface GearGeneratorPluginSlice {
  gearGenerator: GearGeneratorState;
  updateGearGeneratorState: (state: Partial<GearGeneratorState>) => void;
}

export const createGearGeneratorSlice: StateCreator<
  GearGeneratorPluginSlice,
  [],
  [],
  GearGeneratorPluginSlice
> = createSimplePluginSlice<'gearGenerator', GearGeneratorState, GearGeneratorPluginSlice>(
  'gearGenerator',
  {
    gearType: 'spur',
    teeth: 16,
    outerRadius: 100,
    innerRadius: 75,
    hubRadius: 15,
    toothDepth: 0.25,
    toothWidth: 0.5,
    pressureAngle: 20,
    rotation: 0,
    centerX: 250,
    centerY: 250,
    showHub: true,
    spokes: 5,
  }
);

import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type LayoutMode = 'circle' | 'grid' | 'wave' | 'cascade' | 'fanOut' | 'pack';

export interface LayoutEngineState extends Record<string, unknown> {
  mode: LayoutMode;
  /** Circle radius / grid spacing / wave amplitude */
  spacing: number;
  /** Starting angle for circle/fan-out (degrees) */
  startAngle: number;
  /** Grid columns */
  columns: number;
  /** Wave frequency */
  waveFrequency: number;
  /** Cascade X offset */
  cascadeX: number;
  /** Cascade Y offset */
  cascadeY: number;
  /** Fan spread angle */
  fanSpread: number;
  /** Rotate elements to follow layout path */
  rotateElements: boolean;
  /** Center X for circular layouts */
  centerX: number;
  /** Center Y for circular layouts */
  centerY: number;
}

export interface LayoutEnginePluginSlice {
  layoutEngine: LayoutEngineState;
  updateLayoutEngineState: (state: Partial<LayoutEngineState>) => void;
}

export const createLayoutEngineSlice: StateCreator<
  LayoutEnginePluginSlice,
  [],
  [],
  LayoutEnginePluginSlice
> = createSimplePluginSlice<'layoutEngine', LayoutEngineState, LayoutEnginePluginSlice>(
  'layoutEngine',
  {
    mode: 'circle',
    spacing: 150,
    startAngle: 0,
    columns: 3,
    waveFrequency: 2,
    cascadeX: 30,
    cascadeY: 30,
    fanSpread: 180,
    rotateElements: false,
    centerX: 250,
    centerY: 250,
  }
);

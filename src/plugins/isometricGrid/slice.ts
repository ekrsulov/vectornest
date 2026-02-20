import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type IsoStyle = 'grid' | 'cubes' | 'hexGrid' | 'triangleGrid' | 'diamond';

export interface IsometricGridState extends Record<string, unknown> {
  style: IsoStyle;
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
  /** Cell size */
  cellSize: number;
  /** Isometric angle in degrees (30 = standard) */
  angle: number;
  /** Cube height factor for cube style */
  cubeHeight: number;
  /** Offset X */
  offsetX: number;
  /** Offset Y */
  offsetY: number;
  /** Whether to fill alternate cells */
  alternateShading: boolean;
}

export interface IsometricGridPluginSlice {
  isometricGrid: IsometricGridState;
  updateIsometricGridState: (state: Partial<IsometricGridState>) => void;
}

export const createIsometricGridSlice: StateCreator<
  IsometricGridPluginSlice,
  [],
  [],
  IsometricGridPluginSlice
> = createSimplePluginSlice<'isometricGrid', IsometricGridState, IsometricGridPluginSlice>(
  'isometricGrid',
  {
    style: 'grid',
    cols: 8,
    rows: 8,
    cellSize: 40,
    angle: 30,
    cubeHeight: 0.6,
    offsetX: 80,
    offsetY: 80,
    alternateShading: false,
  }
);

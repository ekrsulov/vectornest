import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type PatternType =
  | 'hexagonal'
  | 'islamic-star'
  | 'penrose'
  | 'celtic-knot'
  | 'truchet'
  | 'chevron';

export interface GeometricPatternState extends Record<string, unknown> {
  /** Type of geometric pattern */
  patternType: PatternType;
  /** Number of columns */
  columns: number;
  /** Number of rows */
  rows: number;
  /** Cell size in canvas units */
  cellSize: number;
  /** Number of points for star patterns */
  starPoints: number;
  /** Line thickness for generated paths */
  lineWidth: number;
  /** Origin X */
  originX: number;
  /** Origin Y */
  originY: number;
  /** Rotation of the full pattern in degrees */
  rotation: number;
}

export interface GeometricPatternPluginSlice {
  geometricPattern: GeometricPatternState;
  updateGeometricPatternState: (state: Partial<GeometricPatternState>) => void;
}

export const createGeometricPatternSlice: StateCreator<
  GeometricPatternPluginSlice,
  [],
  [],
  GeometricPatternPluginSlice
> = createSimplePluginSlice<'geometricPattern', GeometricPatternState, GeometricPatternPluginSlice>(
  'geometricPattern',
  {
    patternType: 'hexagonal',
    columns: 5,
    rows: 5,
    cellSize: 50,
    starPoints: 8,
    lineWidth: 2,
    originX: 50,
    originY: 50,
    rotation: 0,
  }
);

import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type MazeAlgorithm = 'backtracker' | 'prims' | 'kruskal' | 'binary' | 'sidewinder';
export type MazeShape = 'rectangular' | 'circular';

export interface MazeGeneratorState extends Record<string, unknown> {
  /** Grid columns */
  cols: number;
  /** Grid rows */
  rows: number;
  /** Cell size in canvas units */
  cellSize: number;
  /** Wall thickness */
  wallThickness: number;
  /** Algorithm to use */
  algorithm: MazeAlgorithm;
  /** Maze shape */
  shape: MazeShape;
  /** Offset X */
  offsetX: number;
  /** Offset Y */
  offsetY: number;
  /** Random seed */
  seed: number;
  /** Whether to add entrance/exit openings */
  addOpenings: boolean;
  /** Corner rounding radius */
  cornerRadius: number;
}

export interface MazeGeneratorPluginSlice {
  mazeGenerator: MazeGeneratorState;
  updateMazeGeneratorState: (state: Partial<MazeGeneratorState>) => void;
}

export const createMazeGeneratorSlice: StateCreator<
  MazeGeneratorPluginSlice,
  [],
  [],
  MazeGeneratorPluginSlice
> = createSimplePluginSlice<'mazeGenerator', MazeGeneratorState, MazeGeneratorPluginSlice>(
  'mazeGenerator',
  {
    cols: 12,
    rows: 12,
    cellSize: 25,
    wallThickness: 2,
    algorithm: 'backtracker',
    shape: 'rectangular',
    offsetX: 50,
    offsetY: 50,
    seed: 7777,
    addOpenings: true,
    cornerRadius: 0,
  }
);

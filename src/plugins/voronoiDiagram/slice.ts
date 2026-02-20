import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type VoronoiMode = 'voronoi' | 'delaunay' | 'both';
export type PointDistribution = 'random' | 'grid' | 'hex' | 'poisson';

export interface VoronoiDiagramState extends Record<string, unknown> {
  /** Number of seed points */
  pointCount: number;
  /** Display mode */
  mode: VoronoiMode;
  /** Point distribution method */
  distribution: PointDistribution;
  /** Canvas bounds width */
  width: number;
  /** Canvas bounds height */
  height: number;
  /** Offset X */
  offsetX: number;
  /** Offset Y */
  offsetY: number;
  /** Margin from edges */
  margin: number;
  /** Random seed */
  seed: number;
  /** Whether to show seed points as small circles */
  showSeedPoints: boolean;
  /** Jitter amount for grid/hex distributions */
  jitter: number;
}

export interface VoronoiDiagramPluginSlice {
  voronoiDiagram: VoronoiDiagramState;
  updateVoronoiDiagramState: (state: Partial<VoronoiDiagramState>) => void;
}

export const createVoronoiDiagramSlice: StateCreator<
  VoronoiDiagramPluginSlice,
  [],
  [],
  VoronoiDiagramPluginSlice
> = createSimplePluginSlice<'voronoiDiagram', VoronoiDiagramState, VoronoiDiagramPluginSlice>(
  'voronoiDiagram',
  {
    pointCount: 30,
    mode: 'voronoi',
    distribution: 'random',
    width: 400,
    height: 400,
    offsetX: 50,
    offsetY: 50,
    margin: 10,
    seed: 12345,
    showSeedPoints: false,
    jitter: 0.3,
  }
);

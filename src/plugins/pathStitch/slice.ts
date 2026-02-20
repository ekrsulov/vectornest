import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type StitchStyle = 'zigzag' | 'wave' | 'cross' | 'running' | 'chain' | 'spiral';

export interface PathStitchState extends Record<string, unknown> {
  /** Stitch pattern style */
  stitchStyle: StitchStyle;
  /** Width of the stitch perpendicular to the connection line */
  stitchWidth: number;
  /** Spacing between stitches */
  spacing: number;
  /** Number of stitch points per connection */
  density: number;
  /** Whether to connect nearest endpoints or centroids */
  connectionMode: 'endpoints' | 'centroids';
}

export interface PathStitchPluginSlice {
  pathStitch: PathStitchState;
  updatePathStitchState: (state: Partial<PathStitchState>) => void;
}

export const createPathStitchSlice: StateCreator<
  PathStitchPluginSlice,
  [],
  [],
  PathStitchPluginSlice
> = createSimplePluginSlice<'pathStitch', PathStitchState, PathStitchPluginSlice>(
  'pathStitch',
  {
    stitchStyle: 'zigzag',
    stitchWidth: 8,
    spacing: 6,
    density: 20,
    connectionMode: 'endpoints',
  }
);

import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export interface PathDirectionState extends Record<string, unknown> {
  enabled: boolean;
  /** Show direction arrows on paths */
  showArrows: boolean;
  /** Show start/end markers */
  showEndpoints: boolean;
  /** Arrow density (number of arrows per 100px of path) */
  arrowDensity: number;
  /** Arrow size */
  arrowSize: number;
  /** Arrow color */
  arrowColor: string;
}

export interface PathDirectionPluginSlice {
  pathDirection: PathDirectionState;
  updatePathDirectionState: (state: Partial<PathDirectionState>) => void;
}

export const createPathDirectionSlice: StateCreator<
  PathDirectionPluginSlice,
  [],
  [],
  PathDirectionPluginSlice
> = createSimplePluginSlice<'pathDirection', PathDirectionState, PathDirectionPluginSlice>(
  'pathDirection',
  {
    enabled: false,
    showArrows: true,
    showEndpoints: true,
    arrowDensity: 3,
    arrowSize: 8,
    arrowColor: '#38A169',
  }
);

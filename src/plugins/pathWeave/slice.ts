import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export interface PathWeaveState extends Record<string, unknown> {
  /** Gap size where one path "goes under" another */
  gapSize: number;
  /** Starting weave pattern: 'over' or 'under' for the first intersection */
  startPattern: 'over' | 'under';
  /** Whether to alternate the pattern at each intersection */
  alternate: boolean;
  /** Whether to apply weave between all selected or sequentially by order */
  mode: 'all-pairs' | 'sequential';
}

export interface PathWeavePluginSlice {
  pathWeave: PathWeaveState;
  updatePathWeaveState: (state: Partial<PathWeaveState>) => void;
}

export const createPathWeaveSlice: StateCreator<
  PathWeavePluginSlice,
  [],
  [],
  PathWeavePluginSlice
> = createSimplePluginSlice<'pathWeave', PathWeaveState, PathWeavePluginSlice>(
  'pathWeave',
  {
    gapSize: 6,
    startPattern: 'over',
    alternate: true,
    mode: 'sequential',
  }
);

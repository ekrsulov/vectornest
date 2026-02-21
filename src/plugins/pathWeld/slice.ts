import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface PathWeldState extends Record<string, unknown> {
    enabled: boolean;
    weldPoints: Point[];
    isWelding: boolean;
    weldWidth: number;
}

export interface PathWeldPluginSlice {
    pathWeld: PathWeldState;
    updatePathWeldState: (state: Partial<PathWeldState>) => void;
}

export const createPathWeldPluginSlice: StateCreator<
    PathWeldPluginSlice,
    [],
    [],
    PathWeldPluginSlice
> = createSimplePluginSlice<'pathWeld', PathWeldState, PathWeldPluginSlice>(
    'pathWeld',
    { enabled: true, weldPoints: [], isWelding: false, weldWidth: 4 }
);

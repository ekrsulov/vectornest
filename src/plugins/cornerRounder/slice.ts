import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface CornerRounderState extends Record<string, unknown> {
    enabled: boolean;
    roundPoints: Point[];
    isRounding: boolean;
    roundRadius: number;
    brushSize: number;
}

export interface CornerRounderPluginSlice {
    cornerRounder: CornerRounderState;
    updateCornerRounderState: (state: Partial<CornerRounderState>) => void;
}

export const createCornerRounderPluginSlice: StateCreator<
    CornerRounderPluginSlice,
    [],
    [],
    CornerRounderPluginSlice
> = createSimplePluginSlice<'cornerRounder', CornerRounderState, CornerRounderPluginSlice>(
    'cornerRounder',
    { enabled: true, roundPoints: [], isRounding: false, roundRadius: 10, brushSize: 20 }
);

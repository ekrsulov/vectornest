import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface CoilToolState extends Record<string, unknown> {
    enabled: boolean;
    coilPoints: Point[];
    isDrawing: boolean;
    coilRadius: number;
    turns: number;
    taper: boolean;
}

export interface CoilToolPluginSlice {
    coilTool: CoilToolState;
    updateCoilToolState: (state: Partial<CoilToolState>) => void;
}

export const createCoilToolPluginSlice: StateCreator<
    CoilToolPluginSlice,
    [],
    [],
    CoilToolPluginSlice
> = createSimplePluginSlice<'coilTool', CoilToolState, CoilToolPluginSlice>(
    'coilTool',
    {
        enabled: true,
        coilPoints: [],
        isDrawing: false,
        coilRadius: 15,
        turns: 12,
        taper: false,
    }
);

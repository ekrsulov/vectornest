import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface RoughenToolState extends Record<string, unknown> {
    enabled: boolean;
    roughenPoints: Point[];
    isRoughening: boolean;
    roughenRadius: number;
    intensity: number;
    detail: number;
}

export interface RoughenToolPluginSlice {
    roughenTool: RoughenToolState;
    updateRoughenToolState: (state: Partial<RoughenToolState>) => void;
}

export const createRoughenToolPluginSlice: StateCreator<
    RoughenToolPluginSlice,
    [],
    [],
    RoughenToolPluginSlice
> = createSimplePluginSlice<'roughenTool', RoughenToolState, RoughenToolPluginSlice>(
    'roughenTool',
    {
        enabled: true,
        roughenPoints: [],
        isRoughening: false,
        roughenRadius: 30,
        intensity: 5,
        detail: 4,
    }
);

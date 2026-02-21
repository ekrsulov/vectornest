import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface StarBurstState extends Record<string, unknown> {
    enabled: boolean;
    dragStart: Point | null;
    isDragging: boolean;
    rays: number;
    innerRadiusRatio: number;
    rayStyle: 'pointed' | 'rounded' | 'flat';
}

export interface StarBurstPluginSlice {
    starBurst: StarBurstState;
    updateStarBurstState: (state: Partial<StarBurstState>) => void;
}

export const createStarBurstPluginSlice: StateCreator<
    StarBurstPluginSlice,
    [],
    [],
    StarBurstPluginSlice
> = createSimplePluginSlice<'starBurst', StarBurstState, StarBurstPluginSlice>(
    'starBurst',
    {
        enabled: true,
        dragStart: null,
        isDragging: false,
        rays: 12,
        innerRadiusRatio: 0.4,
        rayStyle: 'pointed',
    }
);

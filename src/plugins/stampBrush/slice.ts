import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface StampBrushState extends Record<string, unknown> {
    enabled: boolean;
    stampPoints: Point[];
    isStamping: boolean;
    spacing: number;
    scaleVariation: number;
    rotationVariation: number;
    sizeMultiplier: number;
}

export interface StampBrushPluginSlice {
    stampBrush: StampBrushState;
    updateStampBrushState: (state: Partial<StampBrushState>) => void;
}

export const createStampBrushPluginSlice: StateCreator<
    StampBrushPluginSlice,
    [],
    [],
    StampBrushPluginSlice
> = createSimplePluginSlice<'stampBrush', StampBrushState, StampBrushPluginSlice>(
    'stampBrush',
    {
        enabled: true,
        stampPoints: [],
        isStamping: false,
        spacing: 40,
        scaleVariation: 0.2,
        rotationVariation: 15,
        sizeMultiplier: 1.0,
    }
);

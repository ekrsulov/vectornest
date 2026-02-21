import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface StippleBrushState extends Record<string, unknown> {
    enabled: boolean;
    stipplePoints: Point[];
    isStippling: boolean;
    brushRadius: number;
    dotSizeMin: number;
    dotSizeMax: number;
    density: number;
    sizeDistribution: 'uniform' | 'center-heavy' | 'edge-heavy';
}

export interface StippleBrushPluginSlice {
    stippleBrush: StippleBrushState;
    updateStippleBrushState: (state: Partial<StippleBrushState>) => void;
}

export const createStippleBrushPluginSlice: StateCreator<
    StippleBrushPluginSlice,
    [],
    [],
    StippleBrushPluginSlice
> = createSimplePluginSlice<'stippleBrush', StippleBrushState, StippleBrushPluginSlice>(
    'stippleBrush',
    {
        enabled: true,
        stipplePoints: [],
        isStippling: false,
        brushRadius: 30,
        dotSizeMin: 0.5,
        dotSizeMax: 3,
        density: 12,
        sizeDistribution: 'uniform',
    }
);

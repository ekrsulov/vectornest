import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface ErodeDilateState extends Record<string, unknown> {
    enabled: boolean;
    brushPoints: Point[];
    isPainting: boolean;
    brushRadius: number;
    amount: number;
    mode: 'erode' | 'dilate';
}

export interface ErodeDilatePluginSlice {
    erodeDilate: ErodeDilateState;
    updateErodeDilateState: (state: Partial<ErodeDilateState>) => void;
}

export const createErodeDilatePluginSlice: StateCreator<
    ErodeDilatePluginSlice,
    [],
    [],
    ErodeDilatePluginSlice
> = createSimplePluginSlice<'erodeDilate', ErodeDilateState, ErodeDilatePluginSlice>(
    'erodeDilate',
    {
        enabled: true,
        brushPoints: [],
        isPainting: false,
        brushRadius: 30,
        amount: 3,
        mode: 'dilate',
    }
);

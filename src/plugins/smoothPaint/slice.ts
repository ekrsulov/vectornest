import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface SmoothPaintState extends Record<string, unknown> {
    enabled: boolean;
    brushRadius: number;
    smoothPoints: Point[];
    isSmoothing: boolean;
    /** 1–10: how aggressively to smooth */
    strength: number;
    /** Whether to preserve overall shape (limits movement) */
    preserveShape: boolean;
}

export interface SmoothPaintPluginSlice {
    smoothPaint: SmoothPaintState;
    updateSmoothPaintState: (state: Partial<SmoothPaintState>) => void;
}

export const createSmoothPaintPluginSlice: StateCreator<
    SmoothPaintPluginSlice,
    [],
    [],
    SmoothPaintPluginSlice
> = createSimplePluginSlice<'smoothPaint', SmoothPaintState, SmoothPaintPluginSlice>(
    'smoothPaint',
    {
        enabled: true,
        brushRadius: 30,
        smoothPoints: [],
        isSmoothing: false,
        strength: 5,
        preserveShape: true,
    }
);

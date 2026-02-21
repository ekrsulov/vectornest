import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface ScallopToolState extends Record<string, unknown> {
    enabled: boolean;
    scallopPoints: Point[];
    isScalloping: boolean;
    brushRadius: number;
    scallopSize: number;
    complexity: number;
}

export interface ScallopToolPluginSlice {
    scallopTool: ScallopToolState;
    updateScallopToolState: (state: Partial<ScallopToolState>) => void;
}

export const createScallopToolPluginSlice: StateCreator<
    ScallopToolPluginSlice,
    [],
    [],
    ScallopToolPluginSlice
> = createSimplePluginSlice<'scallopTool', ScallopToolState, ScallopToolPluginSlice>(
    'scallopTool',
    {
        enabled: true,
        scallopPoints: [],
        isScalloping: false,
        brushRadius: 30,
        scallopSize: 5,
        complexity: 3,
    }
);

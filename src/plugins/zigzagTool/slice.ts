import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface ZigzagToolState extends Record<string, unknown> {
    enabled: boolean;
    zigzagPoints: Point[];
    isDrawing: boolean;
    amplitude: number;
    frequency: number;
    style: 'zigzag' | 'sine' | 'square';
}

export interface ZigzagToolPluginSlice {
    zigzagTool: ZigzagToolState;
    updateZigzagToolState: (state: Partial<ZigzagToolState>) => void;
}

export const createZigzagToolPluginSlice: StateCreator<
    ZigzagToolPluginSlice,
    [],
    [],
    ZigzagToolPluginSlice
> = createSimplePluginSlice<'zigzagTool', ZigzagToolState, ZigzagToolPluginSlice>(
    'zigzagTool',
    {
        enabled: true,
        zigzagPoints: [],
        isDrawing: false,
        amplitude: 10,
        frequency: 8,
        style: 'zigzag',
    }
);

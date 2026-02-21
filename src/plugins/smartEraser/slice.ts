import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface SmartEraserState extends Record<string, unknown> {
    enabled: boolean;
    eraserPoints: Point[];
    isErasing: boolean;
    eraserSize: number;
}

export interface SmartEraserPluginSlice {
    smartEraser: SmartEraserState;
    updateSmartEraserState: (state: Partial<SmartEraserState>) => void;
}

export const createSmartEraserPluginSlice: StateCreator<
    SmartEraserPluginSlice,
    [],
    [],
    SmartEraserPluginSlice
> = createSimplePluginSlice<'smartEraser', SmartEraserState, SmartEraserPluginSlice>(
    'smartEraser',
    { enabled: true, eraserPoints: [], isErasing: false, eraserSize: 20 }
);

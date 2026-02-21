import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface ShapeCutterState extends Record<string, unknown> {
    enabled: boolean;
    cutterPoints: Point[];
    isCutting: boolean;
    mode: 'subtract' | 'intersect';
}

export interface ShapeCutterPluginSlice {
    shapeCutter: ShapeCutterState;
    updateShapeCutterState: (state: Partial<ShapeCutterState>) => void;
}

export const createShapeCutterPluginSlice: StateCreator<
    ShapeCutterPluginSlice,
    [],
    [],
    ShapeCutterPluginSlice
> = createSimplePluginSlice<'shapeCutter', ShapeCutterState, ShapeCutterPluginSlice>(
    'shapeCutter',
    { enabled: true, cutterPoints: [], isCutting: false, mode: 'subtract' }
);

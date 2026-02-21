import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface FractureToolState extends Record<string, unknown> {
    enabled: boolean;
    fracturePoints: Point[];
    isDrawing: boolean;
    numPieces: number;
    pattern: 'voronoi' | 'grid' | 'radial';
}

export interface FractureToolPluginSlice {
    fractureTool: FractureToolState;
    updateFractureToolState: (state: Partial<FractureToolState>) => void;
}

export const createFractureToolPluginSlice: StateCreator<
    FractureToolPluginSlice,
    [],
    [],
    FractureToolPluginSlice
> = createSimplePluginSlice<'fractureTool', FractureToolState, FractureToolPluginSlice>(
    'fractureTool',
    {
        enabled: true,
        fracturePoints: [],
        isDrawing: false,
        numPieces: 6,
        pattern: 'voronoi',
    }
);

import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface BlobBrushState extends Record<string, unknown> {
    enabled: boolean;
    brushPoints: Point[];
    isDrawing: boolean;
    brushSize: number;
}

export interface BlobBrushPluginSlice {
    blobBrush: BlobBrushState;
    updateBlobBrushState: (state: Partial<BlobBrushState>) => void;
}

export const createBlobBrushPluginSlice: StateCreator<
    BlobBrushPluginSlice,
    [],
    [],
    BlobBrushPluginSlice
> = createSimplePluginSlice<'blobBrush', BlobBrushState, BlobBrushPluginSlice>(
    'blobBrush',
    { enabled: true, brushPoints: [], isDrawing: false, brushSize: 20 }
);

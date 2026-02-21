import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export type PerspectiveMode = '1-point' | '2-point' | '3-point';

export interface PerspectiveGridState extends Record<string, unknown> {
    enabled: boolean;
    mode: PerspectiveMode;
    vp1: Point; // Vanishing point 1 (left/center)
    vp2: Point; // Vanishing point 2 (right)
    vp3: Point; // Vanishing point 3 (top/bottom)
    horizonY: number;
    gridDensity: number;
    snapEnabled: boolean;
    draggingVp: 'vp1' | 'vp2' | 'vp3' | 'horizon' | null;
}

export interface PerspectiveGridPluginSlice {
    perspectiveGrid: PerspectiveGridState;
    updatePerspectiveGridState: (state: Partial<PerspectiveGridState>) => void;
}

export const createPerspectiveGridPluginSlice: StateCreator<
    PerspectiveGridPluginSlice,
    [],
    [],
    PerspectiveGridPluginSlice
> = createSimplePluginSlice<'perspectiveGrid', PerspectiveGridState, PerspectiveGridPluginSlice>(
    'perspectiveGrid',
    {
        enabled: false,
        mode: '2-point',
        vp1: { x: 200, y: 400 },
        vp2: { x: 800, y: 400 },
        vp3: { x: 500, y: -200 },
        horizonY: 400,
        gridDensity: 10,
        snapEnabled: true,
        draggingVp: null,
    }
);

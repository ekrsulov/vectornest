import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface SprayCanState extends Record<string, unknown> {
    enabled: boolean;
    sprayPoints: Point[];
    isSpraying: boolean;
    sprayRadius: number;
    dotSize: number;
    density: number;
}

export interface SprayCanPluginSlice {
    sprayCan: SprayCanState;
    updateSprayCanState: (state: Partial<SprayCanState>) => void;
}

export const createSprayCanPluginSlice: StateCreator<
    SprayCanPluginSlice,
    [],
    [],
    SprayCanPluginSlice
> = createSimplePluginSlice<'sprayCan', SprayCanState, SprayCanPluginSlice>(
    'sprayCan',
    { enabled: true, sprayPoints: [], isSpraying: false, sprayRadius: 40, dotSize: 4, density: 8 }
);

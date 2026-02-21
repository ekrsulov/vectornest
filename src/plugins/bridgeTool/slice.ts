import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface BridgeToolState extends Record<string, unknown> {
    enabled: boolean;
    bridgePoints: Point[];
    isDrawing: boolean;
    bridgeWidth: number;
    smooth: boolean;
}

export interface BridgeToolPluginSlice {
    bridgeTool: BridgeToolState;
    updateBridgeToolState: (state: Partial<BridgeToolState>) => void;
}

export const createBridgeToolPluginSlice: StateCreator<
    BridgeToolPluginSlice,
    [],
    [],
    BridgeToolPluginSlice
> = createSimplePluginSlice<'bridgeTool', BridgeToolState, BridgeToolPluginSlice>(
    'bridgeTool',
    {
        enabled: true,
        bridgePoints: [],
        isDrawing: false,
        bridgeWidth: 8,
        smooth: true,
    }
);

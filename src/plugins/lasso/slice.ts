import type { StateCreator } from 'zustand';
import { DEFAULT_SELECTION_STRATEGY } from '../../constants';

export interface LassoPluginSlice {
  lassoEnabled: boolean;
  lassoPath: Array<{ x: number; y: number }>;
  lassoClosed: boolean;
  activeSelectionStrategy?: string;
  setLassoEnabled: (enabled: boolean) => void;
  setLassoPath: (path: Array<{ x: number; y: number }>) => void;
  clearLassoPath: () => void;
  setLassoClosed: (closed: boolean) => void;
  setActiveSelectionStrategy: (strategyId?: string) => void;
}

export const createLassoPluginSlice: StateCreator<
  LassoPluginSlice,
  [],
  [],
  LassoPluginSlice
> = (set) => ({
  lassoEnabled: false,
  lassoPath: [],
  lassoClosed: false, // Default to open lasso
  activeSelectionStrategy: undefined,
  setLassoEnabled: (enabled) => {
    set({ 
      lassoEnabled: enabled,
      activeSelectionStrategy: enabled ? 'lasso' : DEFAULT_SELECTION_STRATEGY
    });
  },
  setLassoPath: (path) => set({ lassoPath: path }),
  clearLassoPath: () => set({ lassoPath: [] }),
  setLassoClosed: (closed) => set({ lassoClosed: closed }),
  setActiveSelectionStrategy: (strategyId) => set({ activeSelectionStrategy: strategyId }),
});

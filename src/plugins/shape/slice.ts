import type { StateCreator } from 'zustand';
import type { Point } from '../../types';
import { createCustomPluginSlice } from '../../utils/pluginSliceHelpers';

export type ShapeType = 'square' | 'circle' | 'triangle' | 'rectangle' | 'line' | 'diamond' | 'heart';

export interface ShapePluginSlice {
  // State
  shape: {
    selectedShape: ShapeType;
    keepShapeMode: boolean;
    isCreating: boolean;
    startPoint: Point | null;
    endPoint: Point | null;
  };

  // Actions
  updateShapeState: (state: Partial<ShapePluginSlice['shape']>) => void;
  setShapeInteraction: (interaction: Partial<Pick<ShapePluginSlice['shape'], 'isCreating' | 'startPoint' | 'endPoint'>>) => void;
}

export const createShapePluginSlice: StateCreator<ShapePluginSlice, [], [], ShapePluginSlice> =
  createCustomPluginSlice<'shape', ShapePluginSlice['shape'], ShapePluginSlice>(
    'shape',
    {
      selectedShape: 'square',
      keepShapeMode: true,
      isCreating: false,
      startPoint: null,
      endPoint: null,
    },
    (set, get) => ({
      updateShapeState: (state) => {
        const current = get().shape;
        set({
          shape: { ...current, ...state },
        });
      },
      setShapeInteraction: (interaction) => {
        const current = get().shape;
        set({
          shape: {
            ...current,
            ...interaction,
          },
        });
      },
    })
  );
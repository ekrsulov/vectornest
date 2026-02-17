import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { NativeShapeElement } from './types';
import type { Point } from '../../types';

export interface NativeShapesPluginSlice {
  nativeShape: {
    kind: NativeShapeElement['data']['kind'];
    width: number;
    height: number;
    rx?: number;
    ry?: number;
    points?: { x: number; y: number }[];
    pointsCount?: number;
  };
  nativeShapeInteraction: {
    isCreating: boolean;
    startPoint: Point | null;
    endPoint: Point | null;
  };
  setNativeShapeSettings: (updates: Partial<NativeShapesPluginSlice['nativeShape']>) => void;
  setNativeShapeInteraction: (updates: Partial<NativeShapesPluginSlice['nativeShapeInteraction']>) => void;
}

export const createNativeShapesSlice: StateCreator<CanvasStore, [], [], NativeShapesPluginSlice> = (set) => ({
  nativeShape: {
    kind: 'rect',
    width: 100,
    height: 80,
    rx: 0,
    ry: 0,
    // Number of points for polygon/polyline templates (3..8)
    pointsCount: 3,
    // When undefined, the preview/creation code will generate templates based on pointsCount
    points: undefined,
  },
  nativeShapeInteraction: {
    isCreating: false,
    startPoint: null,
    endPoint: null,
  },
  setNativeShapeSettings: (updates) => set((state) => ({
    nativeShape: {
      ...(state.nativeShape ?? {}),
      ...updates,
    },
  })),
  setNativeShapeInteraction: (updates) => set((state) => ({
    nativeShapeInteraction: {
      ...(state.nativeShapeInteraction ?? { isCreating: false, startPoint: null, endPoint: null }),
      ...updates,
    },
  })),
});

import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

export interface ImagePluginSlice {
  image: {
    url: string;
    width: number;
    height: number;
    preserveAspectRatio: string;
    opacity: number;
  };
  setImageSettings: (updates: Partial<ImagePluginSlice['image']>) => void;
}

export const createImagePluginSlice: StateCreator<CanvasStore, [], [], ImagePluginSlice> = (set) => ({
  image: {
    url: '',
    width: 120,
    height: 120,
    preserveAspectRatio: 'none',
    opacity: 1,
  },
  setImageSettings: (updates) => set((state) => ({
    image: {
      ...(state.image ?? {}),
      ...updates,
    },
  })),
});

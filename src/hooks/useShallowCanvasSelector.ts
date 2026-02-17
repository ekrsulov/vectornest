import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import type { CanvasStore } from '../store/canvasStore';

export const useShallowCanvasSelector = <T>(selector: (state: CanvasStore) => T): T => {
  return useCanvasStore(useShallow(selector));
};

import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

export interface SvgStructureSlice {
  hoveredStructureElementId: string | null;
  setHoveredStructureElementId: (id: string | null) => void;
}

export const createSvgStructureSlice: StateCreator<CanvasStore, [], [], SvgStructureSlice> = (set) => ({
  hoveredStructureElementId: null,
  setHoveredStructureElementId: (id) => set({ hoveredStructureElementId: id }),
});

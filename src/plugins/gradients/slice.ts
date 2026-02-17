import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

type FullStore = CanvasStore & GradientsSlice;

export type GradientStop = { offset: number; color: string; opacity?: number; extraAttributes?: Record<string, unknown> };
export interface GradientDef {
  id: string;
  name: string;
  type: 'linear' | 'radial';
  rawContent?: string;
  preset?: boolean;
  // Optional reference to another gradient definition (xlink:href / href)
  href?: string;
  angle?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  fx?: number;
  fy?: number;
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  extraAttributes?: Record<string, unknown>;
  stops: GradientStop[];
}

export interface GradientsSlice {
  gradients: GradientDef[];
  addGradient: (gradient: GradientDef) => void;
  updateGradient: (id: string, updates: Partial<GradientDef>) => void;
  removeGradient: (id: string) => void;
}

export const createGradientsSlice: StateCreator<CanvasStore, [], [], GradientsSlice> = (set, get) => {
  // Preserve persisted state if it exists
  const currentState = get();
  const persistedGradients = (currentState as FullStore).gradients;

  // Default preset gradients
  const defaultGradients: GradientDef[] = [
    {
      id: 'grad-linear-1',
      name: 'Sunset',
      type: 'linear',
      angle: 0,
      stops: [
        { offset: 0, color: '#ff6b6b' },
        { offset: 100, color: '#ffd166' },
      ],
      preset: true,
    },
    {
      id: 'grad-linear-2',
      name: 'Ocean',
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#6ee7b7' },
        { offset: 100, color: '#1d4ed8' },
      ],
      preset: true,
    },
    {
      id: 'grad-linear-3',
      name: 'Dark Metal',
      type: 'linear',
      angle: 135,
      stops: [
        { offset: 0, color: '#111827' },
        { offset: 50, color: '#374151' },
        { offset: 100, color: '#9ca3af' },
      ],
      preset: true,
    },
    {
      id: 'grad-linear-4',
      name: 'Orange Sun',
      type: 'linear',
      angle: 60,
      stops: [
        { offset: 0, color: '#f97316' },
        { offset: 100, color: '#fde68a' },
      ],
      preset: true,
    },
    {
      id: 'grad-linear-5',
      name: 'Purple Haze',
      type: 'linear',
      angle: 45,
      stops: [
        { offset: 0, color: '#6366f1' },
        { offset: 100, color: '#a855f7' },
      ],
      preset: true,
    },
    {
      id: 'grad-linear-6',
      name: 'Blue Sky',
      type: 'linear',
      angle: 120,
      stops: [
        { offset: 0, color: '#0ea5e9' },
        { offset: 50, color: '#22d3ee' },
        { offset: 100, color: '#a7f3d0' },
      ],
      preset: true,
    },
    {
      id: 'grad-radial-1',
      name: 'Teal Radial',
      type: 'radial',
      cx: 50,
      cy: 50,
      r: 70,
      stops: [
        { offset: 0, color: '#14b8a6' },
        { offset: 100, color: '#0ea5e9' },
      ],
      preset: true,
    },
    {
      id: 'grad-radial-2',
      name: 'Orange Radial',
      type: 'radial',
      cx: 40,
      cy: 40,
      fx: 30,
      fy: 30,
      r: 70,
      stops: [
        { offset: 0, color: '#f97316' },
        { offset: 100, color: '#fde68a' },
      ],
      preset: true,
    },
    {
      id: 'grad-radial-3',
      name: 'Dark Radial',
      type: 'radial',
      cx: 50,
      cy: 50,
      r: 60,
      stops: [
        { offset: 0, color: '#1e293b' },
        { offset: 100, color: '#475569' },
      ],
      preset: true,
    },
    {
      id: 'grad-radial-4',
      name: 'Red Radial',
      type: 'radial',
      cx: 50,
      cy: 50,
      r: 70,
      fx: 30,
      fy: 30,
      stops: [
        { offset: 0, color: '#ef4444' },
        { offset: 100, color: '#fda4af' },
      ],
      preset: true,
    },
    {
      id: 'grad-radial-5',
      name: 'Green Radial',
      type: 'radial',
      cx: 60,
      cy: 40,
      r: 80,
      stops: [
        { offset: 0, color: '#10b981' },
        { offset: 100, color: '#22c55e' },
      ],
      preset: true,
    },
    {
      id: 'grad-radial-6',
      name: 'Blue Radial',
      type: 'radial',
      cx: 50,
      cy: 50,
      r: 90,
      stops: [
        { offset: 0, color: '#3b82f6' },
        { offset: 100, color: '#a5b4fc' },
      ],
      preset: true,
    },
  ];

  return {
    gradients: Array.isArray(persistedGradients) && persistedGradients.length > 0 ? persistedGradients : defaultGradients,
    addGradient: (gradient) => set((state) => ({
      gradients: [...(state as FullStore).gradients, gradient],
    })),
    updateGradient: (id, updates) => set((state) => ({
      gradients: (state as FullStore).gradients.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
    })),
    removeGradient: (id) => set((state) => {
      const fullState = state as FullStore;
      const gradients = fullState.gradients.filter((g) => g.id !== id);

      // Clean elements using the deleted gradient
      const defaultFill = fullState.style?.fillColor ?? 'none';
      const defaultStroke = fullState.style?.strokeColor ?? '#000000';
      const cleanedElements = fullState.elements?.map((el) => {
        const data = el.data as Record<string, unknown>;
        let changed = false;
        if (data.fillColor === `url(#${id})`) {
          data.fillColor = defaultFill;
          changed = true;
        }
        if (data.strokeColor === `url(#${id})`) {
          data.strokeColor = defaultStroke;
          changed = true;
        }
        if (changed) {
          return { ...el, data };
        }
        return el;
      }) ?? fullState.elements;

      return {
        gradients,
        elements: cleanedElements,
      };
    }),

    // Called by the LibrarySearchPanel to focus a gradient in the panel
    selectedFromSearch: null,
    selectFromSearch: (id: string | null) => set(() => ({ selectedFromSearch: id })),
  };
};

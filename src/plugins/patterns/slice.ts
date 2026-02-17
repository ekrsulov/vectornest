import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

type FullStore = CanvasStore & PatternsSlice;

export interface PatternDef {
  id: string;
  name: string;
  size: number;
  fg: string;
  bg: string;
  type: 'stripes' | 'dots' | 'grid' | 'crosshatch' | 'checker' | 'diamonds' | 'raw';
  patternUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  scale?: number;
  width?: number;
  height?: number;
  patternTransform?: string;
  rawContent?: string;
}

export interface PatternsSlice {
  patterns: PatternDef[];
  addPattern: (pattern: PatternDef) => void;
  updatePattern: (id: string, updates: Partial<PatternDef>) => void;
  removePattern: (id: string) => void;
}

export const createPatternsSlice: StateCreator<CanvasStore, [], [], PatternsSlice> = (set, get) => {
  // Preserve persisted state if it exists
  const currentState = get();
  const persistedPatterns = (currentState as FullStore).patterns;

  // Default preset patterns
  const defaultPatterns: PatternDef[] = [
    { id: 'pattern-stripes-1', name: 'Stripes', type: 'stripes', size: 8, fg: '#94a3b8', bg: '#e2e8f0' },
    { id: 'pattern-dots-1', name: 'Dots', type: 'dots', size: 6, fg: '#0ea5e9', bg: '#ecfeff' },
    { id: 'pattern-grid-1', name: 'Grid', type: 'grid', size: 10, fg: '#64748b', bg: '#f8fafc' },
    { id: 'pattern-cross-1', name: 'Crosshatch', type: 'crosshatch', size: 10, fg: '#94a3b8', bg: '#f8fafc' },
    { id: 'pattern-checker-1', name: 'Checker', type: 'checker', size: 12, fg: '#475569', bg: '#e2e8f0' },
    { id: 'pattern-diamond-1', name: 'Diamonds', type: 'diamonds', size: 12, fg: '#0f172a', bg: '#e5e7eb' },
  ];

  return {
    patterns: Array.isArray(persistedPatterns) && persistedPatterns.length > 0 ? persistedPatterns : defaultPatterns,
    addPattern: (pattern) => set((state) => ({
      patterns: [...(state as FullStore).patterns, pattern],
    })),
    updatePattern: (id, updates) => set((state) => ({
      patterns: (state as FullStore).patterns.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
    removePattern: (id) => set((state) => {
      const fullState = state as FullStore;
      const patterns = fullState.patterns.filter((p) => p.id !== id);

      // Clean elements using the deleted pattern
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
        patterns,
        elements: cleanedElements,
      };
    }),

    // Focus a pattern from search
    selectedFromSearch: null,
    selectFromSearch: (id: string | null) => set(() => ({ selectedFromSearch: id })),

  };
};

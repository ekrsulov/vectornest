/**
 * Paints Plugin Slice
 * Manages state for the paints panel (colors, gradients, patterns used in the canvas)
 */

import type { StateCreator } from 'zustand';

export interface PaintsState {
  /** Whether the paints panel is enabled */
  enabled: boolean;
  /** Number of paints to show in the list */
  maxPaintsToShow: number;
  /** Whether to split paints by opacity (same color with different opacity = different paints) */
  splitByOpacity: boolean;
  /** Target for applying colors when elements are selected: 'fill' | 'stroke' | 'both' */
  applyTarget: 'fill' | 'stroke';
}

export interface PaintsSlice {
  paints: PaintsState;
  updatePaintsState: (updates: Partial<PaintsState>) => void;
  resetPaintsState: () => void;
}

const initialState: PaintsState = {
  enabled: true,
  maxPaintsToShow: 7,
  splitByOpacity: false,
  applyTarget: 'fill',
};

export const createPaintsSlice: StateCreator<PaintsSlice, [], [], PaintsSlice> = (set) => ({
  paints: initialState,

  updatePaintsState: (updates) => {
    set((state) => ({
      paints: { ...state.paints, ...updates },
    }));
  },

  resetPaintsState: () => {
    set({ paints: initialState });
  },
});

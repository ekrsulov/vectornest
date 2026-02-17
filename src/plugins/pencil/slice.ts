import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

/**
 * Pencil plugin slice - contains only pencil-specific settings.
 * Shared style properties (strokeColor, strokeWidth, etc.) are in StyleSlice.
 */
export interface PencilPluginSlice {
  // State
  pencil: {
    // Pencil-specific settings only
    reusePath: boolean;
    simplificationTolerance: number;
  };

  // Actions
  updatePencilState: (state: Partial<PencilPluginSlice['pencil']>) => void;
}

export const createPencilPluginSlice: StateCreator<PencilPluginSlice, [], [], PencilPluginSlice> =
  createSimplePluginSlice<'pencil', PencilPluginSlice['pencil'], PencilPluginSlice>(
    'pencil',
    {
      reusePath: false,
      simplificationTolerance: 0,
    }
  );
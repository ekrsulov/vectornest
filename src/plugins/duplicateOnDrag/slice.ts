import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface DuplicateOnDragPluginSlice {
  duplicateOnDrag: {
    isDuplicating: boolean;
    originalElementId: string | null;
    duplicatedElementId: string | null;
    startPoint: { x: number; y: number } | null;
  };
  updateDuplicateOnDragState: (state: Partial<DuplicateOnDragPluginSlice['duplicateOnDrag']>) => void;
}

export const createDuplicateOnDragPluginSlice: StateCreator<
  DuplicateOnDragPluginSlice,
  [],
  [],
  DuplicateOnDragPluginSlice
> = createSimplePluginSlice<'duplicateOnDrag', DuplicateOnDragPluginSlice['duplicateOnDrag'], DuplicateOnDragPluginSlice>(
  'duplicateOnDrag',
  {
    isDuplicating: false,
    originalElementId: null,
    duplicatedElementId: null,
    startPoint: null,
  }
);

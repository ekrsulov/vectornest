import type { StateCreator } from 'zustand';

export interface SymmetryMirrorState extends Record<string, unknown> {
  /** Whether auto-mirroring is active */
  enabled: boolean;
  /** IDs of elements created by the mirror system (to avoid re-mirroring) */
  mirroredIds: string[];
  /** Whether to mirror stroke properties too */
  mirrorStyle: boolean;
  /** Whether to group original + mirrors together */
  autoGroup: boolean;
}

export interface SymmetryMirrorPluginSlice {
  symmetryMirror: SymmetryMirrorState;
  updateSymmetryMirrorState: (state: Partial<SymmetryMirrorState>) => void;
  addMirroredId: (id: string) => void;
  clearMirroredIds: () => void;
}

const initialState: SymmetryMirrorState = {
  enabled: false,
  mirroredIds: [],
  mirrorStyle: true,
  autoGroup: false,
};

export const createSymmetryMirrorSlice: StateCreator<
  SymmetryMirrorPluginSlice,
  [],
  [],
  SymmetryMirrorPluginSlice
> = (set) => ({
  symmetryMirror: { ...initialState },

  updateSymmetryMirrorState: (updates) => {
    set((state) => ({
      symmetryMirror: { ...state.symmetryMirror, ...updates },
    }));
  },

  addMirroredId: (id: string) => {
    set((state) => ({
      symmetryMirror: {
        ...state.symmetryMirror,
        mirroredIds: [...state.symmetryMirror.mirroredIds, id],
      },
    }));
  },

  clearMirroredIds: () => {
    set((state) => ({
      symmetryMirror: { ...state.symmetryMirror, mirroredIds: [] },
    }));
  },
});

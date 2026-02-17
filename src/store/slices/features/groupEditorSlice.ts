import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';

export interface GroupEditorState {
  activeGroupId: string | null;
  isEditing: boolean;
  localTransforms: boolean;
}

export interface GroupEditorSlice {
  groupEditor: GroupEditorState;
  enterGroupEditor: (groupId: string) => void;
  exitGroupEditor: () => void;
  resetGroupEditor: () => void;
}

const INITIAL_STATE: GroupEditorState = {
  activeGroupId: null,
  isEditing: false,
  localTransforms: true,
};

export const createGroupEditorSlice: StateCreator<CanvasStore, [], [], GroupEditorSlice> = (set) => ({
  groupEditor: { ...INITIAL_STATE },

  enterGroupEditor: (groupId) => {
    set((state) => ({
      groupEditor: {
        ...state.groupEditor,
        activeGroupId: groupId,
        isEditing: true,
        localTransforms: true,
      },
    }));
  },

  exitGroupEditor: () => {
    set((state) => ({
      groupEditor: {
        ...state.groupEditor,
        activeGroupId: null,
        isEditing: false,
      },
    }));
  },

  resetGroupEditor: () => {
    set({ groupEditor: { ...INITIAL_STATE } });
  },
});

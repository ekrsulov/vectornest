import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

/**
 * State for inline (on-canvas) text editing of nativeText elements.
 * This is ephemeral UI state — not persisted or tracked by undo/redo.
 */
export interface InlineTextEditState extends Record<string, unknown> {
  /** ID of the element currently being inline-edited, or null */
  editingElementId: string | null;
}

export interface InlineTextEditSlice {
  inlineTextEdit: InlineTextEditState;
  startInlineTextEdit: (elementId: string) => void;
  stopInlineTextEdit: () => void;
}

export const createInlineTextEditSlice: StateCreator<
  CanvasStore,
  [],
  [],
  InlineTextEditSlice
> = (set) => ({
  inlineTextEdit: {
    editingElementId: null,
  },
  startInlineTextEdit: (elementId: string) =>
    set(() => ({
      inlineTextEdit: { editingElementId: elementId },
    })),
  stopInlineTextEdit: () =>
    set(() => ({
      inlineTextEdit: { editingElementId: null },
    })),
});

import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { Bounds } from '../../utils/boundsUtils';

/**
 * State for inline (on-canvas) text editing of nativeText elements.
 * This is ephemeral UI state — not persisted or tracked by undo/redo.
 */
export interface InlineTextEditState extends Record<string, unknown> {
  /** ID of the element currently being inline-edited, or null */
  editingElementId: string | null;
  /** Live measured bounds for the draft text while editing */
  previewBounds: Bounds | null;
  /** True when the inline editor has completed initial positioning and can replace the source text */
  isEditorReady: boolean;
}

export interface InlineTextEditSlice {
  inlineTextEdit: InlineTextEditState;
  startInlineTextEdit: (elementId: string) => void;
  stopInlineTextEdit: () => void;
  setInlineTextEditPreviewBounds: (bounds: Bounds | null) => void;
  setInlineTextEditReady: (ready: boolean) => void;
}

export const createInlineTextEditSlice: StateCreator<
  CanvasStore,
  [],
  [],
  InlineTextEditSlice
> = (set) => ({
  inlineTextEdit: {
    editingElementId: null,
    previewBounds: null,
    isEditorReady: false,
  },
  startInlineTextEdit: (elementId: string) =>
    set(() => ({
      inlineTextEdit: {
        editingElementId: elementId,
        previewBounds: null,
        isEditorReady: false,
      },
    })),
  stopInlineTextEdit: () =>
    set(() => ({
      inlineTextEdit: {
        editingElementId: null,
        previewBounds: null,
        isEditorReady: false,
      },
    })),
  setInlineTextEditPreviewBounds: (bounds) =>
    set((state) => ({
      inlineTextEdit: {
        ...(state as CanvasStore & InlineTextEditSlice).inlineTextEdit,
        previewBounds: bounds,
      },
    })),
  setInlineTextEditReady: (ready) =>
    set((state) => ({
      inlineTextEdit: {
        ...(state as CanvasStore & InlineTextEditSlice).inlineTextEdit,
        isEditorReady: ready,
      },
    })),
});

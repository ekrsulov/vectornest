import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { Bounds } from '../../utils/boundsUtils';
import type { TextSelectionOffsets } from '../../utils/contentEditableSelection';

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
  /** Current plain-text selection inside the inline editor */
  selection: TextSelectionOffsets | null;
}

export interface InlineTextEditSlice {
  inlineTextEdit: InlineTextEditState;
  startInlineTextEdit: (elementId: string) => void;
  stopInlineTextEdit: () => void;
  setInlineTextEditPreviewBounds: (bounds: Bounds | null) => void;
  setInlineTextEditReady: (ready: boolean) => void;
  setInlineTextEditSelection: (selection: TextSelectionOffsets | null) => void;
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
    selection: null,
  },
  startInlineTextEdit: (elementId: string) =>
    set(() => ({
      inlineTextEdit: {
        editingElementId: elementId,
        previewBounds: null,
        isEditorReady: false,
        selection: null,
      },
    })),
  stopInlineTextEdit: () =>
    set(() => ({
      inlineTextEdit: {
        editingElementId: null,
        previewBounds: null,
        isEditorReady: false,
        selection: null,
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
  setInlineTextEditSelection: (selection) =>
    set((state) => {
      const currentSelection = (state as CanvasStore & InlineTextEditSlice).inlineTextEdit.selection;
      if (
        currentSelection?.start === selection?.start &&
        currentSelection?.end === selection?.end
      ) {
        return state;
      }

      return {
        inlineTextEdit: {
          ...(state as CanvasStore & InlineTextEditSlice).inlineTextEdit,
          selection,
        },
      };
    }),
});

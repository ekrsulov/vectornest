/**
 * Clipboard Plugin Slice
 * Manages clipboard state for copy/cut/paste operations
 */

import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../types';

// Internal format schema version for cross-instance compatibility
export const CLIPBOARD_SCHEMA_VERSION = '1.0.0';

// Custom MIME type for VectorNest internal format
export const VECTORNEST_MIME_TYPE = 'application/vnd.vectornest.selection+json';

/**
 * Internal clipboard data structure for cross-instance paste
 */
export interface ClipboardInternalData {
  schemaVersion: string;
  appVersion: string;
  documentUnits: 'px' | 'mm';
  dpi?: number;
  /** The serialized elements with their full data */
  elements: CanvasElement[];
  /** Bounding box of the original selection */
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  /** Original viewport position for paste-in-place */
  origin: { x: number; y: number };
  /** Serialized defs (gradients, patterns, filters, etc.) */
  defs: {
    gradients?: unknown[];
    patterns?: unknown[];
    filters?: unknown[];
    clipPaths?: unknown[];
    masks?: unknown[];
    markers?: unknown[];
    symbols?: unknown[];
  };
  /** Map of original IDs for reference */
  idMap: Record<string, string>;
  /** Timestamp of the copy operation */
  timestamp: number;
}

export interface ClipboardState {
  /** Whether clipboard contains VectorNest data */
  hasInternalData: boolean;
  /** Number of consecutive pastes (for offset cascading) */
  pasteCount: number;
  /** Last paste position for offset calculation */
  lastPastePosition: { x: number; y: number } | null;
  /** Whether a cut operation is pending (elements should be deleted after paste) */
  isCutOperation: boolean;
  /** IDs of elements that were cut (to delete after paste) */
  cutElementIds: string[];
  /** Status message for user feedback */
  statusMessage: string | null;
  /** Whether clipboard operations are enabled */
  enabled: boolean;
}

export interface ClipboardSlice {
  clipboard: ClipboardState;
  updateClipboardState: (updates: Partial<ClipboardState>) => void;
  resetClipboardState: () => void;
  /** Copy selected elements to clipboard */
  copyToClipboard: () => Promise<void>;
  /** Cut selected elements (copy + mark for deletion) */
  cutToClipboard: () => Promise<void>;
  /** Paste from clipboard */
  pasteFromClipboard: (inPlace?: boolean) => Promise<void>;
  /** Check if clipboard has pasteable content */
  checkClipboardContent: () => Promise<boolean>;
  /** Reset paste offset counter */
  resetPasteCount: () => void;
}

const initialState: ClipboardState = {
  hasInternalData: false,
  pasteCount: 0,
  lastPastePosition: null,
  isCutOperation: false,
  cutElementIds: [],
  statusMessage: null,
  enabled: true,
};

export const createClipboardSlice: StateCreator<ClipboardSlice, [], [], ClipboardSlice> = (set, get) => ({
  clipboard: initialState,

  updateClipboardState: (updates) => {
    set((state) => ({
      clipboard: { ...state.clipboard, ...updates },
    }));
  },

  resetClipboardState: () => {
    set({ clipboard: initialState });
  },

  resetPasteCount: () => {
    set((state) => ({
      clipboard: {
        ...state.clipboard,
        pasteCount: 0,
        lastPastePosition: null,
      },
    }));
  },

  copyToClipboard: async () => {
    // Implementation in actions.ts - will be connected via plugin init
    const slice = get();
    slice.updateClipboardState({
      isCutOperation: false,
      cutElementIds: [],
      statusMessage: 'Copied to clipboard',
    });
  },

  cutToClipboard: async () => {
    // Implementation in actions.ts - will be connected via plugin init
    const slice = get();
    slice.updateClipboardState({
      isCutOperation: true,
      statusMessage: 'Cut to clipboard',
    });
  },

  pasteFromClipboard: async () => {
    // Implementation in actions.ts - will be connected via plugin init
    const slice = get();
    slice.updateClipboardState({
      pasteCount: slice.clipboard.pasteCount + 1,
      statusMessage: 'Pasted from clipboard',
    });
  },

  checkClipboardContent: async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('image/svg+xml') ||
            item.types.includes('text/html') ||
            item.types.includes('text/plain') ||
            item.types.includes('image/png')) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },
});

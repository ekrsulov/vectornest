import type { StateCreator } from 'zustand';
import type { PenMode, PenPath, PenAnchorPoint, PenCursorState, PenDragState, PenHoverTarget } from './types';
import type { PenGuidelineMatch } from './utils/penGuidelines';

/**
 * Active guidelines state for pen tool
 */
export interface PenActiveGuidelines {
    horizontal: PenGuidelineMatch | null;
    vertical: PenGuidelineMatch | null;
}

/**
 * Pen Plugin State Interface
 * Stroke/fill settings come from central pencil state
 */
export interface PenPluginSlice {
    pen: {
        // Drawing state
        mode: PenMode;
        currentPath: PenPath | null;

        // Path history for undo/redo during drawing
        pathHistory: PenPath[];
        pathHistoryIndex: number;

        // Preview state
        rubberBandEnabled: boolean;
        previewAnchor: PenAnchorPoint | null;

        // Interaction state
        cursorState: PenCursorState;
        dragState: PenDragState | null;
        activeAnchorIndex: number | null;
        hoverTarget: PenHoverTarget | null;

        // Editing state
        editingPathId: string | null;
        editingSubPathIndex: number | null;
        selectedAnchorIndex: number | null;

        // Preferences
        autoAddDelete: boolean;
        snapToPoints: boolean;
        showHandleDistance: boolean;
        
        // Guidelines state
        guidelinesEnabled: boolean;
        activeGuidelines: PenActiveGuidelines | null;
    };
    updatePenState: (state: Partial<PenPluginSlice['pen']>) => void;
}

/**
 * Create Pen Plugin Slice
 */
export const createPenPluginSlice: StateCreator<PenPluginSlice> = (set) => ({
    pen: {
        mode: 'idle',
        currentPath: null,
        pathHistory: [],
        pathHistoryIndex: -1,
        rubberBandEnabled: true,
        previewAnchor: null,
        cursorState: 'new-path',
        dragState: null,
        activeAnchorIndex: null,
        hoverTarget: null,
        editingPathId: null,
        editingSubPathIndex: null,
        selectedAnchorIndex: null,
        autoAddDelete: false,
        snapToPoints: false,
        showHandleDistance: false,
        guidelinesEnabled: true,
        activeGuidelines: null,
    },
    updatePenState: (newState) =>
        set((state) => ({
            pen: {
                ...state.pen,
                ...newState,
            },
        })),
});

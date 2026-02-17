import type { StateCreator } from 'zustand';
import type { Point } from '../../../types';
import { setCursorPosition } from '../../../snap/cursorPositionStore';

/**
 * Global snap points configuration slice
 * Controls visualization and behavior of snap points across all plugins
 */
export interface SnapPointsSlice {
    snapPoints: {
        // Visualization
        showSnapPoints: boolean;
        snapPointsOpacity: number; // 0-100
        snapThreshold: number; // in screen pixels

        // Snap types
        snapToAnchors: boolean;
        snapToMidpoints: boolean;
        snapToPath: boolean;
        snapToBBoxCorners: boolean;
        snapToBBoxCenter: boolean;
        snapToIntersections: boolean;
    };

    updateSnapPointsState: (state: Partial<SnapPointsSlice['snapPoints']>) => void;
    /**
     * Updates cursor position for snap point proximity filtering.
     * Delegates to the lightweight external cursor position store to avoid
     * triggering Zustand middleware (undo/persist) on every pointermove.
     */
    updateCursorPosition: (position: Point | null) => void;
}

export const createSnapPointsSlice: StateCreator<
    SnapPointsSlice,
    [],
    [],
    SnapPointsSlice
> = (set) => ({
    snapPoints: {
        // Visualization defaults
        showSnapPoints: false,
        snapPointsOpacity: 50,
        snapThreshold: 10,

        // Snap types - all enabled by default
        snapToAnchors: true,
        snapToMidpoints: true,
        snapToPath: true,
        snapToBBoxCorners: true,
        snapToBBoxCenter: true,
        snapToIntersections: true,
    },

    updateSnapPointsState: (updates) => {
        set((state) => ({
            snapPoints: {
                ...state.snapPoints,
                ...updates,
            },
        }));
    },

    updateCursorPosition: (position) => {
        // Delegate to lightweight external store — avoids Zustand middleware overhead
        setCursorPosition(position);
    },
});

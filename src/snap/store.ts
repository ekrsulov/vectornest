import { create } from 'zustand';
import type { StoreApi } from 'zustand';
import type { SnapResult, SnapPoint } from './types';

interface SnapStore {
    snapResult: SnapResult | null;
    allAvailableSnapPoints: SnapPoint[];
    /** Whether the snap crosshair is currently being displayed */
    isShowingSnapCrosshair: boolean;
    setSnapResult: (result: SnapResult | null) => void;
    setAllAvailableSnapPoints: (points: SnapPoint[]) => void;
    clearSnapResult: () => void;
    setIsShowingSnapCrosshair: (showing: boolean) => void;
}

/**
 * Helper to check if two snap results are effectively the same.
 * This prevents unnecessary re-renders during rapid pointermove events.
 */
function areSnapResultsEqual(a: SnapResult | null, b: SnapResult | null): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    
    // Compare the essential properties that affect rendering
    return (
        a.snappedPoint.x === b.snappedPoint.x &&
        a.snappedPoint.y === b.snappedPoint.y &&
        a.snapPoints.length === b.snapPoints.length
    );
}

export const useSnapStore = create<SnapStore>((set, get) => ({
    snapResult: null,
    allAvailableSnapPoints: [],
    isShowingSnapCrosshair: false,
    setSnapResult: (result) => {
        // Only update if the result has actually changed
        // This prevents excessive re-renders during rapid pointermove events
        if (!areSnapResultsEqual(get().snapResult, result)) {
            set({ snapResult: result });
        }
    },
    setAllAvailableSnapPoints: (points) => set({ allAvailableSnapPoints: points }),
    clearSnapResult: () => {
        // Only clear if there's something to clear
        if (get().snapResult !== null) {
            set({ snapResult: null });
        }
    },
    setIsShowingSnapCrosshair: (showing) => {
        if (get().isShowingSnapCrosshair !== showing) {
            set({ isShowingSnapCrosshair: showing });
        }
    },
}));

/**
 * Imperative API for snap store access outside React components.
 * Use this in event handlers, callbacks, and other non-React code.
 */
export const snapStoreApi: StoreApi<SnapStore> = useSnapStore as unknown as StoreApi<SnapStore>;

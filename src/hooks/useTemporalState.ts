import { useSyncExternalStore } from 'react';
import { useCanvasStore } from '../store/canvasStore';

/**
 * Custom hook to subscribe to temporal state changes (undo/redo history).
 * Returns the temporal state including undo, redo functions and history lengths.
 * 
 * Uses useSyncExternalStore for proper concurrent mode support and
 * automatic handling of subscription lifecycle.
 */
export function useTemporalState() {
  return useSyncExternalStore(
    useCanvasStore.temporal.subscribe,
    useCanvasStore.temporal.getState,
    useCanvasStore.temporal.getState // SSR fallback (same as client)
  );
}

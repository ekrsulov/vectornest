import type { Point } from '../types';

/**
 * Lightweight external store for cursor position.
 * 
 * Cursor position updates happen on every pointermove event (~60Hz).
 * Storing it in the main Zustand store triggered the temporal middleware
 * equality check and persist middleware on every move — extremely wasteful
 * for a transient value that shouldn't be in undo history.
 * 
 * This module provides a minimal pub/sub store that React components
 * can subscribe to via useSyncExternalStore.
 */

let cursorPosition: Point | null = null;
const listeners = new Set<() => void>();

export function getCursorPosition(): Point | null {
  return cursorPosition;
}

export function setCursorPosition(position: Point | null): void {
  cursorPosition = position;
  listeners.forEach((listener) => listener());
}

export function subscribeCursorPosition(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

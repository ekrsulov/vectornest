import { useSyncExternalStore, useCallback, useRef, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { CanvasElement } from '../types';

type CanvasStoreState = ReturnType<typeof useCanvasStore.getState>;
type DragEndUpdateGuard<T> = (params: {
  previousValue: T;
  nextValue: T;
  previousState: CanvasStoreState;
  nextState: CanvasStoreState;
}) => boolean;

/** Shape of drag-related state fields from various plugin slices. */
interface DragRelatedState {
  isDraggingElements?: boolean;
  editingPoint?: { isDragging?: boolean };
  draggingSelection?: { isDragging?: boolean };
  draggingSubpaths?: { isDragging?: boolean };
  transformState?: { isTransforming?: boolean };
  advancedTransformState?: { isTransforming?: boolean };
  transformation?: { isTransforming?: boolean };
}

const isDragInteractionActive = (state: CanvasStoreState): boolean => {
  const s = state as CanvasStoreState & DragRelatedState;

  return Boolean(
    s.isDraggingElements ||
      s.editingPoint?.isDragging ||
      s.draggingSelection?.isDragging ||
      s.draggingSubpaths?.isDragging ||
      s.transformState?.isTransforming ||
      s.advancedTransformState?.isTransforming ||
      s.transformation?.isTransforming
  );
};

export const useFrozenCanvasStoreValueDuringDrag = <T>(
  selector: (state: CanvasStoreState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
  shouldUpdateAfterDrag?: DragEndUpdateGuard<T>
): T => {
  const initialState = useCanvasStore.getState();
  const cachedValueRef = useRef<T>(selector(initialState));
  const baselineStateRef = useRef<CanvasStoreState>(initialState);
  const wasDraggingRef = useRef(false);

  // Use refs for selector/isEqual to keep the subscription stable
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);
  const shouldUpdateAfterDragRef = useRef(shouldUpdateAfterDrag);
  useEffect(() => {
    selectorRef.current = selector;
    isEqualRef.current = isEqual;
    shouldUpdateAfterDragRef.current = shouldUpdateAfterDrag;
  });

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return useCanvasStore.subscribe((state) => {
        const isNowDragging = isDragInteractionActive(state);

        if (isNowDragging) {
          if (!wasDraggingRef.current) {
            cachedValueRef.current = selectorRef.current(state);
          }
          wasDraggingRef.current = true;
          return;
        }

        const nextValue = selectorRef.current(state);
        const previousValue = cachedValueRef.current;
        const previousState = baselineStateRef.current;
        const endedDragging = wasDraggingRef.current;
        wasDraggingRef.current = false;

        if (
          endedDragging &&
          shouldUpdateAfterDragRef.current &&
          !shouldUpdateAfterDragRef.current({
            previousValue,
            nextValue,
            previousState,
            nextState: state,
          })
        ) {
          baselineStateRef.current = state;
          return;
        }

        baselineStateRef.current = state;

        if (isEqualRef.current(previousValue, nextValue)) {
          return;
        }

        cachedValueRef.current = nextValue;
        onStoreChange();
      });
    },
    [] // stable — never re-subscribes
  );

  const getSnapshot = useCallback(() => cachedValueRef.current, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

const selectElements = (state: CanvasStoreState): CanvasElement[] => state.elements;

/**
 * Custom hook to get elements from store, but freeze updates during dragging.
 * 
 * This prevents re-renders of sidebar panels when element positions change
 * during drag operations (element dragging, transform handles, point/subpath editing).
 *
 * The panel only updates:
 * 1. When not dragging (normal behavior)
 * 2. When dragging ends (to show final positions)
 * 
 * During the drag itself (pointerdown -> pointermove -> pointerup),
 * the elements array remains stable and does not trigger re-renders.
 * 
 * Uses useSyncExternalStore for proper concurrent mode support.
 */
export const useFrozenElementsDuringDrag = (): CanvasElement[] => {
  return useFrozenCanvasStoreValueDuringDrag(selectElements);
};

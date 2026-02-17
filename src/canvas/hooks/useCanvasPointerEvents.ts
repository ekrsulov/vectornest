import { useCallback } from 'react';
import type { Point } from '../../types';
import type { InteractionHelpers, PointerState } from '../../types/interaction';
import type { CanvasEventBus, CanvasPointerEventHelpers } from '../CanvasEventBusContext';

interface UseCanvasPointerEventsProps {
    eventBus: CanvasEventBus;
    currentMode: string;
    helpers: React.MutableRefObject<InteractionHelpers>;
    stateRefs: { pointer: React.MutableRefObject<PointerState> };
    setDragStart: (point: Point | null) => void;
    setIsDragging: (isDragging: boolean) => void;
    setHasDragMoved: (hasMoved: boolean) => void;
}

export const useCanvasPointerEvents = ({
    eventBus,
    currentMode,
    helpers,
    stateRefs,
    setDragStart,
    setIsDragging,
    setHasDragMoved,
}: UseCanvasPointerEventsProps) => {
    const emitPointerEvent = useCallback(
        (type: 'pointerdown' | 'pointermove' | 'pointerup', event: PointerEvent, point: Point) => {
            const helpersSnapshot = helpers.current;
            const state = stateRefs.pointer.current;
            const target = (event.target as Element) ?? null;

            eventBus.emit(type, {
                event,
                point,
                target,
                activePlugin: currentMode,
                helpers: {
                    beginSelectionRectangle: helpersSnapshot.beginSelectionRectangle,
                    updateSelectionRectangle: helpersSnapshot.updateSelectionRectangle,
                    completeSelectionRectangle: helpersSnapshot.completeSelectionRectangle,
                    setDragStart,
                    setIsDragging,
                    setHasDragMoved,
                } as CanvasPointerEventHelpers,
                state: {
                    isSelecting: state.isSelecting,
                    isDragging: state.isDragging,
                    dragStart: state.dragStart,
                    hasDragMoved: state.hasDragMoved,
                },
            });
        },
        [eventBus, currentMode, helpers, stateRefs, setDragStart, setIsDragging, setHasDragMoved]
    );

    return { emitPointerEvent };
};

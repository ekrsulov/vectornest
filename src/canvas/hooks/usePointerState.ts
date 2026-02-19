import { useState, useRef, useLayoutEffect, useMemo } from 'react';
import type { Point } from '../../types';

export interface PointerStateSnapshot {
    isSelecting: boolean;
    isDragging: boolean;
    dragStart: Point | null;
    hasDragMoved: boolean;
}

interface UsePointerStateProps {
    isSelecting: boolean;
}

export const usePointerState = ({ isSelecting }: UsePointerStateProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Point | null>(null);
    const [hasDragMoved, setHasDragMoved] = useState(false);

    const pointerStateRef = useRef<PointerStateSnapshot>({
        isSelecting,
        isDragging,
        dragStart,
        hasDragMoved,
    });

    useLayoutEffect(() => {
        pointerStateRef.current = {
            isSelecting,
            isDragging,
            dragStart,
            hasDragMoved,
        };
    }, [isSelecting, isDragging, dragStart, hasDragMoved]);

    const stateRefs = useMemo(
        () => ({
            pointer: pointerStateRef,
        }),
        []
    );

    return {
        isDragging,
        dragStart,
        hasDragMoved,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
        stateRefs,
    };
};

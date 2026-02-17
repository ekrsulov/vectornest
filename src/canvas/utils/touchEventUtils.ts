import type React from 'react';

/**
 * Creates a synthetic mouse event from a touch event
 * Used to convert touch events to mouse events for consistent handling
 * 
 * @param touchEvent - The original touch event
 * @param touchIndex - Index of the touch to use (default: 0)
 * @returns A synthetic mouse event matching the touch event
 */
export const createSyntheticMouseEvent = (
    touchEvent: React.TouchEvent,
    touchIndex: number = 0
): React.MouseEvent<Element> => {
    const touch = touchEvent.changedTouches[touchIndex];

    if (!touch) {
        throw new Error(`Touch not found at index ${touchIndex}`);
    }

    return {
        preventDefault: () => touchEvent.preventDefault(),
        stopPropagation: () => touchEvent.stopPropagation(),
        target: touchEvent.target,
        currentTarget: touchEvent.currentTarget,
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        type: 'dblclick',
        nativeEvent: touchEvent.nativeEvent,
    } as unknown as React.MouseEvent<Element>;
};

/**
 * Checks if the event target is canvas empty space (not an element)
 * 
 * @param target - The event target to check
 * @returns true if the target is the SVG canvas or canvas background
 */
export const isCanvasEmptySpace = (target: EventTarget | null): boolean => {
    if (!target || !('tagName' in target)) {
        return false;
    }

    const element = target as Element;
    return element.tagName === 'svg' || element.classList.contains('canvas-background');
};

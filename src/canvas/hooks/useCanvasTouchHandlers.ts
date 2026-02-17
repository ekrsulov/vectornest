import { useCallback } from 'react';
import { useDoubleTap } from './useDoubleTap';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { createSyntheticMouseEvent } from '../utils/touchEventUtils';
import { isCanvasEmptySpace } from '../utils/domUtils';
import { logger } from '../../utils/logger';

export interface CanvasTouchHandlersProps {
    activePlugin: string | null;
    handleElementDoubleClick: (elementId: string, e: React.MouseEvent<Element>) => void;
    handleSubpathDoubleClick: (elementId: string, subpathIndex: number, e: React.MouseEvent<Element>) => void;
}

export interface CanvasTouchHandlers {
    handleElementTouchEnd: (elementId: string, e: React.TouchEvent<Element>) => void;
    handleSubpathTouchEnd: (elementId: string, subpathIndex: number, e: React.TouchEvent<SVGElement>) => void;
    handleCanvasTouchEnd: (e: React.TouchEvent<SVGSVGElement>) => void;
}

/**
 * Hook for handling mobile touch events and double-tap detection
 */
export const useCanvasTouchHandlers = (
    props: CanvasTouchHandlersProps
): CanvasTouchHandlers => {
    const { activePlugin, handleElementDoubleClick, handleSubpathDoubleClick } = props;
    const eventBus = useCanvasEventBus();

    // Double tap detection hook
    const {
        handleElementTouchEnd: detectElementDoubleTap,
        handleSubpathTouchEnd: detectSubpathDoubleTap,
        handleCanvasTouchEnd: detectCanvasDoubleTap
    } = useDoubleTap();

    // Handle element touch end for double tap detection
    const handleElementTouchEnd = useCallback((elementId: string, e: React.TouchEvent<Element>) => {
        // Detect if this is a double tap
        const isDoubleTap = detectElementDoubleTap(elementId, e);

        if (!isDoubleTap) {
            // Single tap - do nothing special
            return;
        }

        // Double tap detected - prevent default and create synthetic mouse event
        e.preventDefault();
        e.stopPropagation();

        try {
            const syntheticEvent = createSyntheticMouseEvent(e);
            handleElementDoubleClick(elementId, syntheticEvent);
        } catch (error) {
            if (import.meta.env.DEV) {
                logger.warn('[useCanvasTouchHandlers] Touch event conversion failed:', error);
            }
            return;
        }
    }, [detectElementDoubleTap, handleElementDoubleClick]);

    // Handle canvas touch end - now handles BOTH empty space AND elements via delegation
    const handleCanvasTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
        // Check if the touch target is an element (has data-element-id attribute)
        const target = e.target as Element;
        const elementId = target?.getAttribute?.('data-element-id');

        if (elementId) {
            // Touch on an element - detect double tap for element
            const isDoubleTap = detectElementDoubleTap(elementId, e);

            if (!isDoubleTap) {
                // Single tap on element - do nothing special
                return;
            }

            // Double tap detected on element
            e.preventDefault();
            e.stopPropagation();

            try {
                const syntheticEvent = createSyntheticMouseEvent(e);
                handleElementDoubleClick(elementId, syntheticEvent);
            } catch (error) {
                if (import.meta.env.DEV) {
                    logger.warn('[useCanvasTouchHandlers] Touch event conversion failed:', error);
                }
                return;
            }
        } else {
            // Touch on empty space - detect double tap for canvas
            const isDoubleTap = detectCanvasDoubleTap(e);

            if (!isDoubleTap) {
                // Single tap on empty space - do nothing special
                return;
            }

            // Double tap detected on empty space
            if (isCanvasEmptySpace(e.target)) {
                e.preventDefault();
                e.stopPropagation();

                try {
                    const syntheticEvent = createSyntheticMouseEvent(e);
                    eventBus.emit('canvasDoubleClick', {
                        event: syntheticEvent,
                        activePlugin
                    });
                } catch (error) {
                    if (import.meta.env.DEV) {
                        logger.warn('[useCanvasTouchHandlers] Touch event conversion failed:', error);
                    }
                    return;
                }
            }
        }
    }, [detectCanvasDoubleTap, detectElementDoubleTap, handleElementDoubleClick, activePlugin, eventBus]);

    // Handle subpath touch end for double tap detection
    const handleSubpathTouchEnd = useCallback((elementId: string, subpathIndex: number, e: React.TouchEvent<SVGElement>) => {
        // Detect if this is a double tap on a subpath
        const isDoubleTap = detectSubpathDoubleTap(elementId, subpathIndex, e);

        if (!isDoubleTap) {
            // Single tap - do nothing special
            return;
        }

        // Double tap detected - prevent default and create synthetic mouse event
        e.preventDefault();
        e.stopPropagation();

        try {
            const syntheticEvent = createSyntheticMouseEvent(e);
            handleSubpathDoubleClick(elementId, subpathIndex, syntheticEvent);
        } catch (error) {
            if (import.meta.env.DEV) {
                logger.warn('[useCanvasTouchHandlers] Touch event conversion failed:', error);
            }
            return;
        }
    }, [detectSubpathDoubleTap, handleSubpathDoubleClick]);

    return {
        handleElementTouchEnd,
        handleSubpathTouchEnd,
        handleCanvasTouchEnd,
    };
};

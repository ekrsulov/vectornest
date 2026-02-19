import { useCallback } from 'react';
import { useCanvasEventBus } from '../CanvasEventBusContext';

interface CanvasDoubleClickHandlersProps {
    activePlugin: string | null;
}

interface CanvasDoubleClickHandlers {
    handleElementDoubleClick: (elementId: string, e: React.MouseEvent<Element>) => void;
    handleSubpathDoubleClick: (elementId: string, subpathIndex: number, e: React.MouseEvent<Element>) => void;
}

/**
 * Hook for handling desktop double-click events on canvas elements
 */
export const useCanvasDoubleClickHandlers = (
    props: CanvasDoubleClickHandlersProps
): CanvasDoubleClickHandlers => {
    const { activePlugin } = props;
    const eventBus = useCanvasEventBus();

    // Handle element double click
    const handleElementDoubleClick = useCallback((elementId: string, e: React.MouseEvent<Element>) => {
        e.stopPropagation();
        e.preventDefault();

        eventBus.emit('elementDoubleClick', {
            elementId,
            event: e,
            activePlugin
        });
    }, [activePlugin, eventBus]);

    // Handle subpath double click
    const handleSubpathDoubleClick = useCallback((elementId: string, subpathIndex: number, e: React.MouseEvent<Element>) => {
        e.stopPropagation();
        e.preventDefault();

        eventBus.emit('subpathDoubleClick', {
            elementId,
            subpathIndex,
            event: e,
            activePlugin
        });
    }, [activePlugin, eventBus]);

    return {
        handleElementDoubleClick,
        handleSubpathDoubleClick,
    };
};

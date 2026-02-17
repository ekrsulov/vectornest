import { useEffect } from 'react';
import { useCanvasStore } from '../../../store/canvasStore';

/**
 * Component that applies dynamic cursor styles based on pen tool state
 */
export function PenCursorController() {
    useEffect(() => {
        const updateCursor = () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const state = useCanvasStore.getState() as any;
            const pen = state.pen;

            if (!pen) return;

            const svg = document.querySelector('[data-canvas="true"]') as SVGSVGElement;
            if (!svg) return;

            // Map cursor states to CSS cursor values
            const cursorMap: Record<string, string> = {
                'new-path': 'crosshair',
                'continue': 'crosshair',
                'close': 'crosshair', // Closing path - same as continue but detected on first anchor
                'add-anchor': 'copy', // + cursor
                'delete-anchor': 'not-allowed', // - cursor (approximation)
                'convert': 'pointer', // ^ cursor (approximation)
                'reshape': 'move',
                'default': 'default',
            };

            const cursor = cursorMap[pen.cursorState] || 'crosshair';

            svg.style.cursor = cursor;
        };

        // Subscribe to pen state changes
        const unsubscribe = useCanvasStore.subscribe(updateCursor);

        // Initial update
        updateCursor();

        return () => {
            unsubscribe();
        };
    }, []);

    return null;
}

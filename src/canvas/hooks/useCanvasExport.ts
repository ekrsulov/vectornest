import { useEffect, type RefObject } from 'react';
import { useCanvasEventBus } from '../CanvasEventBusContext';

export interface UseCanvasExportParams {
    saveAsPng: (selectedOnly: boolean) => void;
    svgRef: RefObject<SVGSVGElement | null>;
}

/**
 * Hook that handles canvas export functionality via the event bus.
 */
export function useCanvasExport({
    saveAsPng,
    svgRef,
}: UseCanvasExportParams): void {
    const eventBus = useCanvasEventBus();

    useEffect(() => {
        const unsubscribe = eventBus.subscribe('saveAsPng', ({ selectedOnly }) => {
            if (svgRef.current) {
                saveAsPng(selectedOnly);
            }
        });

        return unsubscribe;
    }, [eventBus, saveAsPng, svgRef]);
}

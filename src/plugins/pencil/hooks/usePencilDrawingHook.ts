import type { PluginHooksContext } from '../../../types/plugins';
import { useCanvasStore } from '../../../store/canvasStore';
import { usePencilDrawing } from './usePencilDrawing';
import { startPath, addPointToPath, finalizePath } from '../actions';
import { DEFAULT_STROKE_COLOR_LIGHT } from '../../../utils/defaultColors';

/**
 * Hook wrapper for pencil drawing functionality.
 * This is registered as a plugin hook contribution.
 */
export function usePencilDrawingHook(context: PluginHooksContext): void {
    const pencil = useCanvasStore(state => state.pencil);
    const style = useCanvasStore(state => state.style);

    // Default pencil settings if not initialized (pencil-specific only)
    const effectivePencil = pencil ?? {
        reusePath: false,
        simplificationTolerance: 0,
    };

    // Default style settings if not initialized (from centralized StyleSlice)
    const effectiveStyle = style ?? {
        strokeWidth: 4,
        strokeColor: DEFAULT_STROKE_COLOR_LIGHT,
        strokeOpacity: 1,
        fillColor: 'none',
        fillOpacity: 1,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        fillRule: 'nonzero' as const,
        strokeDasharray: 'none',
    };

    usePencilDrawing({
        svgRef: context.svgRef,
        currentMode: context.activePlugin || 'select',
        pencil: effectivePencil,
        style: effectiveStyle,
        viewportZoom: context.viewportZoom,
        scaleStrokeWithZoom: context.scaleStrokeWithZoom,
        screenToCanvas: context.screenToCanvas,
        emitPointerEvent: context.emitPointerEvent,
        startPath: (point) => startPath(point, useCanvasStore.getState),
        addPointToPath: (point) => addPointToPath(point, useCanvasStore.getState),
        finalizePath: (points) => finalizePath(points, useCanvasStore.getState),
    });
}

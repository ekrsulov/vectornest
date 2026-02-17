import type { CanvasRenderContext } from './CanvasRendererRegistry';

/**
 * Compare two viewport objects for equality.
 * Shared by PathElementRenderer and GroupElementRenderer for memo comparison.
 */
export const areViewportsEqual = (
    previous: CanvasRenderContext['viewport'],
    next: CanvasRenderContext['viewport']
): boolean =>
    previous.zoom === next.zoom &&
    previous.panX === next.panX &&
    previous.panY === next.panY;

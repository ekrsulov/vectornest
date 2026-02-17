import type { Point, Viewport } from '.';
import type { DragPointInfo } from './extensionPoints';

/**
 * Context for point-level drag operations (snapping, grid alignment, etc.)
 * Not to be confused with DragContext in extensionPoints.ts which is for plugin-level drag handling.
 */
export interface PointDragContext {
    // Context for the drag operation
    // Can be extended in the future to include modifier keys, element info, etc.
    originalPoint: Point;
    excludeElementIds?: string[];
    /** Information about the specific point being edited (for precise exclusion from snap) */
    dragPointInfo?: DragPointInfo | null;
}

export interface DragModifier {
    id: string;
    /**
     * Modifies the drag point.
     * @param point The current point (potentially modified by previous modifiers)
     * @param context The context of the drag operation
     * @returns The modified point
     */
    modify: (point: Point, context: PointDragContext) => Point;

    /**
     * Priority of the modifier.
     * Modifiers are applied in ascending order of priority.
     * 0 = First
     * 100 = Last (e.g. final snap)
     */
    priority: number;
}

/**
 * Context for element drag modifiers (used when moving selected elements)
 */
export interface ElementDragContext {
    /** IDs of elements being dragged */
    selectedIds: string[];
    /** Original delta from pointer movement */
    originalDelta: { x: number; y: number };
    /** Current viewport state */
    viewport: Viewport;
}

/**
 * Result of applying an element drag modifier
 */
export interface ElementDragModifierResult {
    /** Modified delta values */
    deltaX: number;
    deltaY: number;
    /** Whether this modifier made any changes */
    applied: boolean;
}

/**
 * Modifier that can intercept and modify element drag operations.
 * Used by plugins like guidelines to apply snapping during element movement.
 */
export interface ElementDragModifier {
    id: string;
    /**
     * Modifies the drag delta for element movement.
     * @param deltaX Original X delta
     * @param deltaY Original Y delta
     * @param context Context of the drag operation
     * @returns Modified delta values
     */
    modify: (deltaX: number, deltaY: number, context: ElementDragContext) => ElementDragModifierResult;
    /**
     * Priority of the modifier.
     * Modifiers are applied in ascending order of priority.
     * 0 = First, 100 = Last (e.g. final snap)
     */
    priority: number;
    /**
     * Called when drag operation ends.
     * Used to clean up any visual feedback.
     */
    onDragEnd?: () => void;
}

/**
 * Canvas decorator placement options
 */
export type CanvasDecoratorPlacement = 'before-canvas' | 'after-canvas';

/**
 * Context provided to canvas decorators
 */
export interface CanvasDecoratorContext {
    /** Current canvas size */
    canvasSize: { width: number; height: number };
    /** Current viewport state */
    viewport: Viewport;
    /** Whether this decorator should be visible */
    isVisible: boolean;
}

/**
 * Decorator that can render UI elements around the canvas.
 * Used by plugins like guidelines to render rulers.
 */
export interface CanvasDecorator {
    id: string;
    /**
     * Where to render this decorator relative to the canvas
     */
    placement: CanvasDecoratorPlacement;
    /**
     * Render function that returns the decorator element
     */
    render: (context: CanvasDecoratorContext) => React.ReactNode;
    /**
     * Function to determine if this decorator is visible
     * @param store Current store state
     * @returns true if visible
     */
    isVisible: (store: Record<string, unknown>) => boolean;
    /**
     * Optional offset this decorator adds to the canvas container
     * Used to adjust canvas position when decorator is visible
     */
    getOffset?: () => { top: number; left: number; width: number; height: number };
}

export interface InteractionHelpers {
    beginSelectionRectangle: (point: Point) => void;
    updateSelectionRectangle: (point: Point) => void;
    completeSelectionRectangle: () => void;
    setDragStart: (point: Point | null) => void;
    setIsDragging: (isDragging: boolean) => void;
    setHasDragMoved: (hasMoved: boolean) => void;
}

export interface PointerState {
    isSelecting: boolean;
    isDragging: boolean;
    dragStart: Point | null;
    hasDragMoved: boolean;
}

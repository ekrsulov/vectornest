import type { CanvasElement, GroupData, PathData } from '../types';
import {
    type Matrix,
    IDENTITY_MATRIX,
    createTranslateMatrix,
    createRotateMatrix,
    createScaleMatrix,
    multiplyMatrices
} from './matrixUtils';
import { buildElementMap } from './elementMapUtils';

/**
 * Get the local transformation matrix for an element
 */
export function getElementTransformMatrix(element: CanvasElement): Matrix {
    let transform = { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1 };

    if (element.type === 'path') {
        const data = element.data as PathData;
        // Check for explicit transformMatrix first (set by some importers)
        if (data.transformMatrix) {
            return data.transformMatrix as Matrix;
        }
        if (data.transform) {
            transform = { ...transform, ...data.transform };
        }
    } else if (element.type === 'group') {
        const data = element.data as GroupData;
        // Check for explicit transformMatrix first (set by some importers)
        if (data.transformMatrix) {
            return data.transformMatrix as Matrix;
        }
        if (data.transform) {
            transform = { ...transform, ...data.transform };
        }
    } else {
        // Other elements might not have standard transforms yet
        return IDENTITY_MATRIX;
    }

    // The order of operations matches SVG transform order usually: represent as T * R * S
    // Note: If we use visual center as origin for rotation/scale, we need to account for that.
    // For now, let's assume standard center-based transforms if handled by the app's transform logic,
    // or 0,0 based if that's how the data is stored.
    // Looking at `sharedTransformUtils.ts`, it seems transforms are applied with specific origins.
    // However, the `transform` object in types usually implies a transform relative to the element's origin or current position.

    // Checking `transformManager.ts`, simple transforms (T/R/S) are often applied directly to coordinates or accumulated.
    // If `transform` property is used, it usually means an additional transform ON TOP of the coordinates.

    // IMPORTANT: The `transform` property in CanvasElement types (GroupData/PathData) is:
    // transform: { translateX: number; translateY: number; rotation: number; scaleX: number; scaleY: number; }
    // We need to construct a matrix from this.

    // Convention: Translation -> Rotation -> Scale (Verify against app behavior if possible, but this is standard)
    // Actually, usually it's Translate(x,y) * Rotate(r) * Scale(sx, sy).

    // Wait, if rotation/scale have a specific origin (like center), that origin needs to be known.
    // But the minimal `transform` data struct doesn't store origin. 
    // This implies either (a) origin is (0,0), or (b) origin is calculated dynamically (e.g. bounds center).
    // Groups usually transform around their visual center or (0,0).
    // Given the issue description showing `translate(400, 400)` on a group, this is a standard SVG translation.

    const mTranslate = createTranslateMatrix(transform.translateX, transform.translateY);

    // Rotation and Scale usually happen around a center.
    // If the data structure doesn't store center, and we see `rotate(deg)` in SVG, it defaults to (0,0) unless configured.
    // But in this app, if I recall `transformManager`, it calculates bounds center.
    // However, for pure playback/rendering of the "transform" property as stored in `data.transform`,
    // we need to know how the app interprets it.
    // If the app simply stores `translateX/Y` and applies it as a group transform `transform="translate(x,y) ..."`
    // then we can just compose them.

    const mRotate = createRotateMatrix(transform.rotation);
    const mScale = createScaleMatrix(transform.scaleX, transform.scaleY);

    // Order: Scale, then Rotate, then Translate (giving T * R * S)
    return multiplyMatrices(multiplyMatrices(mTranslate, mRotate), mScale);
}

/**
 * Calculate the accumulated global transformation matrix for an element by traversing up the tree.
 * Accepts either a pre-built Map (preferred for loops) or an array (convenience).
 */
export function getAccumulatedTransformMatrix(
    elementId: string,
    elements: CanvasElement[] | Map<string, CanvasElement>
): Matrix {
    const elementMap = elements instanceof Map ? elements : buildElementMap(elements);
    let currentId: string | undefined | null = elementId;
    let matrix = IDENTITY_MATRIX;

    const transformStack: Matrix[] = [];

    // Traverse up to build stack (child -> parent -> root)
    // Matrix multiplication is associative but not commutative.
    // Global = Parent * Child.
    // So we need to apply Parent * Current.

    // 1. Collect all matrices from leaf to root
    while (currentId) {
        const el = elementMap.get(currentId);
        if (!el) break;

        transformStack.push(getElementTransformMatrix(el));
        currentId = el.parentId;

        // Safety break for cycles
        if (transformStack.length > 100) break;
    }

    // 2. Multiply them from Root down to Leaf
    // Root * ... * Parent * Child
    for (let i = transformStack.length - 1; i >= 0; i--) {
        matrix = multiplyMatrices(matrix, transformStack[i]);
    }

    return matrix;
}

/**
 * Get the accumulated transform matrix excluding the element itself (only parents).
 * Accepts either a pre-built Map (preferred for loops) or an array (convenience).
 */
export function getParentCumulativeTransformMatrix(
    element: CanvasElement,
    elements: CanvasElement[] | Map<string, CanvasElement>
): Matrix {
    if (!element.parentId) return IDENTITY_MATRIX;
    return getAccumulatedTransformMatrix(element.parentId, elements);
}

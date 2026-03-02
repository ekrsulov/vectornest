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

    // Compose transform as T * R * S (standard SVG transform order).
    // The `transform` property stores {translateX, translateY, rotation, scaleX, scaleY}
    // without an explicit origin; rotation/scale default to (0,0) when no center is stored.

    const mTranslate = createTranslateMatrix(transform.translateX, transform.translateY);

    const mRotate = createRotateMatrix(transform.rotation);
    const mScale = createScaleMatrix(transform.scaleX, transform.scaleY);

    // Compose: T * R * S
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

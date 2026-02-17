import type { Matrix, ImportedNativeShapeElement } from '../../utils/svgImportUtils';
import { extractStyleAttributes } from '../../utils/svgImportUtils';

/**
 * Check if matrix is identity (no transformation)
 */
const isIdentityMatrix = (m: Matrix): boolean =>
    m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0;

/**
 * Check if matrix is a pure translation (no rotation/scale/skew)
 */
const isTranslationOnly = (m: Matrix): boolean =>
    m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1;

/**
 * Determine if we should bake the transform into coordinates instead of storing it.
 * We bake when:
 * 1. The matrix is identity (no point storing it)
 * 2. The matrix is translation-only AND the element has a mask (userSpaceOnUse masks
 *    don't work well with transformMatrix because they're applied before the transform)
 */
const shouldBakeTransform = (m: Matrix, hasMask: boolean): boolean => {
    if (isIdentityMatrix(m)) return true;
    if (hasMask && isTranslationOnly(m)) return true;
    return false;
};

export function shapeToNativeShape(
    element: Element,
    transform: Matrix
): ImportedNativeShapeElement | null {
    const tagName = element.tagName.toLowerCase();

    // Note: We don't need to pass inheritedStyle explicitly because 
    // svgImportUtils pushes them down to attributes before calling this.
    const style = extractStyleAttributes(element);

    const baseStyles = {
        strokeColor: style.strokeColor ?? 'none',
        strokeWidth: style.strokeWidth ?? 1,
        strokeOpacity: style.strokeOpacity ?? 1,
        strokeDasharray: style.strokeDasharray,
        strokeLinecap: style.strokeLinecap,
        strokeLinejoin: style.strokeLinejoin,
        // SVG default fill is black when unspecified
        fillColor: style.fillColor ?? '#000000',
        fillOpacity: style.fillOpacity ?? 1,
        opacity: style.opacity,
        filterId: (style as { filterId?: string }).filterId,
        clipPathId: (style as { clipPathId?: string }).clipPathId,
        clipPathTemplateId: (style as { clipPathTemplateId?: string }).clipPathTemplateId,
        maskId: (style as { maskId?: string }).maskId,
        markerStart: (style as { markerStart?: string }).markerStart,
        markerMid: (style as { markerMid?: string }).markerMid,
        markerEnd: (style as { markerEnd?: string }).markerEnd,
        mixBlendMode: (style as { mixBlendMode?: string }).mixBlendMode,
        isolation: (style as { isolation?: 'auto' | 'isolate' }).isolation,
        sourceId: element.getAttribute('id') ?? undefined,
    };

    const matrixArr: [number, number, number, number, number, number] = [
        transform.a,
        transform.b,
        transform.c,
        transform.d,
        transform.e,
        transform.f,
    ];

    const hasMask = Boolean(baseStyles.maskId);
    const bakeTransform = shouldBakeTransform(transform, hasMask);
    
    // Translation offsets to bake into coordinates
    const tx = bakeTransform && isTranslationOnly(transform) ? transform.e : 0;
    const ty = bakeTransform && isTranslationOnly(transform) ? transform.f : 0;
    
    // Only store transformMatrix if we're not baking
    const storedMatrix = bakeTransform ? undefined : matrixArr;

    if (tagName === 'rect') {
        const x = parseFloat(element.getAttribute('x') || '0') + tx;
        const y = parseFloat(element.getAttribute('y') || '0') + ty;
        const width = parseFloat(element.getAttribute('width') || '0');
        const height = parseFloat(element.getAttribute('height') || '0');
        const rx = element.getAttribute('rx');
        const ry = element.getAttribute('ry');
        return {
            type: 'nativeShape',
            data: {
                kind: 'rect',
                x,
                y,
                width,
                height,
                rx: rx !== null ? parseFloat(rx) : undefined,
                ry: ry !== null ? parseFloat(ry) : undefined,
                transformMatrix: storedMatrix,
                ...baseStyles,
            },
        };
    }
    if (tagName === 'circle') {
        const cx = parseFloat(element.getAttribute('cx') || '0') + tx;
        const cy = parseFloat(element.getAttribute('cy') || '0') + ty;
        const r = parseFloat(element.getAttribute('r') || '0');
        return {
            type: 'nativeShape',
            data: {
                kind: 'circle',
                x: cx - r,
                y: cy - r,
                width: r * 2,
                height: r * 2,
                transformMatrix: storedMatrix,
                ...baseStyles,
            },
        };
    }
    if (tagName === 'ellipse') {
        const cx = parseFloat(element.getAttribute('cx') || '0') + tx;
        const cy = parseFloat(element.getAttribute('cy') || '0') + ty;
        const rx = parseFloat(element.getAttribute('rx') || '0');
        const ry = parseFloat(element.getAttribute('ry') || '0');
        return {
            type: 'nativeShape',
            data: {
                kind: 'ellipse',
                x: cx - rx,
                y: cy - ry,
                width: rx * 2,
                height: ry * 2,
                rx,
                ry,
                transformMatrix: storedMatrix,
                ...baseStyles,
            },
        };
    }
    if (tagName === 'line') {
        const x1 = parseFloat(element.getAttribute('x1') || '0') + tx;
        const y1 = parseFloat(element.getAttribute('y1') || '0') + ty;
        const x2 = parseFloat(element.getAttribute('x2') || '0') + tx;
        const y2 = parseFloat(element.getAttribute('y2') || '0') + ty;
        return {
            type: 'nativeShape',
            data: {
                kind: 'line',
                x: x1,
                y: y1,
                width: x2 - x1,
                height: y2 - y1,
                transformMatrix: storedMatrix,
                ...baseStyles,
            },
        };
    }
    if (tagName === 'polygon' || tagName === 'polyline') {
        const pointsAttr = element.getAttribute('points') || '';
        const rawPoints = pointsAttr.trim().split(/[\s,]+/);
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < rawPoints.length; i += 2) {
            const x = parseFloat(rawPoints[i]) + tx;
            const y = parseFloat(rawPoints[i + 1]) + ty;
            if (!Number.isNaN(x) && !Number.isNaN(y)) {
                points.push({ x, y });
            }
        }
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        return {
            type: 'nativeShape',
            data: {
                kind: tagName,
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
                points,
                transformMatrix: storedMatrix,
                ...baseStyles,
            },
        };
    }

    return null;
}

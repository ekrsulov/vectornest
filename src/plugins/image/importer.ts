import type { ImportedElement, Matrix } from '../../utils/svgImportUtils';
import { extractStyleAttributes } from '../../utils/svgImportUtils';

type AffineMatrix = [number, number, number, number, number, number];

/**
 * Import handler for SVG <image> elements
 */
export function importImage(
    element: Element,
    transform: Matrix
): ImportedElement | null {
    if (element.tagName.toLowerCase() !== 'image') return null;

    const href = element.getAttribute('href') || element.getAttribute('xlink:href');
    if (!href) return null;

    const width = parseFloat(element.getAttribute('width') || '0');
    const height = parseFloat(element.getAttribute('height') || '0');
    const x = parseFloat(element.getAttribute('x') || '0');
    const y = parseFloat(element.getAttribute('y') || '0');
    const preserveAspectRatio = element.getAttribute('preserveAspectRatio') || undefined;

    const style = extractStyleAttributes(element);

    const matrixArr: AffineMatrix = [
        transform.a,
        transform.b,
        transform.c,
        transform.d,
        transform.e,
        transform.f,
    ];

    return {
        type: 'image',
        data: {
            x,
            y,
            width,
            height,
            href: href.trim(),
            preserveAspectRatio,
            opacity: (style as { opacity?: number }).opacity,
            filterId: (style as { filterId?: string }).filterId,
            clipPathId: (style as { clipPathId?: string }).clipPathId,
            clipPathTemplateId: (style as { clipPathTemplateId?: string }).clipPathTemplateId,
            maskId: (style as { maskId?: string }).maskId,
            transformMatrix: matrixArr,
            sourceId: element.getAttribute('id') ?? undefined,
        },
    };
}

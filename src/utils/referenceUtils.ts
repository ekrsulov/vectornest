import type { CanvasElement } from '../types';

/**
 * Extracts referenced element IDs from a given element's attributes.
 * Checks for:
 * - url(#id) citations (fill, stroke, clip-path, mask, filter, marker-*)
 * - #id references (href, xlink:href)
 */
export const getReferencedIds = (element: CanvasElement): string[] => {
    const refs = new Set<string>();
    const data: Record<string, unknown> = (element.data || {}) as Record<string, unknown>;

    const urlRegex = /url\(#([^)]+)\)/;

    // 1. Check explicit ID properties in PathData/GroupData
    const idFields = ['clipPathId', 'maskId', 'filterId', 'markerStart', 'markerMid', 'markerEnd'];

    idFields.forEach(field => {
        const val = data[field];
        if (typeof val === 'string') {
            const match = val.match(urlRegex);
            if (match && match[1]) {
                refs.add(match[1]);
            } else if (val && !val.includes('(') && !val.includes(' ')) {
                // Assume it's a direct ID if not a functional string
                refs.add(val);
            }
        }
    });

    // 2. Check Fill/Stroke for url(#id)
    const colorFields = ['fillColor', 'strokeColor'];
    colorFields.forEach(field => {
        const val = data[field];
        if (typeof val === 'string') {
            const match = val.match(urlRegex);
            if (match && match[1]) {
                refs.add(match[1]);
            }
        }
    });

    // 3. Check generic href / xlink:href
    const href = data['href'] ?? data['xlink:href'];
    if (typeof href === 'string') {
        const id = href.startsWith('#') ? href.substring(1) : href;
        if (id) refs.add(id);
    }

    // Check textPath specifically if it exists
    const tp = data.textPath;
    if (tp && typeof tp === 'object' && (tp as Record<string, unknown>).href) {
        const tpHref = (tp as Record<string, unknown>).href;
        if (typeof tpHref === 'string') {
            const id = tpHref.startsWith('#') ? tpHref.substring(1) : tpHref;
            if (id) refs.add(id);
        }
    }

    return Array.from(refs);
};

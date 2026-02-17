import type { ImportedElement } from '../../utils/svgImportUtils';
import type { MaskDefinition } from './types';
import { generateShortId } from '../../utils/idGenerator';

/**
 * Strip animation elements from a node's innerHTML.
 * Animations are imported separately by the animation system.
 */
const stripAnimationsFromContent = (node: Element): string => {
    const clone = node.cloneNode(true) as Element;
    const animationSelectors = 'animate, animateTransform, animateMotion, animateColor, set';
    clone.querySelectorAll(animationSelectors).forEach((el) => el.remove());
    return clone.innerHTML;
};

/**
 * Collect mask IDs referenced by imported elements
 */
export const collectMaskIds = (elements: ImportedElement[]): Set<string> => {
    const ids = new Set<string>();
    const visit = (els: ImportedElement[]) => {
        els.forEach((el) => {
            const data = (el as { data?: { maskId?: string } }).data;
            if (data?.maskId) {
                ids.add(data.maskId);
            }
            if (el.type === 'group') {
                visit(el.children);
            }
        });
    };
    visit(elements);
    return ids;
};

/**
 * Parse mask definitions from SVG document
 */
export const parseMaskDefs = (doc: Document): MaskDefinition[] => {
    const nodes = Array.from(doc.querySelectorAll('mask'));
    if (!nodes.length) return [];
    return nodes.map((node) => ({
        id: node.getAttribute('id') ?? generateShortId('msk'),
        name: node.getAttribute('id') ?? undefined,
        x: node.getAttribute('x') ?? undefined,
        y: node.getAttribute('y') ?? undefined,
        width: node.getAttribute('width') ?? undefined,
        height: node.getAttribute('height') ?? undefined,
        maskUnits: node.getAttribute('maskUnits') ?? undefined,
        maskContentUnits: node.getAttribute('maskContentUnits') ?? undefined,
        // Strip animations - they are imported separately by the animation system
        content: stripAnimationsFromContent(node),
    }));
};

/**
 * Ensure all referenced masks are imported
 */
export const ensureMaskImports = (
    doc: Document,
    elements: ImportedElement[],
    pluginImports: Record<string, unknown[]>
): Record<string, unknown[]> => {
    const neededMaskIds = collectMaskIds(elements);
    if (!neededMaskIds.size) return pluginImports;

    const existing = (pluginImports.mask as MaskDefinition[] | undefined) ?? [];
    const existingIds = new Set(existing.map((m) => m.id));
    const missing = Array.from(neededMaskIds).filter((id) => !existingIds.has(id));
    if (!missing.length) return pluginImports;

    const discovered: Array<MaskDefinition | null> = missing.map((id) => {
        const node = doc.getElementById(id);
        if (!node || node.tagName.toLowerCase() !== 'mask') return null;
        return {
            id,
            name: id,
            x: node.getAttribute('x') ?? undefined,
            y: node.getAttribute('y') ?? undefined,
            width: node.getAttribute('width') ?? undefined,
            height: node.getAttribute('height') ?? undefined,
            maskUnits: node.getAttribute('maskUnits') ?? undefined,
            maskContentUnits: node.getAttribute('maskContentUnits') ?? undefined,
            // Strip animations - they are imported separately by the animation system
            content: stripAnimationsFromContent(node),
        };
    });
    const validMasks = discovered.filter((m): m is MaskDefinition => Boolean(m));

    if (!validMasks.length) return pluginImports;
    return {
        ...pluginImports,
        mask: [...existing, ...validMasks],
    };
};

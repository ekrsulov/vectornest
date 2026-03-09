import type { Matrix, ImportedElement } from '../../utils/svgImportUtils';
import { extractStyleAttributes } from '../../utils/svgImportUtils';
import {
    multiplyMatrices,
    createTranslateMatrix,
    type Matrix as BaseMatrix,
} from '../../utils/matrixUtils';
import { parsePathD } from '../../utils/pathParserUtils';
import { measurePath } from '../../utils/measurementUtils';
import { scaleCommands, translateCommands } from '../../utils/transformationUtils';
import type { PathData } from '../../types';
import { shapeToPath } from '../../utils/import/shapeToPath';

/** Extended PathData with computed bounds for symbol viewBox mapping. */
type SymbolPathData = PathData & { x: number; y: number; width: number; height: number };

const composeMatrices = (left: BaseMatrix, right: BaseMatrix): BaseMatrix => {
    return multiplyMatrices(left, right);
};

// Helper to convert object matrix to array matrix
const toArrayMatrix = (m: Matrix): BaseMatrix => [m.a, m.b, m.c, m.d, m.e, m.f];

const GRAPHICS_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);

const isSupportedGraphicsElement = (element: Element | null | undefined): element is Element => (
    Boolean(element && GRAPHICS_TAGS.has(element.tagName.toLowerCase()))
);

const resolveUseReferenceTarget = (useNode: Element | null | undefined): Element | null => {
    if (!useNode || useNode.tagName.toLowerCase() !== 'use') {
        return null;
    }

    const href = useNode.getAttribute('href') || useNode.getAttribute('xlink:href');
    if (!href || !href.startsWith('#')) {
        return null;
    }

    const target = useNode.ownerDocument?.getElementById(href.slice(1));
    return isSupportedGraphicsElement(target) ? target : null;
};

const resolvePrimarySymbolGraphicsElement = (symbolNode: Element | null | undefined): Element | null => {
    if (!symbolNode) {
        return null;
    }

    const directChildren = Array.from(symbolNode.children);
    if (directChildren.length === 1) {
        const [onlyChild] = directChildren;
        if (isSupportedGraphicsElement(onlyChild)) {
            return onlyChild;
        }
        const useTarget = resolveUseReferenceTarget(onlyChild);
        if (useTarget) {
            return useTarget;
        }
    }

    const drawableDescendants = Array.from(symbolNode.querySelectorAll(Array.from(GRAPHICS_TAGS).join(',')));
    if (drawableDescendants.length === 1) {
        return drawableDescendants[0];
    }

    const useDescendants = Array.from(symbolNode.querySelectorAll('use'));
    if (drawableDescendants.length === 0 && useDescendants.length === 1) {
        return resolveUseReferenceTarget(useDescendants[0]);
    }

    return null;
};

const buildPathData = (graphicsNode: Element | null, styleAttrs: Record<string, unknown>): SymbolPathData | null => {
    if (!graphicsNode) return null;
    const pathD = graphicsNode.tagName.toLowerCase() === 'path'
        ? graphicsNode.getAttribute('d')
        : shapeToPath(graphicsNode);
    if (!pathD) return null;
    const subPaths = [parsePathD(pathD)];
    const strokeColor = (styleAttrs as { strokeColor?: string }).strokeColor ?? graphicsNode.getAttribute('stroke') ?? 'none';
    const strokeWidth = (styleAttrs as { strokeWidth?: number }).strokeWidth ?? parseFloat(graphicsNode.getAttribute('stroke-width') ?? '1');
    const fillColor = (styleAttrs as { fillColor?: string }).fillColor ?? graphicsNode.getAttribute('fill') ?? 'none';
    const strokeOpacity = (styleAttrs as { strokeOpacity?: number }).strokeOpacity ?? parseFloat(graphicsNode.getAttribute('stroke-opacity') ?? '1');
    const fillOpacity = (styleAttrs as { fillOpacity?: number }).fillOpacity ?? parseFloat(graphicsNode.getAttribute('fill-opacity') ?? '1');
    const measured = measurePath(subPaths, strokeWidth || 1, 1);
    return {
        subPaths,
        strokeColor,
        strokeWidth,
        fillColor,
        strokeOpacity,
        fillOpacity,
        // Bounds helpers
        x: measured.minX,
        y: measured.minY,
        width: measured.maxX - measured.minX,
        height: measured.maxY - measured.minY,
    };
};

type ViewBox = { minX: number; minY: number; width: number; height: number };

const parseViewBox = (value: string | null | undefined): ViewBox | null => {
    if (!value) {
        return null;
    }

    const parts = value.split(/[\s,]+/).map(parseFloat);
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
        return null;
    }

    return {
        minX: parts[0],
        minY: parts[1],
        width: parts[2],
        height: parts[3],
    };
};

const resolveImplicitViewportSize = (element: Element): { width: number; height: number } | null => {
    let current: Element | null = element.parentElement;

    while (current) {
        if (current.tagName.toLowerCase() === 'svg') {
            const viewBox = parseViewBox(current.getAttribute('viewBox'));
            if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
                return { width: viewBox.width, height: viewBox.height };
            }

            const width = parseFloat(current.getAttribute('width') || '');
            const height = parseFloat(current.getAttribute('height') || '');
            if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
                return { width, height };
            }
        }

        current = current.parentElement;
    }

    return null;
};

const applyViewBoxTransform = (
    pathData: SymbolPathData,
    viewBox: ViewBox,
    viewport: { width: number; height: number },
    preserveAspectRatio?: string | null
): SymbolPathData => {
    const mapping = computeViewBoxMapping(viewBox, viewport, preserveAspectRatio);
    if (!mapping) return pathData;

    const { scaleX, scaleY, offsetX: tx, offsetY: ty, strokeScale } = mapping;

    const scaledSubPaths = pathData.subPaths.map((subPath) =>
        scaleCommands(subPath, scaleX, scaleY, 0, 0)
    );
    const translatedSubPaths = scaledSubPaths.map((subPath) =>
        translateCommands(subPath, tx, ty)
    );

    const newStrokeWidth = pathData.strokeWidth * (Number.isFinite(strokeScale) ? strokeScale : 1);

    const measured = measurePath(translatedSubPaths, newStrokeWidth || 1, 1);

    return {
        ...pathData,
        subPaths: translatedSubPaths,
        strokeWidth: newStrokeWidth,
        x: measured.minX,
        y: measured.minY,
        width: measured.maxX - measured.minX,
        height: measured.maxY - measured.minY,
    };
};

const computeViewBoxMapping = (
    viewBox: ViewBox,
    viewport: { width: number; height: number },
    preserveAspectRatio?: string | null
): { scaleX: number; scaleY: number; offsetX: number; offsetY: number; strokeScale: number } | null => {
    const vbWidth = viewBox.width;
    const vbHeight = viewBox.height;
    if (!Number.isFinite(vbWidth) || !Number.isFinite(vbHeight) || vbWidth === 0 || vbHeight === 0) {
        return null;
    }

    const targetWidth = Number.isFinite(viewport.width) && viewport.width > 0 ? viewport.width : vbWidth;
    const targetHeight = Number.isFinite(viewport.height) && viewport.height > 0 ? viewport.height : vbHeight;

    const rawPar = preserveAspectRatio?.trim() || 'xMidYMid meet';
    const parts = rawPar.split(/\s+/);
    const align = parts[0] ?? 'xMidYMid';
    const meetOrSlice = (parts[1] === 'slice') ? 'slice' : 'meet';

    let alignX: 'Min' | 'Mid' | 'Max' = 'Mid';
    let alignY: 'Min' | 'Mid' | 'Max' = 'Mid';

    if (align !== 'none') {
        if (align.startsWith('xMin')) alignX = 'Min';
        else if (align.startsWith('xMax')) alignX = 'Max';
        if (align.includes('YMin')) alignY = 'Min';
        else if (align.includes('YMax')) alignY = 'Max';
    }

    let scaleX = targetWidth / vbWidth;
    let scaleY = targetHeight / vbHeight;
    let offsetX = -viewBox.minX * scaleX;
    let offsetY = -viewBox.minY * scaleY;

    if (align !== 'none') {
        const scale = meetOrSlice === 'slice'
            ? Math.max(scaleX, scaleY)
            : Math.min(scaleX, scaleY);
        scaleX = scaleY = scale;

        const viewWidth = vbWidth * scale;
        const viewHeight = vbHeight * scale;
        const extraX = targetWidth - viewWidth;
        const extraY = targetHeight - viewHeight;

        const dx = alignX === 'Min' ? 0 : alignX === 'Max' ? extraX : extraX / 2;
        const dy = alignY === 'Min' ? 0 : alignY === 'Max' ? extraY : extraY / 2;

        offsetX = -viewBox.minX * scale + dx;
        offsetY = -viewBox.minY * scale + dy;
    }

    const strokeScale = align === 'none' ? Math.max(Math.abs(scaleX), Math.abs(scaleY)) : Math.abs(scaleX);

    return { scaleX, scaleY, offsetX, offsetY, strokeScale };
};

export function importUse(
    element: Element,
    transform: Matrix
): ImportedElement | null {
    const tagName = element.tagName.toLowerCase();

    if (tagName !== 'use') return null;

    const href = element.getAttribute('href') || element.getAttribute('xlink:href');
    if (!href || !href.startsWith('#')) return null;

    const rawId = href.slice(1);
    // Check for symbol- prefix
    const isSymbolPrefix = rawId.startsWith('symbol-');
    const symbolId = isSymbolPrefix ? rawId.slice(7) : rawId;

    // Try to find the symbol definition to verify it exists and get dimensions/styles
    const doc = element.ownerDocument;
    const symbolNode = doc?.getElementById(rawId) || (isSymbolPrefix ? null : doc?.getElementById('symbol-' + rawId));
    const symbolHasMultipleChildren = symbolNode ? symbolNode.children.length > 1 : false;

    // If we found a proper symbol node, verify it's actually a <symbol> element.
    const targetIsSymbol = symbolNode?.tagName.toLowerCase() === 'symbol';

  if (!targetIsSymbol && !isSymbolPrefix) {
    // Not a <symbol> node and no symbol- prefix — skip (could be a standard SVG <use> reference).
    return null;
  }

    const widthAttrRaw = element.getAttribute('width');
    const heightAttrRaw = element.getAttribute('height');
    const xAttrRaw = element.getAttribute('x');
    const yAttrRaw = element.getAttribute('y');

    const widthAttr = parseFloat(widthAttrRaw || '0');
    const heightAttr = parseFloat(heightAttrRaw || '0');
    const x = parseFloat(xAttrRaw || '0');
    const y = parseFloat(yAttrRaw || '0');

    const hasExplicitWidth = element.hasAttribute('width');
    const hasExplicitHeight = element.hasAttribute('height');
    const hasExplicitX = element.hasAttribute('x');
    const hasExplicitY = element.hasAttribute('y');

    const transformMatrix = toArrayMatrix(transform);

    const styleAttrs = extractStyleAttributes(element);
    // Check for color attribute on the <use> element and its ancestors (CSS color property inheritance)
    let colorAttr = element.getAttribute('color');
    if (!colorAttr) {
        // Walk up the DOM tree to find inherited color
        let parent: Element | null = element.parentElement;
        while (parent && !colorAttr) {
            colorAttr = parent.getAttribute('color');
            parent = parent.parentElement;
        }
    }
    if (colorAttr) {
        const styleRecord = styleAttrs as Record<string, unknown>;
        if (styleRecord.fillColor === undefined) styleRecord.fillColor = colorAttr;
        if (styleRecord.strokeColor === undefined) styleRecord.strokeColor = colorAttr;
    }

    // If we have access to the symbol node, we can resolve some defaults like viewBox dimensions or inherited colors
    let finalWidth = widthAttr;
    let finalHeight = heightAttr;

    const parsedViewBox = parseViewBox(symbolNode?.getAttribute('viewBox'));
    const implicitViewportSize = resolveImplicitViewportSize(element);

    if (parsedViewBox) {
        if (!hasExplicitWidth && (!Number.isFinite(finalWidth) || finalWidth === 0)) {
            finalWidth = implicitViewportSize?.width ?? parsedViewBox.width;
        }
        if (!hasExplicitHeight && (!Number.isFinite(finalHeight) || finalHeight === 0)) {
            finalHeight = implicitViewportSize?.height ?? parsedViewBox.height;
        }
    }

    if (!Number.isFinite(finalWidth) || finalWidth === 0) finalWidth = parsedViewBox?.width ?? 100;
    if (!Number.isFinite(finalHeight) || finalHeight === 0) finalHeight = parsedViewBox?.height ?? 100;

    void hasExplicitX;
    void hasExplicitY;

    const symbolGraphicsNode = resolvePrimarySymbolGraphicsElement(symbolNode);

    if (symbolNode) {

        // Resolve color inheritance if needed (currentColor etc)
        const symbolFill = symbolGraphicsNode?.getAttribute('fill');
        const symbolStroke = symbolGraphicsNode?.getAttribute('stroke');
        const symbolFillOpacity = symbolGraphicsNode?.getAttribute('fill-opacity');
        const symbolStrokeOpacity = symbolGraphicsNode?.getAttribute('stroke-opacity');

        // logic from svgImportUtils
        const colorAttr = element.getAttribute('color');

        const resolvedFill =
            styleAttrs.fillColor ??
            (symbolFill === 'currentColor' ? colorAttr : symbolFill) ??
            undefined;
        const resolvedStroke =
            styleAttrs.strokeColor ??
            (symbolStroke === 'currentColor' ? colorAttr : symbolStroke) ??
            undefined;

        if (resolvedFill !== undefined && resolvedFill !== null) {
            (styleAttrs as { fillColor?: string }).fillColor = resolvedFill;
        }
        if (resolvedStroke !== undefined && resolvedStroke !== null) {
            (styleAttrs as { strokeColor?: string }).strokeColor = resolvedStroke;
        }
        if (styleAttrs.fillOpacity === undefined && symbolFillOpacity) {
            (styleAttrs as { fillOpacity?: number }).fillOpacity = parseFloat(symbolFillOpacity);
        }
        if (styleAttrs.strokeOpacity === undefined && symbolStrokeOpacity) {
            (styleAttrs as { strokeOpacity?: number }).strokeOpacity = parseFloat(symbolStrokeOpacity);
        }
    }

    // Per SVG spec, the implicit x/y translation happens before the element's transform.
    // Width/height on <use> already scale the symbol's viewBox, so we avoid baking that scale
    // into the transform matrix (prevents double-scaling on export).
    const matrix = composeMatrices(
        transformMatrix,
        createTranslateMatrix(x, y)
    );

    // Try to resolve geometry for thumbnails/bounds; fall back to rendering via <use> when unresolved
    let pathData =
        symbolHasMultipleChildren
            ? undefined
            : buildPathData(symbolGraphicsNode, styleAttrs) ??
              undefined;

    // Apply symbol viewBox transform so imported geometry matches how SVG renders the symbol
    if (pathData && parsedViewBox) {
        pathData = applyViewBoxTransform(
            pathData,
            parsedViewBox,
            { width: finalWidth, height: finalHeight },
            symbolNode?.getAttribute('preserveAspectRatio')
        );
    }

    if ((!Number.isFinite(finalWidth) || finalWidth === 0) && pathData) {
        finalWidth = pathData.width;
    }
    if ((!Number.isFinite(finalHeight) || finalHeight === 0) && pathData) {
        finalHeight = pathData.height;
    }
    if (!Number.isFinite(finalWidth) || finalWidth === 0) finalWidth = parsedViewBox?.width ?? 100;
    if (!Number.isFinite(finalHeight) || finalHeight === 0) finalHeight = parsedViewBox?.height ?? 100;

    return {
        type: 'symbolInstance',
        data: {
            symbolId, // This ID is the clean ID (without symbol- prefix) used by the app
            x: 0, // positioning handled by matrix
            y: 0,
            width: finalWidth,
            height: finalHeight,
            ...styleAttrs,
            fillColor: (styleAttrs as { fillColor?: string }).fillColor ?? 'currentColor',
            mixBlendMode: (styleAttrs as { mixBlendMode?: string }).mixBlendMode,
            isolation: (styleAttrs as { isolation?: 'auto' | 'isolate' }).isolation,
            transformMatrix: matrix,
            sourceId: element.getAttribute('id') ?? undefined,
            ...(pathData ? { pathData } : {}),
        },
    };
}

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

/** Extended PathData with computed bounds for symbol viewBox mapping. */
type SymbolPathData = PathData & { x: number; y: number; width: number; height: number };

const composeMatrices = (left: BaseMatrix, right: BaseMatrix): BaseMatrix => {
    return multiplyMatrices(left, right);
};

// Helper to convert object matrix to array matrix
const toArrayMatrix = (m: Matrix): BaseMatrix => [m.a, m.b, m.c, m.d, m.e, m.f];

const buildPathData = (pathNode: SVGPathElement | null, styleAttrs: Record<string, unknown>): SymbolPathData | null => {
    if (!pathNode) return null;
    const pathD = pathNode.getAttribute('d');
    if (!pathD) return null;
    const subPaths = [parsePathD(pathD)];
    const strokeColor = (styleAttrs as { strokeColor?: string }).strokeColor ?? pathNode.getAttribute('stroke') ?? 'none';
    const strokeWidth = (styleAttrs as { strokeWidth?: number }).strokeWidth ?? parseFloat(pathNode.getAttribute('stroke-width') ?? '1');
    const fillColor = (styleAttrs as { fillColor?: string }).fillColor ?? pathNode.getAttribute('fill') ?? 'none';
    const strokeOpacity = (styleAttrs as { strokeOpacity?: number }).strokeOpacity ?? parseFloat(pathNode.getAttribute('stroke-opacity') ?? '1');
    const fillOpacity = (styleAttrs as { fillOpacity?: number }).fillOpacity ?? parseFloat(pathNode.getAttribute('fill-opacity') ?? '1');
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

    // If we found a proper symbol node, or if we assume it exists due to our prefix convention...
    // The original logic allowed assuming existence if 'symbol-' prefix was present (implicitly).
    // But also supported generic lookup.

    // We prioritize the robust generic lookup if possible, but keep the prefix fast path if we trust it.
    // Actually, we should probably check if the target is a <symbol>.
    const targetIsSymbol = symbolNode?.tagName.toLowerCase() === 'symbol';

  if (!targetIsSymbol && !isSymbolPrefix) {
    // If not a symbol node and no symbol- prefix, we might not want to handle it (could be standard SVG use reference to path)
    // However, if the user explicitly wants to import "use" elements pointing to paths as duplicated paths, that's different.
    // The requirement says "import definitions belonging to a specific plugin".
    // <use> pointing to <symbol> is definitely for this plugin.
    return null;
  }

    const widthAttrRaw = element.getAttribute('width');
    const heightAttrRaw = element.getAttribute('height');
    const xAttrRaw = element.getAttribute('x');
    const yAttrRaw = element.getAttribute('y');

    const widthAttr = parseFloat(widthAttrRaw || '0');
    const heightAttr = parseFloat(heightAttrRaw || '0');
    let x = parseFloat(xAttrRaw || '0');
    let y = parseFloat(yAttrRaw || '0');

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

    const viewBoxAttr = symbolNode?.getAttribute('viewBox');
    const viewBoxParts = viewBoxAttr ? viewBoxAttr.split(/\s+/).map(parseFloat) : null;
    const parsedViewBox: ViewBox | null =
        viewBoxParts && viewBoxParts.length === 4 && viewBoxParts.every((v) => Number.isFinite(v))
            ? { minX: viewBoxParts[0], minY: viewBoxParts[1], width: viewBoxParts[2], height: viewBoxParts[3] }
            : null;

    if (parsedViewBox) {
        if (!hasExplicitWidth && (!Number.isFinite(finalWidth) || finalWidth === 0)) finalWidth = parsedViewBox.width;
        if (!hasExplicitHeight && (!Number.isFinite(finalHeight) || finalHeight === 0)) finalHeight = parsedViewBox.height;
    }

    if (!Number.isFinite(finalWidth) || finalWidth === 0) finalWidth = parsedViewBox?.width ?? 100;
    if (!Number.isFinite(finalHeight) || finalHeight === 0) finalHeight = parsedViewBox?.height ?? 100;

    const alignToViewBoxOrigin = Boolean(parsedViewBox && !hasExplicitWidth && !hasExplicitHeight && !hasExplicitX && !hasExplicitY);
    if (alignToViewBoxOrigin && parsedViewBox) {
        // When <use> omits width/height, align the implicit viewport to the symbol's viewBox
        // so the symbol's local coordinates stay centered (avoid the default minX/minY offset).
        x += parsedViewBox.minX;
        y += parsedViewBox.minY;
    }

    if (symbolNode) {

        // Resolve color inheritance if needed (currentColor etc)
        const pathNode = symbolNode.querySelector('path');
        const symbolFill = pathNode?.getAttribute('fill');
        const symbolStroke = pathNode?.getAttribute('stroke');
        const symbolFillOpacity = pathNode?.getAttribute('fill-opacity');
        const symbolStrokeOpacity = pathNode?.getAttribute('stroke-opacity');

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
    const symbolUseNode = symbolNode?.querySelector('use');
    const symbolUseHref = symbolUseNode?.getAttribute('href') ?? symbolUseNode?.getAttribute('xlink:href');
    const symbolUseRefId = symbolUseHref?.startsWith('#') ? symbolUseHref.slice(1) : null;
    const symbolUseRefNode = symbolUseRefId ? doc?.getElementById(symbolUseRefId) : null;

    let pathData =
        symbolHasMultipleChildren
            ? undefined
            : buildPathData(symbolNode?.querySelector('path') ?? null, styleAttrs) ??
              buildPathData(symbolUseRefNode instanceof SVGPathElement ? symbolUseRefNode : null, styleAttrs) ??
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

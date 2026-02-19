import type { Matrix, ImportedElement } from '../../utils/svgImportUtils';
import { extractStyleAttributes } from '../../utils/svgImportUtils';
import { multiplyMatrices, createTranslateMatrix, type Matrix as BaseMatrix } from '../../utils/matrixUtils';
import { parsePathD } from '../../utils/pathParserUtils';
import { measurePath } from '../../utils/measurementUtils';
import type { PathData } from '../../types';
import type { UseElementData, UseReferenceType } from './types';
import { shapeToPath } from '../../utils/import/shapeToPath';

// Helper to convert object matrix to array matrix
const toArrayMatrix = (m: Matrix): BaseMatrix => [m.a, m.b, m.c, m.d, m.e, m.f];

const measureElementBBox = (element: Element): { minX: number; minY: number; width: number; height: number } | null => {
  if (typeof document === 'undefined') return null;
  try {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const clone = element.cloneNode(true) as SVGGraphicsElement;
    svg.appendChild(clone);
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.opacity = '0';
    document.body.appendChild(svg);
    const bbox = clone.getBBox?.();
    document.body.removeChild(svg);
    if (bbox) {
      return { minX: bbox.x, minY: bbox.y, width: bbox.width, height: bbox.height };
    }
  } catch {
    // ignore
  }
  return null;
};

/**
 * Build path data directly from a path element
 */
const buildPathDataFromPath = (
  pathNode: SVGPathElement,
  styleAttrs: Record<string, unknown>
): { pathData: PathData; bounds: { minX: number; minY: number; width: number; height: number } } | null => {
  const pathD = pathNode.getAttribute('d');
  if (!pathD) return null;
  
  const subPaths = [parsePathD(pathD)];
  const strokeColor = (styleAttrs as { strokeColor?: string }).strokeColor ?? pathNode.getAttribute('stroke') ?? 'none';
  const strokeWidth = (styleAttrs as { strokeWidth?: number }).strokeWidth ?? parseFloat(pathNode.getAttribute('stroke-width') ?? '1');
  const fillColor = (styleAttrs as { fillColor?: string }).fillColor ?? pathNode.getAttribute('fill') ?? 'none';
  const strokeOpacity = (styleAttrs as { strokeOpacity?: number }).strokeOpacity ?? parseFloat(pathNode.getAttribute('stroke-opacity') ?? '1');
  const fillOpacity = (styleAttrs as { fillOpacity?: number }).fillOpacity ?? parseFloat(pathNode.getAttribute('fill-opacity') ?? '1');
  
  // Extract stroke-linecap and stroke-linejoin from referenced path if not overridden
  const strokeLinecapAttr = pathNode.getAttribute('stroke-linecap') as 'butt' | 'round' | 'square' | null;
  const strokeLinejoinAttr = pathNode.getAttribute('stroke-linejoin') as 'miter' | 'round' | 'bevel' | null;
  const strokeLinecap = (styleAttrs as { strokeLinecap?: string }).strokeLinecap ?? strokeLinecapAttr ?? undefined;
  const strokeLinejoin = (styleAttrs as { strokeLinejoin?: string }).strokeLinejoin ?? strokeLinejoinAttr ?? undefined;
  
  const measured = measurePath(subPaths, strokeWidth || 1, 1);

  const pathData: PathData = {
    subPaths,
    strokeColor,
    strokeWidth,
    fillColor,
    strokeOpacity,
    fillOpacity,
    ...(strokeLinecap ? { strokeLinecap: strokeLinecap as 'butt' | 'round' | 'square' } : {}),
    ...(strokeLinejoin ? { strokeLinejoin: strokeLinejoin as 'miter' | 'round' | 'bevel' } : {}),
  };

  const bounds = {
    minX: measured.minX,
    minY: measured.minY,
    width: measured.maxX - measured.minX,
    height: measured.maxY - measured.minY,
  };

  return { pathData, bounds };
};

const buildPathDataFromShape = (
  element: Element,
  styleAttrs: Record<string, unknown>
): { pathData: PathData; bounds: { minX: number; minY: number; width: number; height: number } } | null => {
  const d = shapeToPath(element);
  if (!d) return null;
  const subPaths = [parsePathD(d)];
  const strokeColor = (styleAttrs as { strokeColor?: string }).strokeColor ?? element.getAttribute('stroke') ?? 'none';
  const strokeWidth = (styleAttrs as { strokeWidth?: number }).strokeWidth ?? parseFloat(element.getAttribute('stroke-width') ?? '1');
  const fillColor = (styleAttrs as { fillColor?: string }).fillColor ?? element.getAttribute('fill') ?? '#000000';
  const strokeOpacity = (styleAttrs as { strokeOpacity?: number }).strokeOpacity ?? parseFloat(element.getAttribute('stroke-opacity') ?? '1');
  const fillOpacity = (styleAttrs as { fillOpacity?: number }).fillOpacity ?? parseFloat(element.getAttribute('fill-opacity') ?? '1');
  const measured = measurePath(subPaths, strokeWidth || 1, 1);

  const pathData: PathData = {
    subPaths,
    strokeColor,
    strokeWidth,
    fillColor,
    strokeOpacity,
    fillOpacity,
  };

  const bounds = {
    minX: measured.minX,
    minY: measured.minY,
    width: measured.maxX - measured.minX,
    height: measured.maxY - measured.minY,
  };

  return { pathData, bounds };
};

/**
 * Import SVG <use> element
 * 
 * Per SVG spec, <use> duplicates nodes from within an SVG document.
 * This can reference:
 * - Regular elements (paths, circles, groups, etc.)
 * - External resources (not fully supported)
 * 
 * NOTE: <use> elements that reference <symbol> elements are handled
 * by the symbols plugin importer and should not be processed here.
 */
export function importUse(
  element: Element,
  transform: Matrix
): ImportedElement | null {
  const tagName = element.tagName.toLowerCase();
  
  if (tagName !== 'use') return null;
  
  // Get href reference
  const href = element.getAttribute('href') || element.getAttribute('xlink:href');
  if (!href) return null;
  
  // Parse reference
  const isLocalRef = href.startsWith('#');
  if (!isLocalRef) {
    // External reference - not fully supported yet
    // Could be a URL to another SVG file
    return null;
  }
  
  const rawId = href.slice(1);
  const doc = element.ownerDocument;
  
  // Check if this is a symbol reference - let symbols plugin handle those
  const isSymbolPrefix = rawId.startsWith('symbol-');
  if (isSymbolPrefix) {
    return null; // Let symbols plugin handle this
  }
  
  // Try to find the referenced element
  const targetElement = doc?.getElementById(rawId);
  
  // If target is a <symbol>, let symbols plugin handle it
  if (targetElement?.tagName.toLowerCase() === 'symbol') {
    return null;
  }
  
  // If target not found, we can't do much
  if (!targetElement) {
    // Could be a forward reference or undefined - return null
    return null;
  }
  
  // Determine reference type - at this point it's an element reference
  const referenceType: UseReferenceType = 'element';
  
  // Get position offsets
  const x = parseFloat(element.getAttribute('x') || '0');
  const y = parseFloat(element.getAttribute('y') || '0');
  
  // Build matrix with x/y offset
  let matrix = toArrayMatrix(transform);
  if (x !== 0 || y !== 0) {
    // Apply the <use> x/y translation before the element's own transform
    matrix = multiplyMatrices(matrix, createTranslateMatrix(x, y));
  }
  
  // Extract style attributes from the <use> element (these override target styles)
  const useStyleAttrs = extractStyleAttributes(element);
  
  // Handle color attribute (CSS currentColor) - check element and ancestors
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
    const styleRecord = useStyleAttrs as Record<string, unknown>;
    if (styleRecord.fillColor === undefined) styleRecord.fillColor = colorAttr;
    if (styleRecord.strokeColor === undefined) styleRecord.strokeColor = colorAttr;
  }
  
  // Get dimensions
  let width = parseFloat(element.getAttribute('width') || '0');
  let height = parseFloat(element.getAttribute('height') || '0');
  
  // Build data based on element type
  let cachedPathData: PathData | undefined;
  let cachedBounds: UseElementData['cachedBounds'];
  
  // Element reference - clone the element's visual
  if (targetElement instanceof SVGPathElement) {
    const parsed = buildPathDataFromPath(targetElement, useStyleAttrs);
    if (parsed) {
      cachedPathData = parsed.pathData;
      cachedBounds = measureElementBBox(targetElement) ?? parsed.bounds;
      if (width === 0) width = cachedBounds.width;
      if (height === 0) height = cachedBounds.height;
    }
  } else if (targetElement.tagName.toLowerCase() === 'circle') {
    const parsed = buildPathDataFromShape(targetElement, useStyleAttrs);
    if (parsed) {
      cachedPathData = parsed.pathData;
      cachedBounds = parsed.bounds;
      if (width === 0) width = cachedBounds.width;
      if (height === 0) height = cachedBounds.height;
    }
  } else if (targetElement.tagName.toLowerCase() === 'rect') {
    const parsed = buildPathDataFromShape(targetElement, useStyleAttrs);
    if (parsed) {
      cachedPathData = parsed.pathData;
      cachedBounds = parsed.bounds;
      if (width === 0) width = cachedBounds.width;
      if (height === 0) height = cachedBounds.height;
    }
  } else if (targetElement.tagName.toLowerCase() === 'ellipse') {
    const parsed = buildPathDataFromShape(targetElement, useStyleAttrs);
    if (parsed) {
      cachedPathData = parsed.pathData;
      cachedBounds = parsed.bounds;
      if (width === 0) width = cachedBounds.width;
      if (height === 0) height = cachedBounds.height;
    }
  } else if (targetElement.tagName.toLowerCase() === 'g') {
    // Handle group elements - get bounding box from children
    const bbox =
      (targetElement as unknown as SVGGraphicsElement).getBBox?.() ??
      measureElementBBox(targetElement);
    if (bbox) {
      cachedBounds = {
        minX: bbox.x,
        minY: bbox.y,
        width: bbox.width,
        height: bbox.height,
      };
      if (width === 0) width = bbox.width;
      if (height === 0) height = bbox.height;
    }
  } else if (targetElement.tagName.toLowerCase() === 'image') {
    // Handle <image> elements - get dimensions from attributes
    const imgWidth = parseFloat(targetElement.getAttribute('width') || '0');
    const imgHeight = parseFloat(targetElement.getAttribute('height') || '0');
    const imgX = parseFloat(targetElement.getAttribute('x') || '0');
    const imgY = parseFloat(targetElement.getAttribute('y') || '0');
    
    cachedBounds = {
      minX: imgX,
      minY: imgY,
      width: imgWidth,
      height: imgHeight,
    };
    
    if (width === 0) width = imgWidth;
    if (height === 0) height = imgHeight;
  }
  // Add more element types as needed
  
  // Default dimensions
  if (width === 0) width = 100;
  if (height === 0) height = 100;
  
  // Build style overrides from use element attributes
  const styleOverrides: UseElementData['styleOverrides'] = {};
  if ((useStyleAttrs as { strokeColor?: string }).strokeColor !== undefined) {
    styleOverrides.strokeColor = (useStyleAttrs as { strokeColor?: string }).strokeColor;
  }
  if ((useStyleAttrs as { strokeWidth?: number }).strokeWidth !== undefined) {
    styleOverrides.strokeWidth = (useStyleAttrs as { strokeWidth?: number }).strokeWidth;
  }
  if ((useStyleAttrs as { strokeOpacity?: number }).strokeOpacity !== undefined) {
    styleOverrides.strokeOpacity = (useStyleAttrs as { strokeOpacity?: number }).strokeOpacity;
  }
  if ((useStyleAttrs as { fillColor?: string }).fillColor !== undefined) {
    styleOverrides.fillColor = (useStyleAttrs as { fillColor?: string }).fillColor;
  }
  if ((useStyleAttrs as { fillOpacity?: number }).fillOpacity !== undefined) {
    styleOverrides.fillOpacity = (useStyleAttrs as { fillOpacity?: number }).fillOpacity;
  }
  // Add stroke linecap/linejoin for proper inheritance
  if ((useStyleAttrs as { strokeLinecap?: string }).strokeLinecap !== undefined) {
    styleOverrides.strokeLinecap = (useStyleAttrs as { strokeLinecap?: string }).strokeLinecap as 'butt' | 'round' | 'square';
  }
  if ((useStyleAttrs as { strokeLinejoin?: string }).strokeLinejoin !== undefined) {
    styleOverrides.strokeLinejoin = (useStyleAttrs as { strokeLinejoin?: string }).strokeLinejoin as 'miter' | 'round' | 'bevel';
  }
  
  const useData: UseElementData = {
    href: rawId,
    referenceType,
    x: 0, // Position is in the matrix
    y: 0,
    width,
    height,
    transformMatrix: matrix,
    sourceId: element.getAttribute('id') ?? undefined,
    ...(cachedPathData ? { cachedPathData } : {}),
    ...(cachedBounds ? { cachedBounds } : {}),
    ...(Object.keys(styleOverrides).length > 0 ? { styleOverrides } : {}),
  };
  
  return {
    type: 'use',
    data: useData as unknown as Record<string, unknown>,
  };
}

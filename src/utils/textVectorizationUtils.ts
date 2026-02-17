// Text vectorization utilities for converting text to SVG paths using esm-potrace-wasm
import { potrace, init } from 'esm-potrace-wasm';
import { parsePath, serialize, absolutize, normalize } from 'path-data-parser';
import type { Command } from '../types';
import { PATH_DECIMAL_PRECISION } from '../types';
import { formatToPrecision } from './numberUtils';
import { parsePathD } from './pathParserUtils';
import { isTTFFont, ttfTextToPath } from './ttfFontUtils';

const LINE_HEIGHT_MULTIPLIER = 1.2;

// Cache for text vectorization to improve performance
const textVectorizationCache = new Map<string, string>();

// Initialize potrace once
let potraceInitialized = false;
const initPotrace = async () => {
  if (!potraceInitialized) {
    await init();
    potraceInitialized = true;
  }
};

// Function to convert text to SVG path using esm-potrace-wasm
export const textToPath = async (
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): Promise<string> => {
  const cacheKey = `text2path-${text}-${x}-${y}-${fontSize}-${fontFamily}-${fontWeight}-${fontStyle}`;
  const lines = (text || '').split(/\r?\n/);
  const lineCount = Math.max(lines.length, 1);

  // Check cache first
  if (textVectorizationCache.has(cacheKey)) {
    return textVectorizationCache.get(cacheKey)!;
  }

  // Check if this is a TTF font - if so, use opentype.js directly
  if (isTTFFont(fontFamily)) {
    try {
      const pathData = await ttfTextToPath(text, x, y, fontSize, fontFamily);
      
      // Cache the result
      if (pathData) {
        textVectorizationCache.set(cacheKey, pathData);
      }
      
      return pathData;
    } catch (_error) {
      // Fall through to vectorization method if TTF fails
    }
  }

  // Initialize potrace if not already done
  await initPotrace();

  // Scale factor: render at higher resolution for better vectorization
  // But limit it to avoid memory issues with potrace-wasm
  // Potrace has internal buffer limits - being conservative with dimensions
  // The total pixel count (width * height) should not exceed ~1.5M pixels
  const maxCanvasWidth = 2048; // Maximum width (reduced from 4096)
  const maxCanvasHeight = 768; // Maximum height (reduced from 1024)
  const maxPixelCount = 1500000; // Maximum total pixels (~1.5M)
  let renderScale = 4;
  
  // Minimal padding - just 2 pixels to avoid edge artifacts
  const padding = 2;
  
  // First, measure at original size to estimate final canvas size
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = font;
  const estimateMetrics = lines.map(line => ctx.measureText(line || ' '));
  const estimateWidth = estimateMetrics.reduce((max, m) => Math.max(max, Math.ceil(m.width)), 0);
  const estimateHeight = Math.ceil(fontSize * LINE_HEIGHT_MULTIPLIER * lineCount);
  
  const estimatedPixels = estimateWidth * estimateHeight;
  
  // Adjust renderScale if estimated canvas would be too large
  const estimatedScaledWidth = estimateWidth * renderScale;
  const estimatedScaledHeight = estimateHeight * renderScale;
  const estimatedScaledPixels = estimatedScaledWidth * estimatedScaledHeight;
  
  // Check dimensions, and also check pixel count constraint
  if (estimatedScaledWidth > maxCanvasWidth || estimatedScaledHeight > maxCanvasHeight || estimatedScaledPixels > maxPixelCount) {
    const scaleByWidth = maxCanvasWidth / estimateWidth;
    const scaleByHeight = maxCanvasHeight / estimateHeight;
    const scaleByPixels = Math.sqrt(maxPixelCount / estimatedPixels);
    
    renderScale = Math.floor(Math.min(scaleByWidth, scaleByHeight, scaleByPixels));
    renderScale = Math.max(1, renderScale); // Ensure at least 1x
  }

  // Iteratively measure and adjust scale to ensure we stay within limits
  let canvasWidth = 0;
  let canvasHeight = 0;
  let scaledAscent = 0;
  let scaledDescent = 0;
  let scaledLeft = 0;
  let scaledRight = 0;
  let lineHeight = 0;
  let actualTextWidth = 0;
  let actualTextHeight = 0;
  
  // Keep trying with progressively smaller scales until we fit within limits
  while (renderScale >= 1) {
    const scaledFontSize = fontSize * renderScale;
    const scaledFont = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    ctx.font = scaledFont;

    const lineMetrics = lines.map(line => ctx.measureText(line || ' '));
    const measuredWidths = lineMetrics.map(m => Math.ceil(m.width));

    // Use actual bounding boxes for minimal padding
    scaledAscent = lineMetrics.reduce((max, m) => Math.max(max, m.actualBoundingBoxAscent || scaledFontSize * 0.8), 0);
    scaledDescent = lineMetrics.reduce((max, m) => Math.max(max, m.actualBoundingBoxDescent || scaledFontSize * 0.2), 0);
    scaledLeft = lineMetrics.reduce((min, m) => Math.min(min, m.actualBoundingBoxLeft ?? 0), Infinity);
    scaledRight = lineMetrics.reduce((max, m, idx) => Math.max(max, m.actualBoundingBoxRight ?? measuredWidths[idx]), -Infinity);
    lineHeight = Math.ceil((scaledAscent + scaledDescent) * LINE_HEIGHT_MULTIPLIER);

    // Use actual bounding box dimensions for minimal padding
    actualTextWidth = Math.ceil(scaledRight - scaledLeft);
    actualTextHeight = Math.ceil(lineHeight * lineCount);

    canvasWidth = actualTextWidth + (padding * 2);
    canvasHeight = actualTextHeight + (padding * 2);
    
    const pixelCount = canvasWidth * canvasHeight;
    
    // Check if we're within limits (both dimensions AND total pixel count)
    if (canvasWidth <= maxCanvasWidth && canvasHeight <= maxCanvasHeight && pixelCount <= maxPixelCount) {
      break; // Success! We fit within limits
    }
    
    // Reduce scale and try again
    renderScale = Math.max(1, renderScale - 1);
    
    // If we're at scale 1 and still don't fit, we need to give up
    if (renderScale === 1 && (canvasWidth > maxCanvasWidth || canvasHeight > maxCanvasHeight || pixelCount > maxPixelCount)) {
      // Last resort: force it to fit by clamping dimensions
      // If pixel count is the issue, scale down both dimensions proportionally
      if (pixelCount > maxPixelCount) {
        const scaleFactor = Math.sqrt(maxPixelCount / pixelCount);
        canvasWidth = Math.floor(canvasWidth * scaleFactor);
        canvasHeight = Math.floor(canvasHeight * scaleFactor);
      } else {
        canvasWidth = Math.min(canvasWidth, maxCanvasWidth);
        canvasHeight = Math.min(canvasHeight, maxCanvasHeight);
      }
      break;
    }
  }

  // Keep unscaled metrics for final positioning
  const actualAscent = scaledAscent / renderScale;
  const actualDescent = scaledDescent / renderScale;
  const totalTextHeight = actualTextHeight / renderScale;

  // Set canvas size at scaled resolution
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  const finalPixelCount = canvasWidth * canvasHeight;
  
  // Final safety check: verify constraints
  if (canvasWidth > maxCanvasWidth || canvasHeight > maxCanvasHeight || finalPixelCount > maxPixelCount) {
    return '';
  }

  // Set font again after canvas resize
  const scaledFontSize = fontSize * renderScale;
  const scaledFont = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;
  ctx.font = scaledFont;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Clear canvas with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw text in black at the correct baseline position
  // Adjust for actualBoundingBoxLeft to ensure text starts at padding
  ctx.fillStyle = 'black';
  const baselineY = scaledAscent + padding;
  const textX = padding - scaledLeft; // Compensate for left bearing
  const drawLineHeight = lineHeight || Math.ceil((scaledAscent + scaledDescent) * LINE_HEIGHT_MULTIPLIER);
  lines.forEach((line, idx) => {
    ctx.fillText(line, textX, baselineY + (idx * drawLineHeight));
  });

  try {
    // Use potrace to convert canvas to SVG with pathonly option
    const svgResult = await potrace(canvas, {
      turdsize: 2,
      turnpolicy: 4,
      alphamax: 1,
      opticurve: 1,
      opttolerance: 0.2,
      pathonly: false,  // Set back to false to get full SVG, then extract paths
      extractcolors: false,
    });

    // Extract path data from SVG result and position it correctly
    // Pass unscaled metrics and renderScale to scale down the result
    const pathData = extractPathFromSVGResult(svgResult, x, y, actualAscent, actualDescent, totalTextHeight);

    // Cache the result only if we got valid path data
    if (pathData) {
      textVectorizationCache.set(cacheKey, pathData);
    }

    return pathData;
  } catch (_error) {
    return '';
  }
};

// Helper function to extract and normalize path data from SVG result
const extractPathFromSVGResult = (
  svgString: string,
  targetX: number,
  targetY: number,
  actualAscent: number,
  actualDescent: number,
  textHeight?: number
): string => {
  if (!svgString || typeof svgString !== 'string') {
    return '';
  }

  // Parse SVG to extract path data
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');

  // Check for parsing errors
  const parserError = svgDoc.querySelector('parsererror');
  if (parserError) {
    return '';
  }

  // Extract path elements
  const pathElements = svgDoc.querySelectorAll('path');

  if (pathElements.length === 0) {
    return '';
  }

  const allNormalizedSegments: Array<Array<{ key: string; data: number[] }>> = [];

  // First pass: Process each path element using path-data-parser
  for (const pathElement of pathElements) {
    const pathData = pathElement.getAttribute('d');

    if (!pathData) continue;

    try {
      // Parse the path string using path-data-parser
      const segments = parsePath(pathData);

      // Convert relative commands to absolute
      const absoluteSegments = absolutize(segments);

      // Normalize to only M, L, C, Z commands
      const normalizedSegments = normalize(absoluteSegments);

      allNormalizedSegments.push(normalizedSegments);
    } catch {
      // Error processing path data
    }
  }

  if (allNormalizedSegments.length === 0) {
    return '';
  }

  // Calculate global bounds for all paths together
  const globalBounds = calculateGlobalBounds(allNormalizedSegments);

  // Transform all paths using the same scale and offset to preserve relative positions
  const allTransformedPaths: string[] = [];

  for (const normalizedSegments of allNormalizedSegments) {
    try {
      // Transform coordinates to target position using global bounds
      const transformedSegments = transformSegmentsWithGlobalBounds(
        normalizedSegments,
        targetX,
        targetY,
        globalBounds,
        actualAscent,
        actualDescent,
        textHeight
      );

      // Serialize back to path string
      const transformedPath = serialize(transformedSegments);

      if (transformedPath) {
        allTransformedPaths.push(transformedPath);
      }
    } catch (_error) {
      // Error transforming path
    }
  }

  const result = allTransformedPaths.join(' ');

  return result;
};

// Calculate global bounds for all paths to preserve relative positions
const calculateGlobalBounds = (allSegments: Array<Array<{ key: string; data: number[] }>>): { minX: number, minY: number, maxX: number, maxY: number, width: number, height: number } => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const segments of allSegments) {
    for (const segment of segments) {
      const { key, data } = segment;

      if (key === 'M' || key === 'L') {
        // Move and Line commands have x,y coordinates
        for (let i = 0; i < data.length; i += 2) {
          const x = data[i];
          const y = data[i + 1];
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      } else if (key === 'C') {
        // Curve commands have multiple control points and end point
        for (let i = 0; i < data.length; i += 2) {
          const x = data[i];
          const y = data[i + 1];
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
};

// Transform segments using global bounds to preserve relative positions between paths
const transformSegmentsWithGlobalBounds = (
  segments: Array<{ key: string; data: number[] }>,
  targetX: number,
  targetY: number,
  globalBounds: { minX: number, minY: number, maxX: number, maxY: number, width: number, height: number },
  actualAscent: number,
  actualDescent: number,
  textHeight?: number
): Array<{ key: string; data: number[] }> => {
  if (!segments || segments.length === 0) {
    return [];
  }

  // Usar las métricas reales del texto para cálculos más precisos
  // actualAscent y actualDescent ya están sin escalar (en el tamaño original del fontSize)
  const realTextHeight = textHeight ?? (actualAscent + actualDescent);

  // globalBounds contiene las coordenadas del SVG generado por potrace
  // que está en el tamaño del canvas escalado (renderScale * fontSize)
  // Para convertir de coordenadas del canvas escalado a coordenadas finales:
  // 1. Las coordenadas del canvas están en escala renderScale
  // 2. realTextHeight es el tamaño final deseado (sin escalar)
  // 3. globalBounds.height es el tamaño del canvas (escalado)
  // Por lo tanto: scaleFactor = tamaño_final / tamaño_canvas
  const scaledHeight = globalBounds.height || 1;
  const scaleFactor = realTextHeight / scaledHeight;

  // Posicionamiento más preciso usando las métricas reales
  // targetY es la baseline, la esquina superior izquierda está en targetY - actualAscent
  const textTopLeftX = targetX;
  const textTopLeftY = targetY - actualAscent;

  // Offset para mover el path a la esquina superior izquierda exacta del texto
  const offsetX = textTopLeftX - (globalBounds.minX * scaleFactor);
  const offsetY = textTopLeftY - (globalBounds.minY * scaleFactor);

  // Transform coordinates
  const transformedSegments = segments.map(segment => {
    const { key, data } = segment;

    if (key === 'Z') {
      // Close path command has no data
      return { key, data };
    }

    const transformedData = [];
    for (let i = 0; i < data.length; i += 2) {
      let x = data[i];
      let y = data[i + 1];

      // Aplicar escala y offset
      x = (x * scaleFactor) + offsetX;
      // Restaurar la inversión Y para manejar diferencia de coordenadas Canvas/SVG
      y = offsetY + (globalBounds.maxY - y) * scaleFactor;

      transformedData.push(formatToPrecision(x, PATH_DECIMAL_PRECISION));
      transformedData.push(formatToPrecision(y, PATH_DECIMAL_PRECISION));
    }

    return { key, data: transformedData };
  });

  return transformedSegments;
};

/**
 * Convert text to structured path commands (instead of SVG string)
 */
export const textToPathCommands = async (
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): Promise<Command[]> => {
  // Get the SVG path string first
  const pathString = await textToPath(text, x, y, fontSize, fontFamily, fontWeight, fontStyle);

  if (!pathString) {
    return [];
  }

  // Parse the string into commands
  const commands = parsePathD(pathString);

  // Return commands directly without removing Z commands
  return commands;
};

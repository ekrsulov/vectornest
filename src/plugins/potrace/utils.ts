/**
 * Potrace conversion utilities
 * Converts SVG elements to paths using potrace
 */

import { potrace, init } from 'esm-potrace-wasm';
import { parsePath, absolutize, normalize, serialize } from 'path-data-parser';
import type { CanvasElement } from '../../types';
import { serializePathsForExport } from '../../utils/exportUtils';
import { logger } from '../../utils/logger';

// Initialize potrace once
let potraceInitialized = false;
const initPotrace = async () => {
  if (!potraceInitialized) {
    await init();
    potraceInitialized = true;
  }
};

interface PotraceOptions {
  threshold?: number; // 0-255, default 128
  turnPolicy?: 'black' | 'white' | 'left' | 'right' | 'minority' | 'majority';
  turdSize?: number; // suppress speckles of this size
  optCurve?: boolean; // curve optimization
  optTolerance?: number; // curve optimization tolerance
  alphaMax?: number; // corner threshold parameter
  minPathSegments?: number; // minimum path length in segments to keep
  renderScale?: number; // scale for intermediate canvas
  canvasPadding?: number; // extra padding when rasterizing selection
  logDebugImage?: boolean; // log data URL of raster before tracing
  // CSS Filter preprocessing (like SVGcode)
  brightness?: number; // 0-200, default 100
  contrast?: number; // 0-200, default 100
  grayscale?: number; // 0-100, default 0
  invert?: number; // 0-100, default 0
  // Output mode
  colorMode?: 'monochrome' | 'color'; // default 'monochrome'
}

interface MaskCrop {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Extract unique colors from image data
 * Returns a map of colors (rgba string) to pixel locations
 */
function extractColors(imageData: ImageData): Record<string, number[]> {
  const colors: Record<string, number[]> = {};
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    
    // Skip transparent pixels
    if (a === 0) {
      continue;
    }
    
    const rgba = `${r},${g},${b},${a}`;
    if (!colors[rgba]) {
      colors[rgba] = [i];
    } else {
      colors[rgba].push(i);
    }
  }
  
  return colors;
}

/**
 * Convert selection to potrace using color extraction (like SVGcode)
 * Extracts each unique color and runs potrace separately for each
 */
async function convertToColorPotrace(
  imageData: ImageData,
  options: {
    threshold: number;
    turnPolicy: string;
    turdSize: number;
    optCurve: boolean;
    optTolerance: number;
    alphaMax: number;
  }
): Promise<{ pathData: string; colors: Array<{ r: number; g: number; b: number; a: number }> } | null> {
  const colors = extractColors(imageData);
  const colorCount = Object.keys(colors).length;
  
  logger.info(`Extracted ${colorCount} unique colors for color potrace`);
  
  if (colorCount === 0) {
    logger.warn('No colors found in image');
    return null;
  }
  
  const pathsWithColors: Array<{ pathData: string; color: { r: number; g: number; b: number; a: number } }> = [];
  
  for (const [colorStr, occurrences] of Object.entries(colors)) {
    // Create a new ImageData with only this color (as black on white)
    const colorImageData = new ImageData(imageData.width, imageData.height);
    // Fill with white background
    colorImageData.data.fill(255);
    
    // Set pixels of this color to black
    const len = occurrences.length;
    for (let i = 0; i < len; i++) {
      const location = occurrences[i];
      colorImageData.data[location] = 0;
      colorImageData.data[location + 1] = 0;
      colorImageData.data[location + 2] = 0;
      colorImageData.data[location + 3] = 255;
    }
    
    // Run potrace on this color layer
    const svgString = await potrace(colorImageData, {
      threshold: options.threshold,
      turnPolicy: options.turnPolicy,
      turdSize: options.turdSize,
      optCurve: options.optCurve,
      optTolerance: options.optTolerance,
      alphaMax: options.alphaMax,
    });
    
    // Extract path data from the SVG
    const pathMatch = svgString.match(/<path\s+d="([^"]+)"/);
    if (pathMatch && pathMatch[1]) {
      const [r, g, b, a] = colorStr.split(',').map(Number);
      pathsWithColors.push({
        pathData: pathMatch[1],
        color: { r, g, b, a },
      });
      
      logger.info(`Traced color rgba(${r},${g},${b},${a / 255}) with ${occurrences.length} pixels`);
    }
  }
  
  if (pathsWithColors.length === 0) {
    return null;
  }
  
  // Combine all path data
  const combinedPathData = pathsWithColors.map(p => p.pathData).join(' ');
  const colorInfo = pathsWithColors.map(p => p.color);
  
  return { pathData: combinedPathData, colors: colorInfo };
}

/**
 * Calculate bounding box of a path
 */
function getPathBounds(pathData: string): { minX: number; minY: number; maxX: number; maxY: number; area: number } | null {
  const coords: number[] = [];
  const numbers = pathData.match(/[-+]?\d*\.?\d+/g);
  
  if (!numbers) return null;
  
  for (let i = 0; i < numbers.length; i += 2) {
    coords.push(parseFloat(numbers[i]), parseFloat(numbers[i + 1]));
  }
  
  if (coords.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (let i = 0; i < coords.length; i += 2) {
    const x = coords[i];
    const y = coords[i + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  
  const area = (maxX - minX) * (maxY - minY);
  return { minX, minY, maxX, maxY, area };
}

/**
 * Check if two paths are similar (duplicate or near-duplicate)
 * For stroke-only shapes, inner and outer edges have nearly identical bounds
 */
function arePathsSimilar(path1: string, path2: string, tolerance = 0.05): boolean {
  const bounds1 = getPathBounds(path1);
  const bounds2 = getPathBounds(path2);
  
  if (!bounds1 || !bounds2) return false;
  
  // Compare bounding box dimensions
  const width1 = bounds1.maxX - bounds1.minX;
  const height1 = bounds1.maxY - bounds1.minY;
  const width2 = bounds2.maxX - bounds2.minX;
  const height2 = bounds2.maxY - bounds2.minY;
  
  // If widths and heights are very similar (within tolerance), likely duplicates
  const widthDiff = Math.abs(width1 - width2) / Math.max(width1, width2);
  const heightDiff = Math.abs(height1 - height2) / Math.max(height1, height2);
  
  if (widthDiff > tolerance || heightDiff > tolerance) return false;
  
  // Compare areas
  const areaDiff = Math.abs(bounds1.area - bounds2.area) / Math.max(bounds1.area, bounds2.area);
  if (areaDiff > tolerance) return false;
  
  // Compare bounding box centers
  const center1X = (bounds1.minX + bounds1.maxX) / 2;
  const center1Y = (bounds1.minY + bounds1.maxY) / 2;
  const center2X = (bounds2.minX + bounds2.maxX) / 2;
  const center2Y = (bounds2.minY + bounds2.maxY) / 2;
  
  const centerDiffX = Math.abs(center1X - center2X) / Math.max(width1, width2);
  const centerDiffY = Math.abs(center1Y - center2Y) / Math.max(height1, height2);
  
  // If centers are very close relative to size, consider them duplicates
  return centerDiffX < tolerance && centerDiffY < tolerance;
}

/**
 * Remove duplicate/similar subpaths
 * This is crucial for stroke-only shapes where potrace detects inner and outer edges
 */
function removeDuplicateSubpaths(pathData: string): string {
  const pathRegex = /M[^M]+/g;
  const paths = pathData.match(pathRegex) || [];
  
  if (paths.length <= 1) {
    return pathData;
  }
  
  logger.info(`Checking ${paths.length} subpaths for duplicates`);
  
  const toRemove = new Set<number>();
  
  // Compare each path with others
  for (let i = 0; i < paths.length; i++) {
    if (toRemove.has(i)) continue;
    
    const bounds_i = getPathBounds(paths[i]);
    if (!bounds_i) continue;
    
    for (let j = i + 1; j < paths.length; j++) {
      if (toRemove.has(j)) continue;
      
      if (arePathsSimilar(paths[i], paths[j])) {
        // Keep the one with larger area (outer edge)
        const bounds_j = getPathBounds(paths[j]);
        if (bounds_j) {
          if (bounds_i.area >= bounds_j.area) {
            toRemove.add(j);
            logger.info(`Removing duplicate subpath ${j} (similar to ${i})`);
          } else {
            toRemove.add(i);
            logger.info(`Removing duplicate subpath ${i} (similar to ${j})`);
            break; // i is removed, no need to check further
          }
        }
      }
    }
  }
  
  const uniquePaths = paths.filter((_, idx) => !toRemove.has(idx));
  
  logger.info(`Removed duplicate subpaths: ${paths.length} -> ${uniquePaths.length}`);
  
  return uniquePaths.join(' ');
}

/**
 * Filter out short paths from SVG path data
 * Like SVGcode, removes paths with fewer segments than minPathSegments
 */
function filterShortPaths(pathData: string, minPathSegments: number): string {
  if (minPathSegments <= 0) {
    return pathData;
  }
  
  // Match individual path commands (M...Z or M... without Z)
  const pathRegex = /M[^M]+/g;
  const paths = pathData.match(pathRegex) || [];
  
  const filteredPaths = paths.filter(path => {
    // Count the number of segments (commands) in this subpath
    // Split by spaces and count uppercase letters (commands)
    const segments = path.split(/\s+/).filter(seg => /^[A-Z]/.test(seg));
    return segments.length >= minPathSegments;
  });
  
  logger.info(`Filtered paths: ${paths.length} -> ${filteredPaths.length} (minSegments: ${minPathSegments})`);
  
  return filteredPaths.join(' ');
}

/**
 * Convert selected elements to a rasterized image, then trace with potrace
 * @param elements All canvas elements
 * @param selectedIds IDs of selected elements
 * @param options Potrace configuration
 * @returns SVG path data string
 */
export async function convertSelectionToPotrace(
  elements: CanvasElement[],
  selectedIds: string[],
  options: PotraceOptions = {},
  defsContent?: string
): Promise<string | null> {
  if (selectedIds.length === 0) {
    logger.warn('No elements selected for potrace conversion');
    return null;
  }

  await initPotrace();

  // Get options with defaults
  const {
    threshold = 128,
    turnPolicy = 'minority',
    turdSize = 2,
    optCurve = true,
    optTolerance = 0.2,
    alphaMax = 1.0,
    minPathSegments = 0,
    renderScale = 4,
    canvasPadding = 6,
    logDebugImage = true,
    brightness = 100,
    contrast = 100,
    grayscale = 0,
    invert = 0,
    colorMode = 'monochrome',
  } = options;

  try {
    // Step 1: Serialize selected elements to SVG
    const serialized = serializePathsForExport(
      elements,
      selectedIds,
      { selectedOnly: true, padding: canvasPadding, defs: defsContent }
    );

    if (!serialized) {
      logger.error('Failed to serialize selection');
      return null;
    }

    const { svgContent, bounds } = serialized;

    // Validate bounds
    if (bounds.width <= 0 || bounds.height <= 0) {
      logger.error('Invalid bounds for SVG', { width: bounds.width, height: bounds.height });
      return null;
    }

    logger.info('Converting selection to potrace', { 
      bounds, 
      renderScale,
      svgLength: svgContent.length 
    });
    
    logger.info('Serialized SVG content (first 1000 chars)', svgContent.substring(0, 1000));

    // Step 2: Render SVG to canvas
    const canvas = await renderSvgToCanvas(svgContent, {
      width: bounds.width,
      height: bounds.height,
      minX: bounds.minX,
      minY: bounds.minY,
    }, renderScale);
    if (!canvas) {
      logger.error('Failed to render SVG to canvas');
      return null;
    }

    // Step 3: Get image data from canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logger.error('Could not get canvas context');
      return null;
    }

    // Apply CSS filters before extracting image data (like SVGcode)
    // This allows brightness/contrast/grayscale/invert adjustments
    const filters: string[] = [];
    
    if (brightness !== 100) {
      filters.push(`brightness(${brightness}%)`);
    }
    if (contrast !== 100) {
      filters.push(`contrast(${contrast}%)`);
    }
    if (grayscale > 0) {
      filters.push(`grayscale(${grayscale}%)`);
    }
    if (invert > 0) {
      filters.push(`invert(${invert}%)`);
    }
    
    if (filters.length > 0) {
      // Apply filters by drawing canvas onto itself with filter
      const filterString = filters.join(' ');
      logger.info('Applying CSS filters', { filterString });
      
      // Create a temporary canvas to apply filters
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.filter = filterString;
        tempCtx.drawImage(canvas, 0, 0);
        // Copy filtered image back to original canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }

    // Draw a removable border so the traced output includes a frame that can be deleted later
    ctx.save();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    ctx.restore();

    if (logDebugImage) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        logger.info(dataUrl);
      } catch (error) {
        logger.warn('Failed to encode debug canvas for potrace', error);
      }
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    logger.info('Canvas dimensions for potrace', { 
      width: canvas.width, 
      height: canvas.height,
      expectedViewBox: `0 0 ${canvas.width} ${canvas.height}`
    });
    
    // Check if canvas is completely blank (white or transparent)
    // This happens when external images fail to load due to CORS
    const pixels = imageData.data;
    let allWhite = true;
    let allTransparent = true;
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      if (r !== 255 || g !== 255 || b !== 255) {
        allWhite = false;
      }
      if (a !== 0) {
        allTransparent = false;
      }
      
      if (!allWhite && !allTransparent) break;
    }
    
    if (allWhite || allTransparent) {
      logger.warn('Canvas appears to be blank - this may happen with external images due to CORS restrictions');
      // Continue anyway - user might want to trace a blank canvas
    }
    let pathData: string;
    let viewBox: { width: number; height: number };
    let traceWidth: number;
    let traceHeight: number;
    let crop: MaskCrop | null = null;
    
    // Step 4: Apply potrace
    if (colorMode === 'color') {
      // Color mode: extract colors and trace each separately (like SVGcode)
      logger.info('Using color mode - extracting unique colors');
      
      const colorResult = await convertToColorPotrace(imageData, {
        threshold,
        turnPolicy,
        turdSize,
        optCurve,
        optTolerance,
        alphaMax,
      });
      
      if (!colorResult) {
        logger.error('Failed to extract colors for color potrace');
        return null;
      }
      
      pathData = colorResult.pathData;
      viewBox = { width: canvas.width, height: canvas.height };
      traceWidth = canvas.width;
      traceHeight = canvas.height;
      
      logger.info(`Color mode traced ${colorResult.colors.length} colors`);
    } else {
      // Monochrome mode: convert to binary mask and trace once
      logger.info('Using monochrome mode - creating binary mask');
      
      const { mask: binaryMask, crop: maskCrop } = createBinaryMask(imageData, threshold);
      crop = maskCrop;
      const traceImageData = crop ? cropImageData(binaryMask, crop) : binaryMask;
      traceWidth = crop ? crop.width : binaryMask.width;
      traceHeight = crop ? crop.height : binaryMask.height;

      logger.info('Binary mask prepared for potrace', {
        traceWidth,
        traceHeight,
        crop,
        originalCanvas: { width: canvas.width, height: canvas.height },
      });

      const svgString = await potrace(traceImageData, {
        threshold,
        turnPolicy,
        turdSize,
        optCurve,
        optTolerance,
        alphaMax,
      });

      logger.info('Potrace output SVG (first 1000 chars)', svgString.substring(0, 1000));

      // Parse SVG output and extract path data with viewBox info
      const extraction = extractPathDataFromSvg(svgString);
      if (!extraction) {
        logger.error('Failed to extract path data from potrace output');
        return null;
      }
      
      pathData = extraction.pathData;
      viewBox = extraction.viewBox;
    }
    
    logger.info('Raw path data from potrace (first 500 chars)', pathData.substring(0, 500));
    
    // Use canvas dimensions as the source coordinate space
    // Potrace's viewBox might not match canvas dimensions, so we use what we know
    const potraceViewBox = {
      width: viewBox.width || traceWidth,
      height: viewBox.height || traceHeight
    };
    
    logger.info('Using viewBox for coordinate transformation', {
      potraceViewBox,
      canvasDimensions: { width: canvas.width, height: canvas.height }
    });

    // Remove the artificial border rectangle before scaling
    const borderStrippedPathData = stripBorderRectangle(
      pathData,
      potraceViewBox.width,
      potraceViewBox.height
    );

    // Remove duplicate/similar subpaths (crucial for stroke-only shapes)
    const dedupedPathData = removeDuplicateSubpaths(borderStrippedPathData);

    // Filter out short paths if minPathSegments is set
    const filteredPathData = filterShortPaths(dedupedPathData, minPathSegments);

    // Step 6: Scale back to original coordinates using the viewBox from potrace
    const scaledPathData = scalePathData(
      filteredPathData,
      crop
        ? {
            minX: bounds.minX + (crop.minX / renderScale),
            minY: bounds.minY + (crop.minY / renderScale),
            width: (crop.width / renderScale),
            height: (crop.height / renderScale),
          }
        : bounds,
      potraceViewBox
    );

    return scaledPathData;
  } catch (error) {
    logger.error('Error during potrace conversion', error);
    return null;
  }
}

/**
 * Render SVG content to a canvas element
 */
async function renderSvgToCanvas(
  svgContent: string,
  bounds: { width: number; height: number; minX: number; minY: number },
  scale: number
): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      logger.error('Could not get canvas 2d context');
      resolve(null);
      return;
    }

    // Set canvas dimensions with scale
    canvas.width = Math.ceil(bounds.width * scale);
    canvas.height = Math.ceil(bounds.height * scale);

    // Validate canvas dimensions
    if (canvas.width <= 0 || canvas.height <= 0) {
      logger.error('Invalid canvas dimensions', { width: canvas.width, height: canvas.height });
      resolve(null);
      return;
    }

    logger.info('Rendering SVG to canvas', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      scale,
    });

    // Use Blob URL instead of data URL for better compatibility
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    
    img.onload = () => {
      try {
        // Give embedded images time to load before drawing
        setTimeout(() => {
          // Draw scaled image to canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          logger.info('Successfully rendered SVG to canvas');
          URL.revokeObjectURL(url);
          resolve(canvas);
        }, 100); // Small delay to allow embedded images to load
      } catch (error) {
        logger.error('Error drawing image to canvas', error);
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };

    img.onerror = (error) => {
      logger.error('Failed to load SVG image for potrace', error);
      console.error('SVG Content (first 500 chars):', svgContent.substring(0, 500));
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

function createBinaryMask(imageData: ImageData, threshold: number): { mask: ImageData; crop: MaskCrop | null } {
  const { width, height, data } = imageData;
  const mask = new ImageData(width, height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  // Convert to luminance and binarize
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Treat transparent pixels as white to avoid tracing empty padding
      const isOpaque = a > 0;
      const luminance = isOpaque ? (0.299 * r + 0.587 * g + 0.114 * b) : 255;
      const isForeground = luminance < threshold;

      const value = isForeground ? 0 : 255;
      mask.data[idx] = value;
      mask.data[idx + 1] = value;
      mask.data[idx + 2] = value;
      mask.data[idx + 3] = 255;

      if (isForeground) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    return { mask, crop: null };
  }

  const crop: MaskCrop = {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  return { mask, crop };
}

function cropImageData(source: ImageData, crop: MaskCrop): ImageData {
  const { width, data } = source;
  const cropped = new ImageData(crop.width, crop.height);

  for (let y = 0; y < crop.height; y++) {
    for (let x = 0; x < crop.width; x++) {
      const srcX = crop.minX + x;
      const srcY = crop.minY + y;
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * crop.width + x) * 4;

      cropped.data[dstIdx] = data[srcIdx];
      cropped.data[dstIdx + 1] = data[srcIdx + 1];
      cropped.data[dstIdx + 2] = data[srcIdx + 2];
      cropped.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return cropped;
}

function stripBorderRectangle(pathData: string, viewBoxWidth: number, viewBoxHeight: number): string {
  if (!pathData || !viewBoxWidth || !viewBoxHeight) {
    return pathData;
  }

  try {
    const segments = normalize(absolutize(parsePath(pathData)));
    const subpaths: Array<Array<{ key: string; data: number[] }>> = [];
    let current: Array<{ key: string; data: number[] }> = [];

    for (const seg of segments) {
      if (seg.key === 'M' && current.length) {
        subpaths.push(current);
        current = [];
      }
      current.push(seg);
    }
    if (current.length) {
      subpaths.push(current);
    }

    const bboxOf = (sp: Array<{ key: string; data: number[] }>) => {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const seg of sp) {
        const { data } = seg;
        if (!data) continue;
        for (let i = 0; i < data.length; i += 2) {
          const x = data[i];
          const y = data[i + 1];
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    };

    const isBorder = (sp: Array<{ key: string; data: number[] }>) => {
      const hasClose = sp.some(s => s.key === 'Z');
      if (!hasClose) return false;
      const { minX, minY, maxX, maxY, width, height } = bboxOf(sp);
      const tol = Math.max(viewBoxWidth, viewBoxHeight) * 0.02; // 2% tolerance
      const near = (a: number, b: number) => Math.abs(a - b) <= tol;
      const spansWidth = width >= viewBoxWidth - tol;
      const spansHeight = height >= viewBoxHeight - tol;
      const anchored = near(minX, 0) && near(minY, 0) && near(maxX, viewBoxWidth) && near(maxY, viewBoxHeight);
      return spansWidth && spansHeight && anchored;
    };

    const kept = subpaths.filter(sp => !isBorder(sp));
    if (kept.length === subpaths.length) {
      return pathData;
    }

    const flattened = kept.flat();
    return serialize(flattened);
  } catch {
    return pathData;
  }
}

/**
 * Extract path data from potrace SVG output and get its viewBox
 * Also detects and accounts for transform scaling from potrace's <g> element
 */
function extractPathDataFromSvg(svgString: string): { pathData: string; viewBox: { width: number; height: number } } | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    logger.error('SVG parsing error', parserError.textContent);
    return null;
  }

  // Get the SVG element to check viewBox
  const svgElement = doc.querySelector('svg');
  let viewBoxWidth = 0;
  let viewBoxHeight = 0;
  
  if (svgElement) {
    const viewBox = svgElement.getAttribute('viewBox');
    const width = svgElement.getAttribute('width');
    const height = svgElement.getAttribute('height');
    logger.info('Potrace SVG attributes', { viewBox, width, height });
    
    // Parse viewBox: "minX minY width height"
    if (viewBox) {
      const parts = viewBox.split(/\s+/);
      if (parts.length === 4) {
        viewBoxWidth = parseFloat(parts[2]);
        viewBoxHeight = parseFloat(parts[3]);
      }
    }
    
    // Fallback to width/height attributes
    if (!viewBoxWidth && width) viewBoxWidth = parseFloat(width);
    if (!viewBoxHeight && height) viewBoxHeight = parseFloat(height);
  }

  // Check for transform scaling in the <g> element
  // Potrace often wraps paths in: <g transform="translate(0,H) scale(0.1,-0.1)">
  // This means path coordinates are scaled 10x
  let scaleX = 1;
  let scaleY = 1;
  const gElement = doc.querySelector('g[transform]');
  if (gElement) {
    const transform = gElement.getAttribute('transform');
    if (transform) {
      // Match scale(sx, sy) or scale(sx,sy)
      const scaleMatch = transform.match(/scale\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
      if (scaleMatch) {
        scaleX = parseFloat(scaleMatch[1]);
        scaleY = parseFloat(scaleMatch[2]);
        logger.info('Detected transform scale in potrace output', { scaleX, scaleY, transform });
        
        // Adjust viewBox dimensions to account for the scale
        // If scale is 0.1, then coordinates are 10x larger
        viewBoxWidth = viewBoxWidth / scaleX;
        viewBoxHeight = viewBoxHeight / Math.abs(scaleY); // abs because scaleY might be negative
        
        logger.info('Adjusted viewBox for scale', { viewBoxWidth, viewBoxHeight });
      }
    }
  }

  // Extract all path elements
  const pathElements = doc.querySelectorAll('path');
  if (pathElements.length === 0) {
    return null;
  }

  // Combine all paths into a single path data string
  const pathDataArray: string[] = [];
  
  for (const pathElement of pathElements) {
    const d = pathElement.getAttribute('d');
    if (d) {
      pathDataArray.push(d);
    }
  }

  return {
    pathData: pathDataArray.join(' '),
    viewBox: { width: viewBoxWidth, height: viewBoxHeight }
  };
}

/**
 * Scale path data back to original coordinates
 * Maps from potrace viewBox coordinates to original SVG coordinates
 */
function scalePathData(
  pathData: string,
  bounds: { minX: number; minY: number; width: number; height: number },
  potraceViewBox: { width: number; height: number }
): string {
  try {
    // Parse the path using path-data-parser
    const segments = parsePath(pathData);
    const absoluteSegments = absolutize(segments);
    const normalizedSegments = normalize(absoluteSegments);

    logger.info('Scaling path data', {
      potraceViewBox,
      targetBounds: bounds,
      segmentCount: normalizedSegments.length
    });
    
    // Log first segment to see structure
    if (normalizedSegments.length > 0) {
      logger.info('First segment before transform', normalizedSegments[0]);
    }

    // Scale each segment back to original coordinates
    // potrace outputs coordinates in its viewBox space (0,0 to viewBoxWidth,viewBoxHeight)
    // We need to map them to original SVG space (minX,minY to maxX,maxY)
    const scaledSegments = normalizedSegments.map((seg) => {
      // Helper function to transform coordinates
      const transformX = (x: number) => {
        // Map from potrace space [0, viewBoxWidth] to SVG space [minX, maxX]
        return bounds.minX + (x / potraceViewBox.width) * bounds.width;
      };
      
      const transformY = (y: number) => {
        // Map from potrace space [0, viewBoxHeight] to SVG space [minY, maxY]
        // Potrace uses bottom-up Y coordinates (0 at bottom), SVG uses top-down (0 at top)
        // The transform scale(0.1, -0.1) inverts Y, but we're reading raw coordinates
        // So we need to invert: y_flipped = viewBoxHeight - y
        const flippedY = potraceViewBox.height - y;
        return bounds.minY + (flippedY / potraceViewBox.height) * bounds.height;
      };
      
      // path-data-parser normalize() returns { key: 'M', data: [x, y, ...] }
      // We need to transform the coordinates in the data array
      if ('data' in seg && Array.isArray(seg.data)) {
        const transformedData = seg.data.map((value, index) => {
          // X coordinates are at even indices, Y at odd indices
          if (index % 2 === 0) {
            return transformX(value);
          } else {
            return transformY(value);
          }
        });
        
        return { ...seg, data: transformedData };
      }
      
      return seg;
    });
    
    // Log first transformed segment
    if (scaledSegments.length > 0) {
      logger.info('First segment after transform', scaledSegments[0]);
    }

    // Convert back to path data string using serialize
    const pathString = serialize(scaledSegments);
    
    logger.info('Scaled path data', { 
      originalLength: pathData.length, 
      scaledLength: pathString.length,
      potraceViewBox,
      targetBounds: bounds 
    });
    
    return pathString;
  } catch (error) {
    logger.error('Error scaling path data', error);
    return pathData; // Return original if scaling fails
  }
}

/**
 * Visual Center Algorithm
 * Based on https://github.com/javierbyte/visual-center
 * 
 * This algorithm finds the visual/optical center of a shape by analyzing
 * the distribution of pixels and their distances from candidate center points.
 */

import { deepDebugLog } from './debugUtils';

const COLOR_DIFF_WEIGHT_EXPO = 0.333;
const ROUNDS = 250;

// Protection padding percentages (applied before final displacement)
// These prevent the content from getting too close to the container edges
export const PROTECTION_PADDING_TOP_PERCENT = 2.5;
export const PROTECTION_PADDING_BOTTOM_PERCENT = 2.5;
export const PROTECTION_PADDING_LEFT_PERCENT = 2.5;
export const PROTECTION_PADDING_RIGHT_PERCENT = 2.5;

interface RGBColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Point {
  x: number;
  y: number;
}

interface VisualCenterOptions {
  bgColor: RGBColor;
  height: number;
  width: number;
  maxDiff: number;
  maxDistance: number;
}

/**
 * Calculate the visual center of an RGB matrix
 * @param rgbMatrix - The RGB matrix to analyze
 * @param knownBgColor - Optional known background color. If provided, uses this instead of auto-detecting from [0][0]
 */
export function calculateVisualCenter(rgbMatrix: RGBColor[][], knownBgColor?: RGBColor): Point {
  let visualLeft = 0.5;
  let visualTop = 0.5;

  // Iteratively refine the visual center
  ({ visualLeft } = recursiveGetCoord(rgbMatrix, visualLeft, visualTop, 'X', 1 / ROUNDS, knownBgColor));
  ({ visualLeft } = recursiveGetCoord(rgbMatrix, visualLeft, visualTop, 'X', -1 / ROUNDS, knownBgColor));
  ({ visualTop } = recursiveGetCoord(rgbMatrix, visualLeft, visualTop, 'Y', 1 / ROUNDS, knownBgColor));
  ({ visualTop } = recursiveGetCoord(rgbMatrix, visualLeft, visualTop, 'Y', -1 / ROUNDS, knownBgColor));

  return { 
    x: visualLeft, 
    y: visualTop 
  };
}

/**
 * Recursively find the optimal coordinate along an axis
 */
function recursiveGetCoord(
  rgbMatrix: RGBColor[][],
  visualLeft: number,
  visualTop: number,
  currentAxis: 'X' | 'Y',
  stepSize: number,
  knownBgColor?: RGBColor
): { visualLeft: number; visualTop: number } {
  // Use known background color if provided, otherwise auto-detect from [0][0]
  const bgColor = knownBgColor 
    ? normalizeColor(knownBgColor) 
    : normalizeColor(rgbMatrix[0][0]);
  
  const height = rgbMatrix.length;
  const width = rgbMatrix[0].length;

  const ops: VisualCenterOptions = {
    bgColor,
    height,
    width,
    maxDiff:
      Math.max(bgColor.r, 255 - bgColor.r) +
      Math.max(bgColor.g, 255 - bgColor.g) +
      Math.max(bgColor.b, 255 - bgColor.b),
    maxDistance: getDistance([0, 0], [width, height])
  };

  let visualLeftToApply = visualLeft;
  let visualTopToApply = visualTop;
  let newVisualLeft = visualLeft;
  let newVisualTop = visualTop;

  if (currentAxis === 'X') {
    newVisualLeft += stepSize;
  } else {
    newVisualTop += stepSize;
  }

  let oldCenterIntensity = getCenterIntensity(rgbMatrix, visualLeft, visualTop, ops);
  let newCenterIntensity = getCenterIntensity(rgbMatrix, newVisualLeft, newVisualTop, ops);

  while (newCenterIntensity > oldCenterIntensity) {
    visualLeftToApply = newVisualLeft;
    visualTopToApply = newVisualTop;

    if (currentAxis === 'X') {
      newVisualLeft += stepSize;
    } else {
      newVisualTop += stepSize;
    }

    oldCenterIntensity = newCenterIntensity;
    newCenterIntensity = getCenterIntensity(rgbMatrix, newVisualLeft, newVisualTop, ops);
  }

  return {
    visualLeft: visualLeftToApply,
    visualTop: visualTopToApply
  };
}

/**
 * Calculate the intensity of a point as the visual center
 */
function getCenterIntensity(
  rgbMatrix: RGBColor[][],
  visualLeft: number,
  visualTop: number,
  ops: VisualCenterOptions
): number {
  const { bgColor, height, width, maxDiff, maxDistance } = ops;

  const centerCol = visualTop * height;
  const centerRow = visualLeft * width;
  const centerPoint: [number, number] = [centerCol, centerRow];

  return rgbMatrix.reduce((resRow, row, rowIdx) => {
    return (
      resRow +
      row.reduce((resCol, col, colIdx) => {
        const cellColorDiff = rgbDiff(bgColor, col, maxDiff);

        if (!cellColorDiff) return resCol;

        const cellDistance = getDistance(centerPoint, [rowIdx, colIdx]);
        const cellColorWeight =
          cellColorDiff *
          Math.pow(1 - cellDistance / maxDistance, 0.5) *
          1000;

        return resCol + cellColorWeight;
      }, 0)
    );
  }, 0);
}

/**
 * Calculate distance between two points
 */
function getDistance(pointA: [number, number], pointB: [number, number]): number {
  return Math.pow(
    Math.pow(pointA[0] - pointB[0], 2) + Math.pow(pointA[1] - pointB[1], 2),
    0.5
  );
}

/**
 * Normalize color with alpha channel
 */
function normalizeColor(color: RGBColor): RGBColor {
  return {
    r: Math.floor(color.r * (color.a / 255) + 255 * (1 - color.a / 255)),
    g: Math.floor(color.g * (color.a / 255) + 255 * (1 - color.a / 255)),
    b: Math.floor(color.b * (color.a / 255) + 255 * (1 - color.a / 255)),
    a: 255
  };
}

/**
 * Calculate the difference between two RGB colors
 */
function rgbDiff(baseColor: RGBColor, testColor: RGBColor, maxDiff: number): number {
  if (testColor.a === 0) return 0;

  const diff =
    Math.abs(baseColor.r - testColor.r) +
    Math.abs(baseColor.g - testColor.g) +
    Math.abs(baseColor.b - testColor.b);

  const result =
    Math.pow(diff / maxDiff, COLOR_DIFF_WEIGHT_EXPO) *
    (testColor.a / 255) *
    1000;

  return result;
}

/**
 * Convert CSS color string to RGBColor using canvas
 * Reuses a cached canvas element to avoid repeated DOM allocations.
 */
let _colorCanvas: HTMLCanvasElement | null = null;
let _colorCtx: CanvasRenderingContext2D | null = null;

function cssColorToRGB(cssColor: string): RGBColor {
  if (!_colorCanvas) {
    _colorCanvas = document.createElement('canvas');
    _colorCanvas.width = 1;
    _colorCanvas.height = 1;
    _colorCtx = _colorCanvas.getContext('2d');
  }

  if (!_colorCtx) {
    // Fallback to white if canvas context not available
    return { r: 255, g: 255, b: 255, a: 255 };
  }

  // Clear previous pixel and fill with new color
  _colorCtx.clearRect(0, 0, 1, 1);
  _colorCtx.fillStyle = cssColor;
  _colorCtx.fillRect(0, 0, 1, 1);

  // Get the pixel data
  const imageData = _colorCtx.getImageData(0, 0, 1, 1);
  const data = imageData.data;

  return {
    r: data[0],
    g: data[1],
    b: data[2],
    a: data[3]
  };
}

/**
 * Convert SVG path to RGB matrix for visual center calculation
 * The path will be scaled relative to the container size to maintain proper proportions
 * Considers both fill and stroke with all their properties for accurate visual representation
 * Returns both the RGB matrix and the background color (converted from containerFillColor)
 */
export async function pathToRGBMatrix(
  svgPath: string,
  containerWidth: number,
  containerHeight: number,
  fillColor: string = 'black',
  fillOpacity: number = 1,
  strokeColor: string = 'none',
  strokeWidth: number = 0,
  strokeOpacity: number = 1,
  strokeLinecap: 'butt' | 'round' | 'square' = 'butt',
  strokeLinejoin: 'miter' | 'round' | 'bevel' = 'miter',
  strokeDasharray: string = '',
  scaleStrokeWidth: boolean = false, // Control if stroke scales with the path
  containerFillColor: string = 'white', // Background color of the container
  size: number = 420
): Promise<{ rgbMatrix: RGBColor[][]; bgColor: RGBColor }> {
  return new Promise((resolve, reject) => {
    try {
      // Convert container fill color to RGB for use as background
      const bgColor = cssColorToRGB(containerFillColor);
      
      // Create a temporary SVG to get the path's bounds
      const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tempSvg.style.position = 'absolute';
      tempSvg.style.visibility = 'hidden';
      document.body.appendChild(tempSvg);

      const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tempPath.setAttribute('d', svgPath);
      tempSvg.appendChild(tempPath);

      // Get the bounding box of the content path
      const contentBbox = tempPath.getBBox();
      document.body.removeChild(tempSvg);

      // Calculate scale based on container size, not content size
      // This ensures the content is scaled proportionally to how it appears in the container
      const availableSize = size;
      
      // Scale based on the container dimensions
      const containerScale = Math.min(
        availableSize / containerWidth,
        availableSize / containerHeight
      );

      // Scale the content with the same ratio as the container
      const scale = containerScale;

      // Center the content in the canvas (REQUIRED for visual-center algorithm)
      const scaledContentWidth = contentBbox.width * scale;
      const scaledContentHeight = contentBbox.height * scale;
      const offsetX = (size - scaledContentWidth) / 2 - contentBbox.x * scale;
      const offsetY = (size - scaledContentHeight) / 2 - contentBbox.y * scale;

      // Create the final SVG with proper scaling
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', size.toString());
      svg.setAttribute('height', size.toString());
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', svgPath);
      
      // Apply all fill properties (use original colors as-is)
      // No need to adjust colors since we're using the actual container background color
      path.setAttribute('fill', fillColor);
      path.setAttribute('fill-opacity', fillOpacity.toString());
      
      // Calculate stroke width based on scaleStrokeWidth parameter
      // If false (default), keep original stroke width (non-scaling stroke)
      // If true, scale stroke proportionally with the path
      const finalStrokeWidth = scaleStrokeWidth 
        ? strokeWidth * scale 
        : strokeWidth;
      
      // Apply all stroke properties
      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', finalStrokeWidth.toString());
      path.setAttribute('stroke-opacity', strokeOpacity.toString());
      path.setAttribute('stroke-linecap', strokeLinecap);
      path.setAttribute('stroke-linejoin', strokeLinejoin);
      
      // Apply dasharray
      // Scale dasharray only if scaleStrokeWidth is true
      if (strokeDasharray && strokeDasharray !== '' && strokeColor !== 'none') {
        if (scaleStrokeWidth) {
          const scaledDasharray = strokeDasharray
            .split(/[\s,]+/)
            .map(val => (parseFloat(val) * scale).toString())
            .join(' ');
          path.setAttribute('stroke-dasharray', scaledDasharray);
        } else {
          path.setAttribute('stroke-dasharray', strokeDasharray);
        }
      }
      
      path.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${scale})`);
      svg.appendChild(path);

      // Convert to data URL (SVG without background)
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const dataUrl = 'data:image/svg+xml;base64,' + btoa(svgString);

      // Debug: Log the generated image data URL and properties (only in deep debug mode)
      deepDebugLog('[Visual Center Debug] SVG data URL (no background):', dataUrl);
      deepDebugLog('[Visual Center Debug] Container dimensions:', { containerWidth, containerHeight });
      deepDebugLog('[Visual Center Debug] Container fill color:', containerFillColor);
      deepDebugLog('[Visual Center Debug] Content bbox:', contentBbox);
      deepDebugLog('[Visual Center Debug] Scale:', scale);
      deepDebugLog('[Visual Center Debug] Styles:', { 
        fill: fillColor,
        fillOpacity: fillOpacity,
        stroke: strokeColor, 
        strokeWidth: scaleStrokeWidth ? strokeWidth * scale : strokeWidth,
        strokeWidthScaled: scaleStrokeWidth,
        strokeOpacity: strokeOpacity,
        strokeLinecap,
        strokeLinejoin,
        strokeDasharray: strokeDasharray ? 'applied' : 'none'
      });

      // Load into image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Fill with container's background color instead of white
        // This provides better contrast detection based on the actual container background
        ctx.fillStyle = containerFillColor;
        ctx.fillRect(0, 0, size, size);

        // Draw the image
        ctx.drawImage(img, 0, 0, size, size);

        // Log the final canvas data URL (with background applied) - only in deep debug mode
        const canvasDataUrl = canvas.toDataURL('image/png');
        deepDebugLog('[Visual Center Debug] Canvas data URL (with background):', canvasDataUrl);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Convert to RGB matrix
        const rgbMatrix: RGBColor[][] = [];
        for (let y = 0; y < size; y++) {
          const row: RGBColor[] = [];
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            row.push({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
              a: data[idx + 3]
            });
          }
          rgbMatrix.push(row);
        }

        resolve({ rgbMatrix, bgColor });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = dataUrl;
    } catch (error) {
      reject(error);
    }
  });
}

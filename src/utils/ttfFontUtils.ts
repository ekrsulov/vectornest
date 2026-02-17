// TTF Font utilities for loading and extracting paths from TrueType fonts
import { load as loadFont, Font, Path } from 'opentype.js';
import { PATH_DECIMAL_PRECISION } from '../types';
import { logger } from './logger';
import { formatToPrecision } from './numberUtils';

// List of available TTF fonts in public/fonts directory
// These fonts will be listed first and treated differently (using opentype.js instead of vectorization)
export const TTF_FONTS = [
  { name: 'Gorditas', file: 'Gorditas-Regular.ttf' },
  { name: 'Inter', file: 'Inter-Regular.ttf' },
  { name: 'Lato', file: 'Lato-Regular.ttf' },
  { name: 'Montserrat', file: 'Montserrat-Regular.ttf' },
  { name: 'OpenSans', file: 'OpenSans-Regular.ttf' },
  { name: 'Roboto', file: 'Roboto-Regular.ttf' },
  { name: 'Momo Trust Display', file: 'MomoTrustDisplay-Regular.ttf' },
  { name: 'Futura Hand', file: 'FuturaHand.ttf' },
] as const;

const TTF_LINE_HEIGHT_MULTIPLIER = 1.2;

// Cache for loaded fonts
const fontCache = new Map<string, Font>();

// Cache for text-to-path conversions
const textPathCache = new Map<string, string>();

/**
 * Check if a font name is a TTF font
 */
export const isTTFFont = (fontName: string): boolean => {
  return TTF_FONTS.some(f => f.name === fontName);
};

/**
 * Get the file path for a TTF font
 */
export const getTTFontFile = (fontName: string): string | undefined => {
  const font = TTF_FONTS.find(f => f.name === fontName);
  // Use BASE_URL from Vite to handle GitHub Pages base path correctly
  return font ? `${import.meta.env.BASE_URL}fonts/${font.file}` : undefined;
};

/**
 * Load a TTF font from the public/fonts directory
 */
export const loadTTFFont = async (fontName: string): Promise<Font | null> => {
  // Check cache first
  if (fontCache.has(fontName)) {
    return fontCache.get(fontName)!;
  }

  const fontFile = getTTFontFile(fontName);
  if (!fontFile) {
    return null;
  }

  try {
    const font = await loadFont(fontFile);
    fontCache.set(fontName, font);
    return font;
  } catch (error) {
    logger.error(`Error loading TTF font ${fontName}:`, error);
    return null;
  }
};

/**
 * Convert a quadratic Bezier curve (Q) to a cubic Bezier curve (C)
 * Quadratic: P0, P1 (control), P2 (end)
 * Cubic: P0, CP1, CP2, P3 (end)
 * Formula: CP1 = P0 + 2/3 * (P1 - P0)
 *          CP2 = P2 + 2/3 * (P1 - P2)
 */
const quadraticToCubic = (
  x0: number, 
  y0: number, 
  x1: number, 
  y1: number, 
  x: number, 
  y: number
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } => {
  const cp1x = x0 + (2/3) * (x1 - x0);
  const cp1y = y0 + (2/3) * (y1 - y0);
  const cp2x = x + (2/3) * (x1 - x);
  const cp2y = y + (2/3) * (y1 - y);
  
  return { cp1x, cp1y, cp2x, cp2y };
};

/**
 * Convert opentype.js Path to SVG path string
 * Converts all Q commands to C commands for compatibility
 */
const opentypePathToSVG = (path: Path): string => {
  const commands = path.commands;
  let pathData = '';
  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        pathData += `M ${formatToPrecision(cmd.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.y, PATH_DECIMAL_PRECISION)} `;
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'L':
        pathData += `L ${formatToPrecision(cmd.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.y, PATH_DECIMAL_PRECISION)} `;
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'C':
        pathData += `C ${formatToPrecision(cmd.x1, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.y1, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.x2, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.y2, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.y, PATH_DECIMAL_PRECISION)} `;
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'Q': {
        // Convert quadratic to cubic
        const cubic = quadraticToCubic(currentX, currentY, cmd.x1, cmd.y1, cmd.x, cmd.y);
        pathData += `C ${formatToPrecision(cubic.cp1x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cubic.cp1y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cubic.cp2x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cubic.cp2y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.y, PATH_DECIMAL_PRECISION)} `;
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      }
      case 'Z':
        pathData += 'Z ';
        break;
    }
  }

  return pathData.trim();
};

/**
 * Convert text to SVG path using opentype.js for TTF fonts
 * Returns an SVG path string positioned at (x, y) with the specified fontSize
 */
export const ttfTextToPath = async (
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontName: string
): Promise<string> => {
  const cacheKey = `ttf-${fontName}-${text}-${x}-${y}-${fontSize}`;

  // Check cache first
  if (textPathCache.has(cacheKey)) {
    return textPathCache.get(cacheKey)!;
  }

  // Load the font
  const font = await loadTTFFont(fontName);
  if (!font) {
    return '';
  }

  try {
    const lines = (text || '').split(/\r?\n/);
    const lineHeight = fontSize * TTF_LINE_HEIGHT_MULTIPLIER;
    const combinedPath = new Path();

    // Create a stacked path for each line respecting line height
    lines.forEach((line, idx) => {
      const linePath = font.getPath(line || ' ', x, y + (idx * lineHeight), fontSize);
      combinedPath.commands.push(...linePath.commands);
    });
    
    // Convert to SVG path string
    const pathData = opentypePathToSVG(combinedPath);

    // Cache the result
    if (pathData) {
      textPathCache.set(cacheKey, pathData);
    }

    return pathData;
  } catch (error) {
    logger.error(`Error converting text to path with font ${fontName}:`, error);
    return '';
  }
};

/**
 * Get list of TTF font names
 */
export const getTTFFontNames = (): string[] => {
  return TTF_FONTS.map(f => f.name);
};

/**
 * SVG Length Utilities
 * Handles parsing and conversion of SVG length values with units
 * Compliant with SVG 1.1 specification: https://www.w3.org/TR/SVG11/types.html#DataTypeLength
 */

import { DEFAULT_DPI } from '../constants';

export type SVGLengthUnit = 'px' | 'em' | 'ex' | 'pt' | 'pc' | 'cm' | 'mm' | 'in' | '%' | '';

export interface ParsedSVGLength {
  value: number;
  unit: SVGLengthUnit;
}

/**
 * Default font size in pixels for em/ex calculations
 */
const DEFAULT_FONT_SIZE = 16;

/**
 * Approximate ratio of x-height to font-size
 * Varies by font, 0.5 is a reasonable default
 */
const EX_RATIO = 0.5;

/**
 * Conversion factors to pixels at 96 DPI
 * Exported for use in unit tests
 */
export const UNIT_TO_PX: Record<SVGLengthUnit, number> = {
  'px': 1,
  'em': DEFAULT_FONT_SIZE,
  'ex': DEFAULT_FONT_SIZE * EX_RATIO,
  'pt': DEFAULT_DPI / 72,        // 1pt = 1/72 inch
  'pc': DEFAULT_DPI / 6,         // 1pc = 12pt = 1/6 inch
  'cm': DEFAULT_DPI / 2.54,      // 1cm = 1/2.54 inch
  'mm': DEFAULT_DPI / 25.4,      // 1mm = 1/25.4 inch
  'in': DEFAULT_DPI,             // 1in = 96px at 96 DPI
  '%': 1,                        // Percentage requires context
  '': 1,                         // No unit = pixels
};

/**
 * Parse an SVG length string into value and unit
 * 
 * @param lengthStr - The SVG length string (e.g., "10px", "2em", "50%")
 * @returns Parsed length with value and unit, or null if invalid
 */
export function parseSVGLengthParts(lengthStr: string | null | undefined): ParsedSVGLength | null {
  if (lengthStr === null || lengthStr === undefined) {
    return null;
  }

  const trimmed = lengthStr.trim();
  if (trimmed === '' || trimmed === 'none' || trimmed === 'auto') {
    return null;
  }

  // Match number (including scientific notation) followed by optional unit
  const match = trimmed.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(px|em|ex|pt|pc|cm|mm|in|%)?$/i);
  
  if (!match) {
    return null;
  }

  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }

  const unit = (match[2]?.toLowerCase() ?? '') as SVGLengthUnit;

  return { value, unit };
}

/**
 * Context for resolving relative units
 */
export interface SVGLengthContext {
  /** Font size in pixels for em/ex calculations */
  fontSize?: number;
  /** Reference dimension in pixels for percentage calculations */
  percentageBase?: number;
  /** DPI for absolute unit conversions */
  dpi?: number;
}

/**
 * Parse an SVG length string and convert to pixels
 * 
 * @param lengthStr - The SVG length string (e.g., "10px", "2em", "50%")
 * @param context - Optional context for resolving relative units
 * @returns The length in pixels, or null if invalid
 * 
 * @example
 * parseSVGLength("10px") // 10
 * parseSVGLength("2em", { fontSize: 16 }) // 32
 * parseSVGLength("50%", { percentageBase: 100 }) // 50
 * parseSVGLength("1in") // 96 (at 96 DPI)
 */
export function parseSVGLength(
  lengthStr: string | null | undefined,
  context?: SVGLengthContext
): number | null {
  const parsed = parseSVGLengthParts(lengthStr);
  if (!parsed) {
    return null;
  }

  return convertToPixels(parsed.value, parsed.unit, context);
}

/**
 * Convert a length value with unit to pixels
 */
export function convertToPixels(
  value: number,
  unit: SVGLengthUnit,
  context?: SVGLengthContext
): number {
  const fontSize = context?.fontSize ?? DEFAULT_FONT_SIZE;
  const dpi = context?.dpi ?? DEFAULT_DPI;
  const percentageBase = context?.percentageBase ?? 0;

  switch (unit) {
    case 'px':
    case '':
      return value;
    case 'em':
      return value * fontSize;
    case 'ex':
      return value * fontSize * EX_RATIO;
    case '%':
      return (value / 100) * percentageBase;
    case 'pt':
      return value * (dpi / 72);
    case 'pc':
      return value * (dpi / 6);
    case 'cm':
      return value * (dpi / 2.54);
    case 'mm':
      return value * (dpi / 25.4);
    case 'in':
      return value * dpi;
    default:
      return value;
  }
}

/**
 * Parse SVG length with a fallback default value
 * Convenience function for common use case
 * 
 * @param lengthStr - The SVG length string
 * @param defaultValue - Default value if parsing fails
 * @param context - Optional context for resolving relative units
 */
export function parseSVGLengthWithDefault(
  lengthStr: string | null | undefined,
  defaultValue: number,
  context?: SVGLengthContext
): number {
  const result = parseSVGLength(lengthStr, context);
  return result !== null ? result : defaultValue;
}

/**
 * Check if a string represents a valid SVG length
 */
export function isValidSVGLength(lengthStr: string | null | undefined): boolean {
  return parseSVGLengthParts(lengthStr) !== null;
}

/**
 * Format a pixel value to an SVG length string
 * Used for export to maintain precision
 */
export function formatSVGLength(value: number, precision: number = 4): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  
  // Remove trailing zeros
  const formatted = value.toFixed(precision);
  return formatted.replace(/\.?0+$/, '');
}

/**
 * Parse a space or comma separated list of lengths (e.g., stroke-dasharray)
 */
export function parseSVGLengthList(
  listStr: string | null | undefined,
  context?: SVGLengthContext
): number[] | null {
  if (!listStr || listStr === 'none') {
    return null;
  }

  const parts = listStr.trim().split(/[\s,]+/);
  const values: number[] = [];

  for (const part of parts) {
    const value = parseSVGLength(part, context);
    if (value === null) {
      return null;
    }
    values.push(value);
  }

  return values.length > 0 ? values : null;
}

/**
 * Parse a time string like "2s" or "2" to seconds.
 * Handles trailing 's' suffix and returns 0 for invalid/empty values.
 */
export function parseSeconds(val: string | null): number {
  if (!val) return 0;
  const trimmed = val.trim();
  if (trimmed.endsWith('ms')) {
    const num = parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(num) ? num / 1000 : 0;
  }
  const normalized = trimmed.endsWith('s') ? trimmed.slice(0, -1) : trimmed;
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

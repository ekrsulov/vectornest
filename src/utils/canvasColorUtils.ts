/**
 * Utility functions for canvas color calculations and contrast determination
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Parse a hex color string to RGB components. Returns null for invalid input. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Normalize 3-digit hex (#RGB) to 6-digit (#RRGGBB)
  let normalized = hex;
  const shortMatch = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (shortMatch) {
    normalized = `#${shortMatch[1]}${shortMatch[1]}${shortMatch[2]}${shortMatch[2]}${shortMatch[3]}${shortMatch[3]}`;
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate contrasting selection color based on element's color (stroke or fill)
 */
export const getContrastingColor = (color: string): string => {
  if (!color || color === 'none') return '#ff6b35'; // Default orange-red for transparent/no-color elements

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const rgb = hexToRgb(color);
  if (!rgb) return '#ff6b35'; // Fallback if not a valid hex color

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const isDark = luminance < 0.5;

  // High contrast color palette based on luminance
  if (isDark) {
    // For dark colors, use bright contrasting colors
    const brightColors = [
      '#ff6b35', // Orange-red
      '#f7931e', // Orange
      '#00ff88', // Bright green
      '#00d4ff', // Bright cyan
      '#ff44ff', // Magenta
      '#ffff00', // Yellow
      '#ff4444', // Red
    ];

    // Select color based on hue to ensure good contrast
    const hue = Math.atan2(Math.sqrt(3) * (rgb.g - rgb.b), 2 * rgb.r - rgb.g - rgb.b) * 180 / Math.PI;
    const colorIndex = Math.floor((hue + 180) / (360 / brightColors.length)) % brightColors.length;
    return brightColors[colorIndex];
  } else {
    // For light colors, use dark contrasting colors
    const darkColors = [
      '#8b0000', // Dark red
      '#006400', // Dark green
      '#00008b', // Dark blue
      '#8b008b', // Dark magenta
      '#8b4513', // Saddle brown
      '#2f4f4f', // Dark slate gray
      '#000000', // Black
    ];

    // Select color based on saturation and value
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    if (saturation < 0.3) {
      return '#8b0000'; // Dark red for desaturated colors
    } else {
      const colorIndex = Math.floor((rgb.r * 2 + rgb.g + rgb.b) / (255 * 4) * darkColors.length) % darkColors.length;
      return darkColors[colorIndex];
    }
  }
};

/**
 * Determine the effective color for contrast calculation based on element properties
 */
export const getEffectiveColorForContrast = (
  strokeColor: string | undefined,
  fillColor: string | undefined,
  strokeWidth: number | undefined,
  strokeOpacity: number | undefined
): string => {
  // Determine if the path has an effective stroke
  const hasEffectiveStroke = (strokeWidth || 0) > 0 &&
    strokeColor !== 'none' &&
    (strokeOpacity || 1) > 0;

  // Use fillColor for contrasting color calculation if no effective stroke
  return hasEffectiveStroke ? (strokeColor || '#000000') : (fillColor || 'none');
};

/**
 * Special subpath selection color
 */
export const SUBPATH_SELECTION_COLOR = '#8b5cf6'; // Purple to indicate subpath mode

/**
 * Extract element colors and calculate selection color for overlays
 */
export const deriveElementSelectionColors = (element: {
  type: string;
  data: unknown;
}) => {
  const styleData = element.data && typeof element.data === 'object'
    ? element.data as {
        strokeColor?: string;
        fillColor?: string;
        strokeWidth?: number;
        strokeOpacity?: number;
        fillOpacity?: number;
      }
    : null;

  const elementStrokeColor = styleData?.strokeColor ?? '#000000';
  const elementFillColor = styleData?.fillColor ?? 'none';
  const elementStrokeWidth = styleData?.strokeWidth ?? 0;
  const elementOpacity = styleData?.strokeOpacity ?? 1;
  const elementFillOpacity = styleData?.fillOpacity ?? 1;

  const effectiveFillColor =
    elementFillColor !== 'none' && elementFillOpacity > 0
      ? elementFillColor
      : 'none';

  const colorForContrast = getEffectiveColorForContrast(
    elementStrokeColor,
    effectiveFillColor,
    elementStrokeWidth,
    elementOpacity
  );

  const selectionColor = getContrastingColor(colorForContrast);

  return {
    elementStrokeColor,
    elementFillColor,
    elementStrokeWidth,
    elementOpacity,
    selectionColor
  };
};

export interface SelectionFeedbackPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  line: string;
  lineStrong: string;
  text: string;
}

const hslToHex = (h: number, s: number, l: number): string => {
  const normalizedH = ((h % 360) + 360) % 360;
  const normalizedS = clamp(s, 0, 100) / 100;
  const normalizedL = clamp(l, 0, 100) / 100;

  const chroma = (1 - Math.abs(2 * normalizedL - 1)) * normalizedS;
  const huePrime = normalizedH / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (huePrime >= 0 && huePrime < 1) {
    r1 = chroma;
    g1 = x;
  } else if (huePrime < 2) {
    r1 = x;
    g1 = chroma;
  } else if (huePrime < 3) {
    g1 = chroma;
    b1 = x;
  } else if (huePrime < 4) {
    g1 = x;
    b1 = chroma;
  } else if (huePrime < 5) {
    r1 = x;
    b1 = chroma;
  } else {
    r1 = chroma;
    b1 = x;
  }

  const matchLightness = normalizedL - chroma / 2;
  const toHex = (channel: number) =>
    Math.round((channel + matchLightness) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
};

export const deriveSelectionFeedbackPalette = (selectionColor: string): SelectionFeedbackPalette => {
  const { h, s, l } = hexToHsl(selectionColor);
  const lightnessDirection = l < 52 ? 1 : -1;
  const tone = (lightnessDelta: number, saturationDelta: number = 0) =>
    hslToHex(
      h,
      clamp(s + saturationDelta, 0, 100),
      clamp(l + lightnessDirection * lightnessDelta, 0, 100),
    );

  return {
    primary: selectionColor,
    secondary: tone(12, 4),
    tertiary: tone(22, 8),
    line: tone(16, -8),
    lineStrong: tone(8, 2),
    text: selectionColor,
  };
};

/**
 * Convert a hex color string to its HSL representation.
 *
 * This helper centralises the logic used by multiple modules that need to work
 * with chromatic values (e.g. color metrics and preset sorting).
 * Returning a consistent object shape prevents repeated tuple/object
 * conversions in the callers.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, l: 0 };

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

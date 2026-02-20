import type { ContrastResult } from './slice';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || hex === 'none' || hex === 'transparent') return null;
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    return {
      r: parseInt(cleaned[0] + cleaned[0], 16),
      g: parseInt(cleaned[1] + cleaned[1], 16),
      b: parseInt(cleaned[2] + cleaned[2], 16),
    };
  }
  if (cleaned.length === 6) {
    return {
      r: parseInt(cleaned.substring(0, 2), 16),
      g: parseInt(cleaned.substring(2, 4), 16),
      b: parseInt(cleaned.substring(4, 6), 16),
    };
  }
  return null;
}

function sRGBtoLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

export function computeContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return null;

  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function evaluateWCAG(ratio: number): {
  passAA: boolean;
  passAAA: boolean;
  passAALarge: boolean;
  passAAALarge: boolean;
} {
  return {
    passAA: ratio >= 4.5,
    passAAA: ratio >= 7,
    passAALarge: ratio >= 3,
    passAAALarge: ratio >= 4.5,
  };
}

export function getContrastRating(ratio: number): string {
  if (ratio >= 7) return 'Excellent';
  if (ratio >= 4.5) return 'Good';
  if (ratio >= 3) return 'Fair';
  return 'Poor';
}

export function getContrastColor(ratio: number): string {
  if (ratio >= 7) return '#38A169';    // green
  if (ratio >= 4.5) return '#68D391';  // light green
  if (ratio >= 3) return '#ECC94B';    // yellow
  return '#E53E3E';                    // red
}

export function checkElementPairContrast(
  color1: string,
  color2: string
): ContrastResult | null {
  const ratio = computeContrastRatio(color1, color2);
  if (ratio === null) return null;

  const wcag = evaluateWCAG(ratio);
  return {
    foregroundColor: color1,
    backgroundColor: color2,
    ratio,
    ...wcag,
  };
}

export function suggestBetterContrast(
  foreground: string,
  background: string,
  targetRatio: number = 4.5
): string | null {
  const bgRgb = hexToRgb(background);
  const fgRgb = hexToRgb(foreground);
  if (!bgRgb || !fgRgb) return null;

  const bgLum = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // Try darkening or lightening foreground
  const tryColor = (factor: number): string => {
    const r = Math.min(255, Math.max(0, Math.round(fgRgb.r * factor)));
    const g = Math.min(255, Math.max(0, Math.round(fgRgb.g * factor)));
    const b = Math.min(255, Math.max(0, Math.round(fgRgb.b * factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Is bg dark or light?
  const bgIsDark = bgLum < 0.5;

  // Search for the minimal adjustment to meet target ratio
  for (let step = 0; step <= 100; step++) {
    const factor = bgIsDark ? 1 + step * 0.05 : 1 - step * 0.01;
    if (factor <= 0) break;
    const candidate = tryColor(factor);
    const ratio = computeContrastRatio(candidate, background);
    if (ratio !== null && ratio >= targetRatio) {
      return candidate;
    }
  }

  return bgIsDark ? '#ffffff' : '#000000';
}

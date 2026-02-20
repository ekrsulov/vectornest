import type { ExtractedColor, SortMode } from './slice';
import type { CanvasElement } from '../../types';

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

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function normalizeHex(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`.toLowerCase();
}

function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return Infinity;
  return Math.sqrt((rgb1.r - rgb2.r) ** 2 + (rgb1.g - rgb2.g) ** 2 + (rgb1.b - rgb2.b) ** 2);
}

export function extractColors(
  elements: CanvasElement[],
  options: { includeStrokes: boolean; includeFills: boolean }
): Map<string, { hex: string; source: 'fill' | 'stroke'; count: number }> {
  const colorMap = new Map<string, { hex: string; source: 'fill' | 'stroke'; count: number }>();

  for (const el of elements) {
    if (el.type !== 'path') continue;

    if (options.includeFills && el.data.fillColor && el.data.fillColor !== 'none') {
      const norm = normalizeHex(el.data.fillColor);
      const key = `fill:${norm}`;
      const existing = colorMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorMap.set(key, { hex: norm, source: 'fill', count: 1 });
      }
    }

    if (options.includeStrokes && el.data.strokeColor && el.data.strokeColor !== 'none') {
      const norm = normalizeHex(el.data.strokeColor);
      const key = `stroke:${norm}`;
      const existing = colorMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorMap.set(key, { hex: norm, source: 'stroke', count: 1 });
      }
    }
  }

  return colorMap;
}

export function buildPalette(
  colorMap: Map<string, { hex: string; source: 'fill' | 'stroke'; count: number }>,
  options: { deduplicateNear: boolean; nearThreshold: number; sortMode: SortMode }
): ExtractedColor[] {
  let colors: ExtractedColor[] = [];

  for (const entry of colorMap.values()) {
    const rgb = hexToRgb(entry.hex);
    if (!rgb) continue;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    colors.push({
      hex: entry.hex,
      source: entry.source,
      count: entry.count,
      hue: hsl.h,
      saturation: hsl.s,
      lightness: hsl.l,
    });
  }

  // Deduplicate near-similar colors
  if (options.deduplicateNear) {
    const deduplicated: ExtractedColor[] = [];
    for (const color of colors) {
      const nearMatch = deduplicated.find((c) => colorDistance(c.hex, color.hex) < options.nearThreshold);
      if (nearMatch) {
        nearMatch.count += color.count;
      } else {
        deduplicated.push({ ...color });
      }
    }
    colors = deduplicated;
  }

  // Sort
  switch (options.sortMode) {
    case 'frequency':
      colors.sort((a, b) => b.count - a.count);
      break;
    case 'hue':
      colors.sort((a, b) => a.hue - b.hue);
      break;
    case 'lightness':
      colors.sort((a, b) => a.lightness - b.lightness);
      break;
    case 'name':
      colors.sort((a, b) => a.hex.localeCompare(b.hex));
      break;
  }

  return colors;
}

export function formatPaletteCSS(colors: ExtractedColor[]): string {
  return colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n');
}

export function formatPaletteSVG(colors: ExtractedColor[]): string {
  const swatchSize = 30;
  const cols = Math.ceil(Math.sqrt(colors.length));
  const rows = Math.ceil(colors.length / cols);
  const rects = colors.map((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return `  <rect x="${col * swatchSize}" y="${row * swatchSize}" width="${swatchSize}" height="${swatchSize}" fill="${c.hex}" />`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * swatchSize}" height="${rows * swatchSize}">\n${rects}\n</svg>`;
}

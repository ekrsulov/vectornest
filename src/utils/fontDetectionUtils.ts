// Font detection utilities for SVG text elements
// Based on width comparison method to detect available system fonts

import { getTTFFontNames } from './ttfFontUtils';

// A comprehensive list of common fonts across different operating systems
// Private to this module - only used internally by scanAvailableFonts
const FONTS_TO_CHECK = [
  // Windows
  'Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Cambria', 'Cambria Math', 'Candara',
  'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Ebrima',
  'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 'Impact', 'Ink Free',
  'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Sans Unicode', 'Malgun Gothic',
  'Marlett', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue',
  'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei',
  'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MS UI Gothic',
  'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Palatino Linotype', 'Segoe MDL2 Assets',
  'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Historic', 'Segoe UI Emoji',
  'Segoe UI Symbol', 'SimSun', 'Sitka', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman',
  'Trebuchet MS', 'Verdana', 'Yu Gothic',
  // macOS
  'American Typewriter', 'Andale Mono', 'Apple Chancery', 'AppleGothic', 'Arial Narrow',
  'Arial Rounded MT Bold', 'Avenir', 'Avenir Next', 'Baskerville', 'Big Caslon', 'Bodoni 72',
  'Bradley Hand', 'Brush Script MT', 'Chalkboard', 'Chalkduster', 'Charter', 'Cochin',
  'Copperplate', 'Courier', 'Didot', 'Futura', 'Geneva', 'Gill Sans', 'Heiti SC',
  'Heiti TC', 'Helvetica', 'Helvetica Neue', 'Herculanum', 'Hoefler Text', 'Iowan Old Style',
  'Lucida Grande', 'Luminari', 'Marion', 'Marker Felt', 'Menlo', 'Monaco', 'Noteworthy',
  'Optima', 'Palatino', 'Papyrus', 'Phosphate', 'PingFang HK', 'Rockwell', 'San Francisco',
  'Savoye LET', 'Seravek', 'Skia', 'Snell Roundhand', 'Superclarendon', 'Thonburi',
  'Times', 'Trattatello',
  // Linux (common)
  'Liberation Sans', 'Liberation Serif', 'Liberation Mono', 'DejaVu Sans', 'DejaVu Serif',
  'DejaVu Sans Mono', 'Ubuntu', 'Noto Sans', 'Open Sans', 'Droid Sans',
  // Android
  'Roboto', 'Droid Serif', 'Droid Sans Mono',
  // Generic fallbacks
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'
];

/**
 * Detects if a specific font is available on the system
 * by comparing text width with a base font.
 * Operates on a pre-created, pre-appended measurement element for efficiency.
 */
const detectFont = (font: string, element: HTMLSpanElement, baseWidth: number, baseFont: string): boolean => {
  element.style.fontFamily = `"${font}", ${baseFont}`;
  const testWidth = element.offsetWidth;
  return baseWidth !== testWidth;
};

/**
 * Scans for available fonts from the predefined list
 * Returns a sorted array of available font names
 */
const scanAvailableFonts = (): string[] => {
  const baseFont = 'monospace';
  const testString = "abcdefghijklmnopqrstuvwxyz0123456789";

  // Create a single hidden element and reuse it for all font measurements
  const element = document.createElement('span');
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.fontSize = '72px';
  element.style.visibility = 'hidden';
  element.textContent = testString;

  element.style.fontFamily = baseFont;
  document.body.appendChild(element);
  const baseWidth = element.offsetWidth;

  const detected = new Set<string>();

  FONTS_TO_CHECK.forEach(font => {
    if (detectFont(font, element, baseWidth, baseFont)) {
      detected.add(font);
    }
  });

  document.body.removeChild(element);

  // Sort the detected fonts alphabetically
  return Array.from(detected).sort();
};

/**
 * React hook to get available fonts
 * Caches the result to avoid repeated scans
 * TTF fonts are listed first, followed by detected system fonts
 */
let fontCache: string[] | null = null;

export const getAvailableFonts = (): string[] => {
  if (fontCache === null) {
    // Get TTF fonts first
    const ttfFonts = getTTFFontNames();
    
    // Then get system fonts
    const systemFonts = scanAvailableFonts();
    
    // Combine with TTF fonts first
    fontCache = [...ttfFonts, ...systemFonts];
  }
  return fontCache;
};
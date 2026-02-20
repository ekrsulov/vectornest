import type { HarmonyMode } from './slice';

export interface HarmonyColor {
  hue: number;
  saturation: number;
  lightness: number;
  hex: string;
  label: string;
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (v: number) => {
    const hex = Math.round((v + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function makeColor(h: number, s: number, l: number, label: string): HarmonyColor {
  return {
    hue: wrapHue(h),
    saturation: s,
    lightness: l,
    hex: hslToHex(wrapHue(h), s, l),
    label,
  };
}

export function generateHarmony(
  baseHue: number,
  baseSaturation: number,
  baseLightness: number,
  mode: HarmonyMode,
  analogousAngle: number
): HarmonyColor[] {
  const h = baseHue;
  const s = baseSaturation;
  const l = baseLightness;

  switch (mode) {
    case 'complementary':
      return [
        makeColor(h, s, l, 'Base'),
        makeColor(h + 180, s, l, 'Complement'),
      ];

    case 'triadic':
      return [
        makeColor(h, s, l, 'Base'),
        makeColor(h + 120, s, l, 'Triadic 1'),
        makeColor(h + 240, s, l, 'Triadic 2'),
      ];

    case 'analogous':
      return [
        makeColor(h - analogousAngle, s, l, 'Analogous 1'),
        makeColor(h, s, l, 'Base'),
        makeColor(h + analogousAngle, s, l, 'Analogous 2'),
      ];

    case 'splitComplementary':
      return [
        makeColor(h, s, l, 'Base'),
        makeColor(h + 150, s, l, 'Split 1'),
        makeColor(h + 210, s, l, 'Split 2'),
      ];

    case 'tetradic':
      return [
        makeColor(h, s, l, 'Base'),
        makeColor(h + 90, s, l, 'Tetradic 1'),
        makeColor(h + 180, s, l, 'Tetradic 2'),
        makeColor(h + 270, s, l, 'Tetradic 3'),
      ];

    case 'monochromatic':
      return [
        makeColor(h, s, Math.max(10, l - 30), 'Dark'),
        makeColor(h, s, Math.max(10, l - 15), 'Medium Dark'),
        makeColor(h, s, l, 'Base'),
        makeColor(h, s, Math.min(90, l + 15), 'Medium Light'),
        makeColor(h, s, Math.min(90, l + 30), 'Light'),
      ];
  }
}

/** Get the angular positions for wheel markers */
export function getWheelAngles(
  baseHue: number,
  mode: HarmonyMode,
  analogousAngle: number
): number[] {
  switch (mode) {
    case 'complementary':
      return [baseHue, baseHue + 180];
    case 'triadic':
      return [baseHue, baseHue + 120, baseHue + 240];
    case 'analogous':
      return [baseHue - analogousAngle, baseHue, baseHue + analogousAngle];
    case 'splitComplementary':
      return [baseHue, baseHue + 150, baseHue + 210];
    case 'tetradic':
      return [baseHue, baseHue + 90, baseHue + 180, baseHue + 270];
    case 'monochromatic':
      return [baseHue];
  }
}

import { hexToHsl } from './canvasColorUtils';
import { DEFAULT_STROKE_COLOR_DARK, DEFAULT_STROKE_COLOR_LIGHT } from './defaultColors';
import { clamp } from './coreHelpers';
import { stylePresetRegistry, type Preset } from './stylePresetRegistry';

const hslToHex = (h: number, s: number, l: number): string => {
  const normalizedS = clamp(s, 0, 1);
  const normalizedL = clamp(l, 0, 1);
  const chroma = (1 - Math.abs(2 * normalizedL - 1)) * normalizedS;
  const hueSegment = h / 60;
  const x = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  const m = normalizedL - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hueSegment >= 0 && hueSegment < 1) {
    r = chroma;
    g = x;
  } else if (hueSegment < 2) {
    r = x;
    g = chroma;
  } else if (hueSegment < 3) {
    g = chroma;
    b = x;
  } else if (hueSegment < 4) {
    g = x;
    b = chroma;
  } else if (hueSegment < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const to255 = (channel: number) => Math.round((channel + m) * 255);
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');

  return `#${toHex(to255(r))}${toHex(to255(g))}${toHex(to255(b))}`.toLowerCase();
};

export const adjustStrokeForDarkMode = (color: string): string => {
  const { h, s, l } = hexToHsl(color);
  const normalizedS = s / 100;
  const normalizedL = l / 100;
  const boostedLightness = clamp(normalizedL + 0.25, 0.55, 0.9);
  const boostedSaturation = clamp(normalizedS + 0.15, 0.4, 0.85);
  return hslToHex(h, boostedSaturation, boostedLightness);
};

const createSameHueFill = (strokeColor: string): string => {
  const { h, s, l } = hexToHsl(strokeColor);
  const normalizedS = s / 100;
  const normalizedL = l / 100;
  // Softer: lower saturation and lower lightness for dark mode
  const softerS = clamp(normalizedS * 0.5, 0.1, 0.6);
  const softerL = clamp(normalizedL - 0.25, 0.1, 0.4);
  return hslToHex(h, softerS, softerL);
};

const BASE_PRESETS: Preset[] = [
  {
    id: 'thick-red',
    name: 'Bold Red',
    strokeWidth: 6,
    strokeColor: '#dc3545',
    strokeOpacity: 1,
    fillColor: '#ffebee',
    fillOpacity: 0.8,
  },
  {
    id: 'golden-yellow',
    name: 'Golden Yellow',
    strokeWidth: 3,
    strokeColor: '#ffd700',
    strokeOpacity: 0.9,
    fillColor: '#fff9c4',
    fillOpacity: 0.7,
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    strokeWidth: 3,
    strokeColor: '#4caf50',
    strokeOpacity: 0.9,
    fillColor: '#c8e6c9',
    fillOpacity: 0.6,
  },
  {
    id: 'thick-blue',
    name: 'Bold Blue',
    strokeWidth: 7,
    strokeColor: '#007bff',
    strokeOpacity: 1,
    fillColor: '#e3f2fd',
    fillOpacity: 0.7,
  },
  {
    id: 'black',
    name: 'Black',
    strokeWidth: 4,
    strokeColor: DEFAULT_STROKE_COLOR_LIGHT,
    strokeOpacity: 1,
    fillColor: 'none',
    fillOpacity: 1,
  },
  {
    id: 'black-fill',
    name: 'Black Fill',
    strokeWidth: 0,
    strokeColor: 'none',
    strokeOpacity: 1,
    fillColor: '#000000',
    fillOpacity: 1,
  },
  {
    id: 'red-fill',
    name: 'Red Fill',
    strokeWidth: 0,
    strokeColor: 'none',
    strokeOpacity: 1,
    fillColor: '#ff0000',
    fillOpacity: 1,
  },
  {
    id: 'yellow-fill',
    name: 'Yellow Fill',
    strokeWidth: 0,
    strokeColor: 'none',
    strokeOpacity: 1,
    fillColor: '#ffd700',
    fillOpacity: 1,
  },
  {
    id: 'green-fill',
    name: 'Green Fill',
    strokeWidth: 0,
    strokeColor: 'none',
    strokeOpacity: 1,
    fillColor: '#00ff00',
    fillOpacity: 1,
  },
  {
    id: 'blue-fill',
    name: 'Blue Fill',
    strokeWidth: 0,
    strokeColor: 'none',
    strokeOpacity: 1,
    fillColor: '#0000ff',
    fillOpacity: 1,
  },
];

const LIGHT_MODE_PRESETS: Preset[] = BASE_PRESETS;

const DARK_MODE_PRESETS: Preset[] = BASE_PRESETS.map((preset) => {
  if (preset.id === 'black') {
    return {
      ...preset,
      name: 'White',
      strokeColor: DEFAULT_STROKE_COLOR_DARK,
      fillColor: 'none',
    };
  }
  if (preset.id === 'black-fill') {
    return {
      ...preset,
      name: 'White Fill',
      fillColor: '#ffffff',
    };
  }
  if (preset.id === 'red-fill') {
    return {
      ...preset,
      fillColor: adjustStrokeForDarkMode(preset.fillColor),
    };
  }
  if (preset.id === 'yellow-fill') {
    return {
      ...preset,
      fillColor: adjustStrokeForDarkMode(preset.fillColor),
    };
  }
  if (preset.id === 'green-fill') {
    return {
      ...preset,
      fillColor: adjustStrokeForDarkMode(preset.fillColor),
    };
  }
  if (preset.id === 'blue-fill') {
    return {
      ...preset,
      fillColor: adjustStrokeForDarkMode(preset.fillColor),
    };
  }

  const adjustedStroke = adjustStrokeForDarkMode(preset.strokeColor);
  return {
    ...preset,
    strokeColor: adjustedStroke,
    fillColor: createSameHueFill(adjustedStroke),
  };
});

stylePresetRegistry.register('core-base-presets', (colorMode) =>
  colorMode === 'dark' ? DARK_MODE_PRESETS : LIGHT_MODE_PRESETS
);

export { getFillAndStrokePresets, stylePresetRegistry } from './stylePresetRegistry';
export type { Preset } from './stylePresetRegistry';

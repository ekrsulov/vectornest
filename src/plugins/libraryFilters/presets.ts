/**
 * Filter presets based on https://github.com/regalagram/sspe
 * Includes basic, color, special effects, and artistic filters
 */

import type { FilterPresetDefinition } from './types';

export const FILTER_PRESETS: FilterPresetDefinition[] = [
  // ===== BASIC FILTERS =====
  {
    type: 'drop-shadow',
    name: 'Drop Shadow',
    category: 'basic',
    createFilter: () => ({
      name: 'Drop Shadow',
      type: 'drop-shadow',
      category: 'basic',
      primitives: [
        { type: 'feDropShadow', dx: 2, dy: 2, stdDeviation: 3, floodColor: '#000000', floodOpacity: 0.5 }
      ],
    }),
  },
  {
    type: 'blur',
    name: 'Blur',
    category: 'basic',
    createFilter: () => ({
      name: 'Blur',
      type: 'blur',
      category: 'basic',
      primitives: [
        { type: 'feGaussianBlur', stdDeviation: 3 }
      ],
    }),
  },

  // ===== COLOR EFFECTS =====
  {
    type: 'grayscale',
    name: 'Grayscale',
    category: 'color',
    createFilter: () => ({
      name: 'Grayscale',
      type: 'grayscale',
      category: 'color',
      primitives: [
        { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '0.3 0.6 0.1 0 0 0.3 0.6 0.1 0 0 0.3 0.6 0.1 0 0 0 0 0 1 0' }
      ],
    }),
  },
  {
    type: 'sepia',
    name: 'Sepia',
    category: 'color',
    createFilter: () => ({
      name: 'Sepia',
      type: 'sepia',
      category: 'color',
      primitives: [
        { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0' }
      ],
    }),
  },
  {
    type: 'invert',
    name: 'Invert',
    category: 'color',
    createFilter: () => ({
      name: 'Invert',
      type: 'invert',
      category: 'color',
      primitives: [
        { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0' }
      ],
    }),
  },
  {
    type: 'brightness',
    name: 'Brightness',
    category: 'color',
    createFilter: () => {
      const brightness = 1.2;
      return {
        name: 'Brightness',
        type: 'brightness',
        category: 'color',
        primitives: [
          { type: 'feColorMatrix', colorMatrixType: 'matrix', values: `${brightness} 0 0 0 0 0 ${brightness} 0 0 0 0 0 ${brightness} 0 0 0 0 0 1 0` }
        ],
      };
    },
  },
  {
    type: 'contrast',
    name: 'Contrast',
    category: 'color',
    createFilter: () => {
      const contrast = 1.5;
      const offset = 0.5 * (1 - contrast);
      return {
        name: 'Contrast',
        type: 'contrast',
        category: 'color',
        primitives: [
          { type: 'feColorMatrix', colorMatrixType: 'matrix', values: `${contrast} 0 0 0 ${offset} 0 ${contrast} 0 0 ${offset} 0 0 ${contrast} 0 ${offset} 0 0 0 1 0` }
        ],
      };
    },
  },
  {
    type: 'saturate',
    name: 'Saturate',
    category: 'color',
    createFilter: () => ({
      name: 'Saturate',
      type: 'saturate',
      category: 'color',
      primitives: [
        { type: 'feColorMatrix', colorMatrixType: 'saturate', values: '1.5' }
      ],
    }),
  },
  {
    type: 'hue-rotate',
    name: 'Hue Rotate',
    category: 'color',
    createFilter: () => ({
      name: 'Hue Rotate',
      type: 'hue-rotate',
      category: 'color',
      primitives: [
        { type: 'feColorMatrix', colorMatrixType: 'hueRotate', values: '90' }
      ],
    }),
  },
  {
    type: 'posterize',
    name: 'Posterize',
    category: 'color',
    createFilter: () => {
      const levels = 4;
      const tableValues = Array.from({ length: levels }, (_, i) => i / (levels - 1)).join(' ');
      return {
        name: 'Posterize',
        type: 'posterize',
        category: 'color',
        primitives: [
          {
            type: 'feComponentTransfer',
            funcR: { funcType: 'discrete', tableValues },
            funcG: { funcType: 'discrete', tableValues },
            funcB: { funcType: 'discrete', tableValues },
          }
        ],
      };
    },
  },

  // ===== SPECIAL EFFECTS =====
  {
    type: 'emboss',
    name: 'Emboss',
    category: 'special',
    createFilter: () => ({
      name: 'Emboss',
      type: 'emboss',
      category: 'special',
      primitives: [
        { type: 'feConvolveMatrix', order: '3', kernelMatrix: '-2 -1 0 -1 1 1 0 1 2' }
      ],
    }),
  },
  {
    type: 'sharpen',
    name: 'Sharpen',
    category: 'special',
    createFilter: () => ({
      name: 'Sharpen',
      type: 'sharpen',
      category: 'special',
      primitives: [
        { type: 'feConvolveMatrix', order: '3', kernelMatrix: '0 -1 0 -1 5 -1 0 -1 0' }
      ],
    }),
  },
  {
    type: 'glow',
    name: 'Glow',
    category: 'special',
    createFilter: () => ({
      name: 'Glow',
      type: 'glow',
      category: 'special',
      primitives: [
        { type: 'feMorphology', operator: 'dilate', radius: 2, result: 'dilated' },
        { type: 'feGaussianBlur', stdDeviation: 3, in: 'dilated', result: 'blurred' },
        { type: 'feFlood', floodColor: '#ffff00', floodOpacity: 0.8, result: 'glowColor' },
        { type: 'feComposite', operator: 'in', in: 'glowColor', in2: 'blurred', result: 'coloredGlow' },
        { type: 'feComposite', operator: 'over', in: 'SourceGraphic', in2: 'coloredGlow' }
      ],
    }),
  },
  {
    type: 'bevel',
    name: 'Bevel',
    category: 'special',
    createFilter: () => ({
      name: 'Bevel',
      type: 'bevel',
      category: 'special',
      primitives: [
        { type: 'feGaussianBlur', stdDeviation: 3, in: 'SourceAlpha', result: 'blur' },
        { type: 'feOffset', dx: 2, dy: 2, in: 'blur', result: 'offsetBlur' },
        {
          type: 'feSpecularLighting',
          surfaceScale: 5,
          specularConstant: 0.75,
          specularExponent: 20,
          lightingColor: '#bbbbbb',
          in: 'blur',
          result: 'specOut',
          lightSource: { type: 'feDistantLight', azimuth: 45, elevation: 45 }
        },
        { type: 'feComposite', operator: 'in', in: 'specOut', in2: 'SourceAlpha', result: 'specOut2' },
        { type: 'feComposite', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, in: 'SourceGraphic', in2: 'specOut2' }
      ],
    }),
  },
  {
    type: 'motion-blur',
    name: 'Motion Blur',
    category: 'special',
    createFilter: () => ({
      name: 'Motion Blur',
      type: 'motion-blur',
      category: 'special',
      primitives: [
        { type: 'feGaussianBlur', stdDeviation: 5 }
      ],
    }),
  },
  {
    type: 'noise',
    name: 'Noise',
    category: 'special',
    createFilter: () => ({
      name: 'Noise',
      type: 'noise',
      category: 'special',
      primitives: [
        { type: 'feTurbulence', baseFrequency: '0.9', numOctaves: 4, result: 'noise', turbulenceType: 'fractalNoise' },
        { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'saturate', values: '0', result: 'monoNoise' },
        { type: 'feComponentTransfer', in: 'monoNoise', result: 'noiseContrast' },
        { type: 'feBlend', mode: 'multiply', in: 'SourceGraphic', in2: 'noiseContrast' }
      ],
    }),
  },
  {
    type: 'wave-distortion',
    name: 'Wave Distortion',
    category: 'special',
    createFilter: () => ({
      name: 'Wave Distortion',
      type: 'wave-distortion',
      category: 'special',
      primitives: [
        { type: 'feTurbulence', baseFrequency: '0.02', numOctaves: 3, result: 'turbulence', turbulenceType: 'turbulence' },
        { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'turbulence', scale: 20, xChannelSelector: 'R', yChannelSelector: 'G' }
      ],
    }),
  },

  // ===== ARTISTIC FILTERS =====
  {
    type: 'oil-painting',
    name: 'Oil Painting',
    category: 'artistic',
    createFilter: () => ({
      name: 'Oil Painting',
      type: 'oil-painting',
      category: 'artistic',
      primitives: [
        { type: 'feTurbulence', baseFrequency: '0.04', numOctaves: 3, turbulenceType: 'fractalNoise', result: 'noise' },
        { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'noise', scale: 5, xChannelSelector: 'R', yChannelSelector: 'G', result: 'displaced' },
        { type: 'feGaussianBlur', in: 'displaced', stdDeviation: 2, result: 'blurred' },
        { type: 'feColorMatrix', in: 'blurred', colorMatrixType: 'saturate', values: '1.2' }
      ],
    }),
  },
  {
    type: 'watercolor',
    name: 'Watercolor',
    category: 'artistic',
    createFilter: () => ({
      name: 'Watercolor',
      type: 'watercolor',
      category: 'artistic',
      primitives: [
        { type: 'feTurbulence', baseFrequency: '0.08', numOctaves: 2, turbulenceType: 'fractalNoise', result: 'noise' },
        { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'saturate', values: '0', result: 'monoNoise' },
        { type: 'feComponentTransfer', in: 'monoNoise', result: 'noiseContrast' },
        { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'noiseContrast', scale: 8, result: 'displaced' },
        { type: 'feGaussianBlur', in: 'displaced', stdDeviation: 1.5, result: 'soft' },
        { type: 'feColorMatrix', in: 'soft', colorMatrixType: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.9 0' }
      ],
    }),
  },
  {
    type: 'vintage',
    name: 'Vintage',
    category: 'artistic',
    createFilter: () => ({
      name: 'Vintage',
      type: 'vintage',
      category: 'artistic',
      primitives: [
        { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '1.1 -0.1 0.1 0 0.1 0.1 0.9 0.1 0 0.1 0.1 0.1 0.8 0 0.1 0 0 0 1 0', result: 'vintage' },
        { type: 'feTurbulence', baseFrequency: '0.9', numOctaves: 4, turbulenceType: 'fractalNoise', result: 'noise' },
        { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'saturate', values: '0', result: 'monoNoise' },
        { type: 'feBlend', mode: 'multiply', in: 'vintage', in2: 'monoNoise', result: 'noisy' },
        { type: 'feColorMatrix', in: 'noisy', colorMatrixType: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.95 0' }
      ],
    }),
  },
  {
    type: 'chromatic-aberration',
    name: 'Chromatic Aberration',
    category: 'artistic',
    createFilter: () => ({
      name: 'Chromatic Aberration',
      type: 'chromatic-aberration',
      category: 'artistic',
      primitives: [
        { type: 'feOffset', dx: -2, dy: 0, in: 'SourceGraphic', result: 'redOffset' },
        { type: 'feColorMatrix', in: 'redOffset', colorMatrixType: 'matrix', values: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', result: 'redChannel' },
        { type: 'feOffset', dx: 2, dy: 0, in: 'SourceGraphic', result: 'blueOffset' },
        { type: 'feColorMatrix', in: 'blueOffset', colorMatrixType: 'matrix', values: '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0', result: 'blueChannel' },
        { type: 'feColorMatrix', in: 'SourceGraphic', colorMatrixType: 'matrix', values: '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', result: 'greenChannel' },
        { type: 'feComposite', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, in: 'redChannel', in2: 'greenChannel', result: 'redGreen' },
        { type: 'feComposite', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, in: 'redGreen', in2: 'blueChannel' }
      ],
    }),
  },
  {
    type: 'neon-glow',
    name: 'Neon Glow',
    category: 'artistic',
    createFilter: () => {
      const color = '#00ffff';
      return {
        name: 'Neon Glow',
        type: 'neon-glow',
        category: 'artistic',
        primitives: [
          { type: 'feGaussianBlur', stdDeviation: 3, in: 'SourceAlpha', result: 'blur1' },
          { type: 'feFlood', floodColor: color, floodOpacity: 0.8, result: 'color1' },
          { type: 'feComposite', operator: 'in', in: 'color1', in2: 'blur1', result: 'glow1' },
          { type: 'feGaussianBlur', stdDeviation: 8, in: 'SourceAlpha', result: 'blur2' },
          { type: 'feFlood', floodColor: color, floodOpacity: 0.6, result: 'color2' },
          { type: 'feComposite', operator: 'in', in: 'color2', in2: 'blur2', result: 'glow2' },
          { type: 'feComposite', operator: 'over', in: 'glow1', in2: 'glow2', result: 'combinedGlow' },
          { type: 'feComposite', operator: 'over', in: 'SourceGraphic', in2: 'combinedGlow' }
        ],
      };
    },
  },
  {
    type: 'mosaic',
    name: 'Mosaic',
    category: 'artistic',
    createFilter: () => ({
      name: 'Mosaic',
      type: 'mosaic',
      category: 'artistic',
      primitives: [
        { type: 'feTurbulence', baseFrequency: '0.02', numOctaves: 1, turbulenceType: 'turbulence', result: 'turbulence' },
        { type: 'feColorMatrix', in: 'turbulence', colorMatrixType: 'saturate', values: '0', result: 'greyscale' },
        { type: 'feConvolveMatrix', in: 'greyscale', order: '3', kernelMatrix: '1 1 1 1 1 1 1 1 1', divisor: 9, result: 'convolved' },
        { type: 'feComposite', operator: 'in', in: 'SourceGraphic', in2: 'convolved', result: 'masked' },
        { type: 'feTile', in: 'masked' }
      ],
    }),
  },
  {
    type: 'glitch',
    name: 'Glitch',
    category: 'artistic',
    createFilter: () => ({
      name: 'Glitch',
      type: 'glitch',
      category: 'artistic',
      primitives: [
        { type: 'feTurbulence', baseFrequency: '0.01 0.9', numOctaves: 1, turbulenceType: 'fractalNoise', result: 'displacement' },
        { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'displacement', scale: 15, xChannelSelector: 'R', yChannelSelector: 'G', result: 'displaced' },
        { type: 'feOffset', dx: 3, dy: 0, in: 'displaced', result: 'redOffset' },
        { type: 'feOffset', dx: -3, dy: 0, in: 'displaced', result: 'blueOffset' },
        { type: 'feBlend', mode: 'screen', in: 'redOffset', in2: 'blueOffset' }
      ],
    }),
  },
  {
    type: 'pixelate',
    name: 'Pixelate',
    category: 'artistic',
    createFilter: () => ({
      name: 'Pixelate',
      type: 'pixelate',
      category: 'artistic',
      primitives: [
        { type: 'feConvolveMatrix', order: '5', kernelMatrix: '1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1', divisor: 25 }
      ],
    }),
  },

  // ===== ARTISTIC PRESETS (Inspired) =====
  {
    type: 'dancing-stroke',
    name: 'Dancing Stroke',
    category: 'preset',
    createFilter: () => {
      const strokeColor = '#30597E';
      return {
        name: 'Dancing Stroke',
        type: 'dancing-stroke',
        category: 'preset',
        primitives: [
          { type: 'feMorphology', operator: 'dilate', radius: 4, in: 'SourceAlpha', result: 'morphology' },
          { type: 'feFlood', floodColor: strokeColor, floodOpacity: 1, result: 'flood' },
          { type: 'feComposite', in: 'flood', in2: 'morphology', operator: 'in', result: 'composite' },
          { type: 'feComposite', in: 'composite', in2: 'SourceAlpha', operator: 'out', result: 'composite1' },
          { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.01 0.02', numOctaves: 1, seed: 0, stitchTiles: 'stitch', result: 'turbulence' },
          { type: 'feDisplacementMap', in: 'composite1', in2: 'turbulence', scale: 17, xChannelSelector: 'A', yChannelSelector: 'A', result: 'displacementMap' },
          { type: 'feMerge', result: 'merge', feMergeNodes: [{ in: 'SourceGraphic' }, { in: 'displacementMap' }] }
        ],
      };
    },
  },
  {
    type: 'smoke',
    name: 'Smoke',
    category: 'preset',
    createFilter: () => {
      const color = '#38252f';
      return {
        name: 'Smoke',
        type: 'smoke',
        category: 'preset',
        primitives: [
          { type: 'feTurbulence', turbulenceType: 'turbulence', baseFrequency: '0.013 0.01', numOctaves: 2, seed: 1, stitchTiles: 'stitch', result: 'turbulence' },
          { type: 'feFlood', floodColor: color, floodOpacity: 1, result: 'flood' },
          { type: 'feComposite', in: 'flood', in2: 'turbulence', operator: 'in', result: 'composite1' },
          { type: 'feComposite', in: 'composite1', in2: 'SourceAlpha', operator: 'in', result: 'composite2' }
        ],
      };
    },
  },
  {
    type: 'waves',
    name: 'Waves',
    category: 'preset',
    createFilter: () => ({
      name: 'Waves',
      type: 'waves',
      category: 'preset',
      primitives: [
        { type: 'feTurbulence', turbulenceType: 'turbulence', baseFrequency: '0.01 0.05', numOctaves: 2, seed: 2, stitchTiles: 'noStitch', result: 'turbulence' },
        { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'turbulence', scale: 20, xChannelSelector: 'G', yChannelSelector: 'A', result: 'displacementMap' }
      ],
    }),
  },
  {
    type: 'paper-texture',
    name: 'Paper Texture',
    category: 'preset',
    createFilter: () => ({
      name: 'Paper Texture',
      type: 'paper-texture',
      category: 'preset',
      primitives: [
        { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.04', numOctaves: 5, seed: 2, result: 'noise' },
        { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'saturate', values: '0', result: 'desaturatedNoise' },
        { type: 'feBlend', mode: 'multiply', in: 'SourceGraphic', in2: 'desaturatedNoise', result: 'blend' },
        { type: 'feComposite', in: 'blend', in2: 'SourceAlpha', operator: 'in' }
      ],
    }),
  },
  {
    type: 'zebra',
    name: 'Zebra',
    category: 'preset',
    createFilter: () => ({
      name: 'Zebra',
      type: 'zebra',
      category: 'preset',
      primitives: [
        { type: 'feTurbulence', turbulenceType: 'turbulence', baseFrequency: '0 0.15', numOctaves: 1, seed: 0, result: 'turbulence' },
        { type: 'feColorMatrix', in: 'turbulence', colorMatrixType: 'matrix', values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', result: 'alpha' },
        { type: 'feComposite', in: 'SourceGraphic', in2: 'alpha', operator: 'in' }
      ],
    }),
  },
  {
    type: 'dust',
    name: 'Dust',
    category: 'preset',
    createFilter: () => ({
      name: 'Dust',
      type: 'dust',
      category: 'preset',
      primitives: [
        { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.3', numOctaves: 4, seed: 5, result: 'noise' },
        { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'matrix', values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 -0.2', result: 'dustPattern' },
        { type: 'feBlend', mode: 'multiply', in: 'SourceGraphic', in2: 'dustPattern' }
      ],
    }),
  },
  {
    type: 'colored-stripes',
    name: 'Colored Stripes',
    category: 'preset',
    createFilter: () => ({
      name: 'Colored Stripes',
      type: 'colored-stripes',
      category: 'preset',
      primitives: [
        { type: 'feTurbulence', turbulenceType: 'turbulence', baseFrequency: '0 0.15', numOctaves: 1, seed: 0, result: 'stripes' },
        { type: 'feColorMatrix', in: 'stripes', colorMatrixType: 'matrix', values: '1 0 1 0 0 0.5 1 0.5 0 0 0 0.5 1 0 0 0 0 0 1 0', result: 'coloredStripes' },
        { type: 'feBlend', mode: 'multiply', in: 'SourceGraphic', in2: 'coloredStripes' }
      ],
    }),
  },
  {
    type: 'colored-spots',
    name: 'Colored Spots',
    category: 'preset',
    createFilter: () => ({
      name: 'Colored Spots',
      type: 'colored-spots',
      category: 'preset',
      primitives: [
        { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.02', numOctaves: 1, seed: 0, result: 'spots' },
        { type: 'feColorMatrix', in: 'spots', colorMatrixType: 'matrix', values: '2 0 0 0 0 0 2 0 0 0 0 0 2 0 0 0 0 0 1 0', result: 'coloredSpots' },
        { type: 'feBlend', mode: 'screen', in: 'SourceGraphic', in2: 'coloredSpots' }
      ],
    }),
  },
  {
    type: 'colored-flame',
    name: 'Colored Flame',
    category: 'preset',
    createFilter: () => ({
      name: 'Colored Flame',
      type: 'colored-flame',
      category: 'preset',
      primitives: [
        { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.01 0.1', numOctaves: 3, seed: 1, result: 'flame' },
        { type: 'feColorMatrix', in: 'flame', colorMatrixType: 'matrix', values: '3 0 0 0 0 0 1.5 0 0 0 0 0 0.5 0 0 0 0 0 1 0', result: 'coloredFlame' },
        { type: 'feBlend', mode: 'screen', in: 'SourceGraphic', in2: 'coloredFlame' }
      ],
    }),
  },
  {
    type: 'advanced-watercolor',
    name: 'Advanced Watercolor',
    category: 'preset',
    createFilter: () => ({
      name: 'Advanced Watercolor',
      type: 'advanced-watercolor',
      category: 'preset',
      primitives: [
        { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.05 0.05', numOctaves: 5, seed: 1, stitchTiles: 'stitch', result: 'turbulence' },
        {
          type: 'feDiffuseLighting',
          surfaceScale: 0.5,
          diffuseConstant: 3.2,
          lightingColor: '#ffffff',
          in: 'turbulence',
          result: 'diffuseLighting',
          lightSource: { type: 'feDistantLight', azimuth: 150, elevation: 16 }
        },
        { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.011 0.004', numOctaves: 2, seed: 3, stitchTiles: 'noStitch', result: 'turbulence1' },
        { type: 'feColorMatrix', colorMatrixType: 'saturate', values: '3', in: 'turbulence1', result: 'colormatrix' },
        { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '2 0 0 0 0 0 1.5 0 0 0 0 0 2 0 0 0 0 0 2 0', in: 'colormatrix', result: 'colormatrix1' },
        { type: 'feBlend', mode: 'multiply', in: 'diffuseLighting', in2: 'colormatrix1', result: 'blend' },
        { type: 'feComposite', in: 'blend', in2: 'SourceAlpha', operator: 'in', result: 'composite1' }
      ],
    }),
  },
];

import type { AnimationPreset } from '../types';

/**
 * Filter Effect Animations
 * SVG filter-based visual effects that add filters to selected elements
 * Each preset applies a filter reference and optionally animates related properties
 */

/**
 * Blur Pulse animation - pulsating blur effect
 */
export const BLUR_PULSE_PRESET: AnimationPreset = {
    id: 'preset-blur-pulse',
    name: 'Blur Pulse',
    description: 'Pulsating blur effect using SVG filter',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-blur-pulse)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-blur-pulse" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0">
          <animate attributeName="stdDeviation" dur="2s" repeatCount="indefinite"
            values="0;4;0" keyTimes="0;0.5;1" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
        </feGaussianBlur>
      </filter>
    </defs>
    <circle cx="20" cy="20" r="12" fill="#3d5afe" filter="url(#filter-p-blur-pulse)"/>
  </svg>`,
};

/**
 * Glow Pulse animation - pulsating glow effect
 */
export const GLOW_PULSE_PRESET: AnimationPreset = {
    id: 'preset-glow-pulse',
    name: 'Glow Pulse',
    description: 'Pulsating glow effect with animated intensity',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-glow-pulse)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-glow-pulse" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur">
          <animate attributeName="stdDeviation" dur="2s" repeatCount="indefinite"
            values="2;6;2" keyTimes="0;0.5;1" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
        </feGaussianBlur>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="20" cy="20" r="10" fill="#ffeb3b" filter="url(#filter-p-glow-pulse)"/>
  </svg>`,
};

/**
 * Shadow Pulse animation - pulsating drop shadow
 */
export const SHADOW_PULSE_PRESET: AnimationPreset = {
    id: 'preset-shadow-pulse',
    name: 'Shadow Pulse',
    description: 'Pulsating drop shadow effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-shadow-pulse)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-shadow-pulse" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.4">
          <animate attributeName="stdDeviation" dur="2s" repeatCount="indefinite"
            values="2;5;2" keyTimes="0;0.5;1" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
          <animate attributeName="flood-opacity" dur="2s" repeatCount="indefinite"
            values="0.4;0.7;0.4" keyTimes="0;0.5;1" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
        </feDropShadow>
      </filter>
    </defs>
    <rect x="10" y="10" width="18" height="18" rx="3" fill="#4caf50" filter="url(#filter-p-shadow-pulse)"/>
  </svg>`,
};

/**
 * Grayscale Pulse animation - pulsating grayscale effect
 */
export const GRAYSCALE_PULSE_PRESET: AnimationPreset = {
    id: 'preset-grayscale-pulse',
    name: 'Grayscale Pulse',
    description: 'Grayscale intensity pulses in and out',
    targetType: 'any',
    preset: true,
    preserveColors: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-grayscale-pulse)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-grayscale-pulse" x="-10%" y="-10%" width="120%" height="120%">
        <feColorMatrix type="saturate" values="1">
          <animate attributeName="values" dur="3s" repeatCount="indefinite"
            values="1;0;1" keyTimes="0;0.5;1" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
        </feColorMatrix>
      </filter>
    </defs>
    <circle cx="20" cy="20" r="12" fill="#e91e63" filter="url(#filter-p-grayscale-pulse)"/>
  </svg>`,
};

/**
 * Sepia Pulse animation - pulsating sepia effect
 */
export const SEPIA_PULSE_PRESET: AnimationPreset = {
    id: 'preset-sepia-pulse',
    name: 'Sepia Pulse',
    description: 'Sepia tone intensity pulses in and out',
    targetType: 'any',
    preset: true,
    preserveColors: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-sepia-pulse)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-sepia-pulse" x="-10%" y="-10%" width="120%" height="120%">
        <feColorMatrix type="matrix" 
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0">
          <animate attributeName="values" dur="3s" repeatCount="indefinite"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0;
                    0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0;
                    1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            keyTimes="0;0.5;1" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
        </feColorMatrix>
      </filter>
    </defs>
    <rect x="8" y="8" width="24" height="24" rx="4" fill="#8d6e63" filter="url(#filter-p-sepia-pulse)"/>
  </svg>`,
};

/**
 * Hue Rotate animation - continuous hue rotation
 */
export const HUE_ROTATE_PRESET: AnimationPreset = {
    id: 'preset-hue-rotate',
    name: 'Hue Rotate',
    description: 'Continuous color hue rotation through spectrum',
    targetType: 'any',
    preset: true,
    preserveColors: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-hue-rotate)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-hue-rotate" x="-10%" y="-10%" width="120%" height="120%">
        <feColorMatrix type="hueRotate" values="0">
          <animate attributeName="values" dur="4s" repeatCount="indefinite"
            values="0;360" calcMode="linear"/>
        </feColorMatrix>
      </filter>
    </defs>
    <circle cx="20" cy="20" r="12" fill="#ff5722" filter="url(#filter-p-hue-rotate)"/>
  </svg>`,
};

/**
 * Brightness Flash animation - brightness pulsation
 */
export const BRIGHTNESS_FLASH_PRESET: AnimationPreset = {
    id: 'preset-brightness-flash',
    name: 'Brightness Flash',
    description: 'Flashing brightness effect',
    targetType: 'any',
    preset: true,
    preserveColors: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-brightness-flash)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-brightness-flash" x="-10%" y="-10%" width="120%" height="120%">
        <feComponentTransfer>
          <feFuncR type="linear" slope="1">
            <animate attributeName="slope" dur="0.5s" repeatCount="indefinite"
              values="1;2;1" keyTimes="0;0.5;1"/>
          </feFuncR>
          <feFuncG type="linear" slope="1">
            <animate attributeName="slope" dur="0.5s" repeatCount="indefinite"
              values="1;2;1" keyTimes="0;0.5;1"/>
          </feFuncG>
          <feFuncB type="linear" slope="1">
            <animate attributeName="slope" dur="0.5s" repeatCount="indefinite"
              values="1;2;1" keyTimes="0;0.5;1"/>
          </feFuncB>
        </feComponentTransfer>
      </filter>
    </defs>
    <rect x="10" y="10" width="20" height="20" rx="3" fill="#ffeb3b" filter="url(#filter-p-brightness-flash)"/>
  </svg>`,
};

/**
 * Contrast Pulse animation - contrast pulsation
 */
export const CONTRAST_PULSE_PRESET: AnimationPreset = {
    id: 'preset-contrast-pulse',
    name: 'Contrast Pulse',
    description: 'Pulsating contrast effect',
    targetType: 'any',
    preset: true,
    preserveColors: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-contrast-pulse)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-contrast-pulse" x="-10%" y="-10%" width="120%" height="120%">
        <feComponentTransfer>
          <feFuncR type="linear" slope="1" intercept="0">
            <animate attributeName="slope" dur="2s" repeatCount="indefinite"
              values="1;1.5;1" keyTimes="0;0.5;1" calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
            <animate attributeName="intercept" dur="2s" repeatCount="indefinite"
              values="0;-0.25;0" keyTimes="0;0.5;1" calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
          </feFuncR>
          <feFuncG type="linear" slope="1" intercept="0">
            <animate attributeName="slope" dur="2s" repeatCount="indefinite"
              values="1;1.5;1" keyTimes="0;0.5;1" calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
            <animate attributeName="intercept" dur="2s" repeatCount="indefinite"
              values="0;-0.25;0" keyTimes="0;0.5;1" calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
          </feFuncG>
          <feFuncB type="linear" slope="1" intercept="0">
            <animate attributeName="slope" dur="2s" repeatCount="indefinite"
              values="1;1.5;1" keyTimes="0;0.5;1" calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
            <animate attributeName="intercept" dur="2s" repeatCount="indefinite"
              values="0;-0.25;0" keyTimes="0;0.5;1" calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
          </feFuncB>
        </feComponentTransfer>
      </filter>
    </defs>
    <circle cx="20" cy="20" r="12" fill="#9c27b0" filter="url(#filter-p-contrast-pulse)"/>
  </svg>`,
};

/**
 * Invert Flash animation - flashing color inversion
 */
export const INVERT_FLASH_PRESET: AnimationPreset = {
    id: 'preset-invert-flash',
    name: 'Invert Flash',
    description: 'Flashing color inversion effect',
    targetType: 'any',
    preset: true,
    preserveColors: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-invert-flash)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-invert-flash" x="-10%" y="-10%" width="120%" height="120%">
        <feColorMatrix type="matrix" 
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0">
          <animate attributeName="values" dur="1s" repeatCount="indefinite"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0;
                    -1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0;
                    1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            keyTimes="0;0.5;1" calcMode="discrete"/>
        </feColorMatrix>
      </filter>
    </defs>
    <rect x="8" y="8" width="24" height="24" rx="4" fill="#00bcd4" filter="url(#filter-p-invert-flash)"/>
  </svg>`,
};

/**
 * Turbulence Ripple animation - wavy distortion effect
 */
export const TURBULENCE_RIPPLE_PRESET: AnimationPreset = {
    id: 'preset-turbulence-ripple',
    name: 'Turbulence Ripple',
    description: 'Wavy turbulence distortion effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-turbulence-ripple)',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-p-turbulence-ripple" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" result="turbulence">
          <animate attributeName="baseFrequency" dur="3s" repeatCount="indefinite"
            values="0.02;0.05;0.02" keyTimes="0;0.5;1" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="5" xChannelSelector="R" yChannelSelector="G">
          <animate attributeName="scale" dur="3s" repeatCount="indefinite"
            values="5;15;5" keyTimes="0;0.5;1" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
        </feDisplacementMap>
      </filter>
    </defs>
    <circle cx="20" cy="20" r="12" fill="#2196f3" filter="url(#filter-p-turbulence-ripple)"/>
  </svg>`,
};

/** All filter effect animation presets */
export const FILTER_PRESETS: AnimationPreset[] = [
    BLUR_PULSE_PRESET,
    GLOW_PULSE_PRESET,
    SHADOW_PULSE_PRESET,
    GRAYSCALE_PULSE_PRESET,
    SEPIA_PULSE_PRESET,
    HUE_ROTATE_PRESET,
    BRIGHTNESS_FLASH_PRESET,
    CONTRAST_PULSE_PRESET,
    INVERT_FLASH_PRESET,
    TURBULENCE_RIPPLE_PRESET,
];

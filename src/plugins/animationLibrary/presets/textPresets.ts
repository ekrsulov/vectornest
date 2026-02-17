import type { AnimationPreset } from '../types';

/**
 * Text Animations
 * These animations are specifically designed for native text elements
 */

/**
 * Text Typewriter animation - typing effect with clipPath
 */
export const TEXT_TYPEWRITER_PRESET: AnimationPreset = {
    id: 'preset-text-typewriter',
    name: 'Typewriter',
    description: 'Classic typing effect with clipPath reveal and cursor.',
    targetType: 'text',
    preset: true,
    animations: [],
    clipPathAnimation: {
        baseElementTag: 'rect',
        baseElementAttrs: {
            x: '0',
            y: '0',
            width: '0',
            height: '100%',
        },
        sizeToElement: true,
        animation: {
            type: 'animate',
            attributeName: 'width',
            dur: '3s',
            repeatCount: 'indefinite',
            fill: 'freeze',
            calcMode: 'linear',
            values: 'DYNAMIC_WIDTH_STEPS',
        },
    },
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <clipPath id="typeClip">
        <rect x="0" y="0" width="0" height="40">
          <animate attributeName="width" dur="2s" repeatCount="indefinite"
            values="0;8;16;24;32;40" calcMode="discrete"
            keyTimes="0;0.2;0.4;0.6;0.8;1"/>
        </rect>
      </clipPath>
    </defs>
    <text x="4" y="26" font-family="monospace" font-size="14" fill="#4caf50" font-weight="bold" clip-path="url(#typeClip)">
      Type
    </text>
    <rect x="4" y="14" width="2" height="16" rx="0.5" fill="#4caf50">
      <animate attributeName="x" dur="2s" repeatCount="indefinite"
        values="4;12;20;28;36;36" calcMode="discrete"
        keyTimes="0;0.2;0.4;0.6;0.8;1"/>
      <animate attributeName="opacity" dur="0.6s" repeatCount="indefinite"
        values="1;1;0;0" calcMode="discrete"
        keyTimes="0;0.4;0.5;1" begin="2s"/>
    </rect>
  </svg>`,
};

/**
 * Text Glow animation - pulsating glow
 */
export const TEXT_GLOW_PRESET: AnimationPreset = {
    id: 'preset-text-glow',
    name: 'Text Glow',
    description: 'Soft pulsating glow effect for emphasis.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-glow-400)',
        },
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '1.5s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0.6;1;0.6',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-glow-400" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4.4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <text x="8" y="24" font-family="sans-serif" font-size="12" fill="#ffeb3b" font-weight="bold" filter="url(#filter-glow-400)">
      Glow
      <animate attributeName="opacity" dur="1.5s" repeatCount="indefinite"
        values="0.6;1;0.6" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </text>
  </svg>`,
};

/**
 * Text Wave animation - vertical wave
 */
export const TEXT_WAVE_PRESET: AnimationPreset = {
    id: 'preset-text-wave',
    name: 'Text Wave',
    description: 'Gentle vertical wave motion.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '2s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.25;0.5;0.75;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0 0; 0 -5; 0 0; 0 5; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="6" y="24" font-family="sans-serif" font-size="11" fill="#2196f3" font-weight="bold">
      Wave
      <animateTransform attributeName="transform" type="translate" dur="2s" repeatCount="indefinite"
        values="0 0; 0 -5; 0 0; 0 5; 0 0" calcMode="spline" additive="sum"
        keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </text>
  </svg>`,
};

/**
 * Text Jitter animation - nervous trembling
 */
export const TEXT_JITTER_PRESET: AnimationPreset = {
    id: 'preset-text-jitter',
    name: 'Text Jitter',
    description: 'Nervous trembling effect for emphasis.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.15s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            keyTimes: '0;0.25;0.5;0.75;1',
            values: '0 0; 1 -1; -1 1; 1 0; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="7" y="24" font-family="sans-serif" font-size="11" fill="#f44336" font-weight="bold">
      Jitter
      <animateTransform attributeName="transform" type="translate" dur="0.15s" repeatCount="indefinite"
        values="0 0; 1 -1; -1 1; 1 0; 0 0" calcMode="linear" additive="sum"
        keyTimes="0;0.25;0.5;0.75;1"/>
    </text>
  </svg>`,
};

/**
 * Text Zoom animation - rhythmic scale
 */
export const TEXT_ZOOM_PRESET: AnimationPreset = {
    id: 'preset-text-zoom',
    name: 'Text Zoom',
    description: 'Rhythmic scale in and out effect.',
    targetType: 'text',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '1.2s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '1 1; 1.15 1.15; 1 1',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="6" y="24" font-family="sans-serif" font-size="11" fill="#9c27b0" font-weight="bold">
      Zoom
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="-3 -3; -4.5 -4.5; -3 -3" additive="sum" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      <animateTransform attributeName="transform" type="scale" dur="1.2s" repeatCount="indefinite"
        values="1 1; 1.15 1.15; 1 1" calcMode="spline" additive="sum"
        keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </text>
  </svg>`,
};

/**
 * Text Slide animation - horizontal sliding
 */
export const TEXT_SLIDE_PRESET: AnimationPreset = {
    id: 'preset-text-slide',
    name: 'Text Slide',
    description: 'Smooth horizontal sliding motion.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '2s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.25;0.5;0.75;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0 0; 8 0; 0 0; -8 0; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="6" y="24" font-family="sans-serif" font-size="11" fill="#00bcd4" font-weight="bold">
      Slide
      <animateTransform attributeName="transform" type="translate" dur="2s" repeatCount="indefinite"
        values="0 0; 6 0; 0 0; -6 0; 0 0" calcMode="spline" additive="sum"
        keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </text>
  </svg>`,
};

/**
 * Text Flash animation - rapid blink
 */
export const TEXT_FLASH_PRESET: AnimationPreset = {
    id: 'preset-text-flash',
    name: 'Text Flash',
    description: 'Rapid flashing for urgent attention.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '0.8s',
            repeatCount: 'indefinite',
            calcMode: 'discrete',
            keyTimes: '0;0.25;0.5;0.75;1',
            values: '1;0.2;1;0.2;1',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="5" y="24" font-family="sans-serif" font-size="11" fill="#ff5722" font-weight="bold">
      Flash
      <animate attributeName="opacity" dur="0.8s" repeatCount="indefinite"
        values="1;0.2;1;0.2;1" calcMode="discrete"
        keyTimes="0;0.25;0.5;0.75;1"/>
    </text>
  </svg>`,
};

/**
 * Text Rise animation - ascending reveal
 */
export const TEXT_RISE_PRESET: AnimationPreset = {
    id: 'preset-text-rise',
    name: 'Text Rise',
    description: 'Ascending entrance with fade effect.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '1.5s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.4;1',
            keySplines: '0.25 0.1 0.25 1; 0.25 0.1 0.25 1',
            values: '0 15; 0 0; 0 15',
            additive: 'sum',
            fill: 'freeze',
        },
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '1.5s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.4;1',
            keySplines: '0.25 0.1 0.25 1; 0.25 0.1 0.25 1',
            values: '0;1;0',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="8" y="24" font-family="sans-serif" font-size="11" fill="#8bc34a" font-weight="bold">
      Rise
      <animateTransform attributeName="transform" type="translate" dur="1.5s" repeatCount="indefinite"
        values="0 10; 0 0; 0 10" calcMode="spline" additive="sum"
        keyTimes="0;0.4;1" keySplines="0.25 0.1 0.25 1; 0.25 0.1 0.25 1"/>
      <animate attributeName="opacity" dur="1.5s" repeatCount="indefinite"
        values="0;1;0" calcMode="spline" keyTimes="0;0.4;1" keySplines="0.25 0.1 0.25 1; 0.25 0.1 0.25 1"/>
    </text>
  </svg>`,
};

/**
 * Text Tilt animation - playful rotation
 */
export const TEXT_TILT_PRESET: AnimationPreset = {
    id: 'preset-text-tilt',
    name: 'Text Tilt',
    description: 'Playful tilting rotation effect.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '1.5s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.25;0.5;0.75;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0; 8; 0; -8; 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="10" y="24" font-family="sans-serif" font-size="11" fill="#e91e63" font-weight="bold">
      Tilt
      <animateTransform attributeName="transform" type="rotate" dur="1.5s" repeatCount="indefinite"
        values="0 20 20; 8 20 20; 0 20 20; -8 20 20; 0 20 20" calcMode="spline" additive="sum"
        keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </text>
  </svg>`,
};

/**
 * Text Pop animation - bouncy entrance
 */
export const TEXT_POP_PRESET: AnimationPreset = {
    id: 'preset-text-pop',
    name: 'Text Pop',
    description: 'Bouncy elastic pop effect.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '0.8s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.3;0.5;0.7;1',
            keySplines: '0.2 0 0.4 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.6 1',
            values: '0.8 0.8; 1.2 1.2; 0.95 0.95; 1.05 1.05; 1 1',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="10" y="24" font-family="sans-serif" font-size="11" fill="#3f51b5" font-weight="bold">
      Pop
      <animateTransform attributeName="transform" type="translate" dur="0.8s" repeatCount="indefinite"
        values="-4 -4; 4 4; -1 -1; 1 1; 0 0" additive="sum"
        keyTimes="0;0.3;0.5;0.7;1" calcMode="spline" keySplines="0.2 0 0.4 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.6 1"/>
      <animateTransform attributeName="transform" type="scale" dur="0.8s" repeatCount="indefinite"
        values="0.8 0.8; 1.2 1.2; 0.95 0.95; 1.05 1.05; 1 1" calcMode="spline" additive="sum"
        keyTimes="0;0.3;0.5;0.7;1" keySplines="0.2 0 0.4 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.6 1"/>
    </text>
  </svg>`,
};

/**
 * Text Weight Shift animation - font weight pulse
 */
export const TEXT_WEIGHT_SHIFT_PRESET: AnimationPreset = {
    id: 'preset-text-weight-shift',
    name: 'Weight Shift',
    description: 'Pulses between light and bold weights.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'font-weight',
            dur: '2s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '300;900;300',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="4" y="26" font-family="sans-serif" font-size="14" fill="#9c27b0" font-weight="300">
      Bold
      <animate attributeName="font-weight" dur="2s" repeatCount="indefinite"
        values="300;900;300" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </text>
  </svg>`,
};

/**
 * Text Spacing animation - letter spacing pulse
 */
export const TEXT_SPACING_PRESET: AnimationPreset = {
    id: 'preset-text-spacing',
    name: 'Spacing',
    description: 'Letters expand and contract spacing.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'letter-spacing',
            dur: '2s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
            values: 'DYNAMIC_SPACING',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="4" y="24" font-family="sans-serif" font-size="10" fill="#ff5722" font-weight="bold">
      Space
      <animate attributeName="letter-spacing" dur="2s" repeatCount="indefinite"
        values="0px;6px;0px" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </text>
  </svg>`,
};

/**
 * Text Size Pulse animation - font size breathing
 */
export const TEXT_SIZE_PULSE_PRESET: AnimationPreset = {
    id: 'preset-text-size-pulse',
    name: 'Size Pulse',
    description: 'Font size grows and shrinks smoothly.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'font-size',
            dur: '2s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
            values: 'DYNAMIC_SIZE_PULSE',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="6" y="26" font-family="sans-serif" font-size="12" fill="#00bcd4" font-weight="bold">
      Size
      <animate attributeName="font-size" dur="2s" repeatCount="indefinite"
        values="12;17;12" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </text>
  </svg>`,
};

/**
 * Text Letter Rotate animation - wave rotation
 */
export const TEXT_LETTER_ROTATE_PRESET: AnimationPreset = {
    id: 'preset-text-letter-rotate',
    name: 'Letter Rotate',
    description: 'Each letter rotates in a wave pattern.',
    targetType: 'text',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'rotate',
            dur: '3s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            values: 'DYNAMIC_LETTER_ROTATE',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <text x="6" y="26" font-family="sans-serif" font-size="13" fill="#e91e63" font-weight="bold"
          rotate="0 0 0 0 0">
      Spin
      <animate attributeName="rotate" dur="3s" repeatCount="indefinite"
        values="
          0 0 0 0 0;
          0 5 10 5 0;
          0 0 0 0 0;
          0 -5 -10 -5 0;
          0 0 0 0 0
        "/>
    </text>
  </svg>`,
};

/** All text animation presets */
export const TEXT_PRESETS: AnimationPreset[] = [
    TEXT_TYPEWRITER_PRESET,
    TEXT_GLOW_PRESET,
    TEXT_WAVE_PRESET,
    TEXT_JITTER_PRESET,
    TEXT_ZOOM_PRESET,
    TEXT_SLIDE_PRESET,
    TEXT_FLASH_PRESET,
    TEXT_RISE_PRESET,
    TEXT_TILT_PRESET,
    TEXT_POP_PRESET,
    TEXT_WEIGHT_SHIFT_PRESET,
    TEXT_SPACING_PRESET,
    TEXT_SIZE_PULSE_PRESET,
    TEXT_LETTER_ROTATE_PRESET,
];

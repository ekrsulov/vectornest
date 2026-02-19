import type { AnimationPreset } from '../types';

/**
 * Decorative Loop Animations
 * Visual effects for continuous decoration and ambiance
 */

/**
 * Blink animation - simple on/off blinking
 */
const BLINK_PRESET: AnimationPreset = {
    id: 'preset-blink',
    name: 'Blink',
    description: 'Simple on/off blinking effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '0.5s',
            repeatCount: 'indefinite',
            values: '1; 0; 1',
            keyTimes: '0;0.5;1',
            calcMode: 'discrete',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="10" fill="#ffeb3b">
      <animate attributeName="opacity" dur="0.5s" repeatCount="indefinite"
        values="1;0;1" keyTimes="0;0.5;1" calcMode="discrete"/>
    </circle>
  </svg>`,
};

/**
 * Flash animation - quick bright flash
 */
const FLASH_PRESET: AnimationPreset = {
    id: 'preset-flash',
    name: 'Flash',
    description: 'Quick bright flash effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '0.3s',
            repeatCount: 'indefinite',
            values: '1; 0.2; 1',
            keyTimes: '0;0.5;1',
            calcMode: 'spline',
            keySplines: '0.4 0 0.2 1; 0.4 0 0.2 1',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="#fff176">
      <animate attributeName="opacity" dur="0.3s" repeatCount="indefinite"
        values="1;0.2;1" keyTimes="0;0.5;1"/>
    </circle>
  </svg>`,
};

/**
 * Strobe animation - rapid strobe light effect
 */
const STROBE_PRESET: AnimationPreset = {
    id: 'preset-strobe',
    name: 'Strobe',
    description: 'Rapid strobe light effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '0.1s',
            repeatCount: 'indefinite',
            values: '1; 0.3; 1; 0.5; 1',
            keyTimes: '0;0.2;0.4;0.7;1',
            calcMode: 'discrete',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="10" fill="#e0e0e0">
      <animate attributeName="opacity" dur="0.1s" repeatCount="indefinite"
        values="1;0.3;1;0.5;1" keyTimes="0;0.2;0.4;0.7;1" calcMode="discrete"/>
    </circle>
  </svg>`,
};

/**
 * Shimmer animation - subtle light shimmer
 */
const SHIMMER_PRESET: AnimationPreset = {
    id: 'preset-shimmer',
    name: 'Shimmer',
    description: 'Subtle light shimmer effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '2s',
            repeatCount: 'indefinite',
            values: '0.6; 1; 0.6; 0.9; 0.6',
            keyTimes: '0;0.2;0.4;0.7;1',
            calcMode: 'spline',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="8" y="15" width="24" height="10" rx="2" fill="#b0bec5">
      <animate attributeName="opacity" dur="2s" repeatCount="indefinite"
        values="0.6;1;0.6;0.9;0.6" keyTimes="0;0.2;0.4;0.7;1"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </rect>
  </svg>`,
};

/**
 * Star Twinkle animation - star-like twinkling
 */
const STAR_TWINKLE_PRESET: AnimationPreset = {
    id: 'preset-star-twinkle',
    name: 'Star Twinkle',
    description: 'Star-like twinkling effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '3s',
            repeatCount: 'indefinite',
            values: '1; 0.2; 1; 0.5; 1',
            keyTimes: '0;0.2;0.5;0.8;1',
            calcMode: 'spline',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <polygon points="20,6 22,16 32,17 24,23 26,33 20,27 14,33 16,23 8,17 18,16" fill="#fdd835">
      <animate attributeName="opacity" dur="3s" repeatCount="indefinite"
        values="1;0.2;1;0.5;1" keyTimes="0;0.2;0.5;0.8;1"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </polygon>
  </svg>`,
};

/**
 * Glitch animation - digital glitch effect
 */
const GLITCH_PRESET: AnimationPreset = {
    id: 'preset-glitch',
    name: 'Glitch',
    description: 'Digital glitch displacement effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.5s',
            repeatCount: 'indefinite',
            calcMode: 'discrete',
            keyTimes: '0;0.2;0.4;1',
            values: '0 0; 5 -2; -5 2; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="12" width="20" height="16" rx="1" fill="#00e676">
      <animateTransform attributeName="transform" type="translate" dur="0.5s" repeatCount="indefinite"
        values="0 0; 4 -1; -4 1; 0 0" keyTimes="0;0.2;0.4;1" additive="sum" calcMode="discrete"/>
    </rect>
  </svg>`,
};

/**
 * Glitch Extreme animation - intense glitch effect
 */
const GLITCH_EXTREME_PRESET: AnimationPreset = {
    id: 'preset-glitch-extreme',
    name: 'Glitch Extreme',
    description: 'Intense digital glitch effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.2s',
            repeatCount: 'indefinite',
            calcMode: 'discrete',
            keyTimes: '0;0.1;0.2;0.3;0.4;1',
            values: '0 0; 20 -10; -20 10; 30 0; -30 0; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="12" width="20" height="16" rx="1" fill="#f50057">
      <animateTransform attributeName="transform" type="translate" dur="0.2s" repeatCount="indefinite"
        values="0 0; 8 -4; -8 4; 12 0; -12 0; 0 0" keyTimes="0;0.1;0.2;0.3;0.4;1" additive="sum" calcMode="discrete"/>
    </rect>
  </svg>`,
};

/**
 * Wave animation - gentle wave motion
 */
const WAVE_PRESET: AnimationPreset = {
    id: 'preset-wave',
    name: 'Wave',
    description: 'Gentle wave-like oscillation',
    targetType: 'any',
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
            values: '0 0; 0 -8; 0 0; 0 8; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="20" rx="14" ry="8" fill="#03a9f4">
      <animateTransform attributeName="transform" type="translate" dur="2s" repeatCount="indefinite"
        values="0 0; 0 -6; 0 0; 0 6; 0 0" keyTimes="0;0.25;0.5;0.75;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </ellipse>
  </svg>`,
};

/**
 * Cloud Drift animation - slow horizontal drift
 */
const CLOUD_DRIFT_PRESET: AnimationPreset = {
    id: 'preset-cloud-drift',
    name: 'Cloud Drift',
    description: 'Slow horizontal drifting motion',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '20s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            from: '-200 0',
            to: '800 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="20" rx="12" ry="6" fill="#eceff1">
      <animateTransform attributeName="transform" type="translate" dur="4s" repeatCount="indefinite"
        values="-15 0; 15 0; -15 0" keyTimes="0;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </ellipse>
  </svg>`,
};

/**
 * Wind Sway animation - natural wind swaying
 */
const WIND_SWAY_PRESET: AnimationPreset = {
    id: 'preset-wind-sway',
    name: 'Wind Sway',
    description: 'Natural wind swaying motion',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '4s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95',
            values: '0; 5; 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="18" y="5" width="4" height="30" rx="1" fill="#4caf50">
      <animateTransform attributeName="transform" type="rotate" dur="4s" repeatCount="indefinite"
        values="0 20 35; 8 20 35; 0 20 35" keyTimes="0;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95"/>
    </rect>
    <ellipse cx="20" cy="8" rx="8" ry="6" fill="#81c784">
      <animateTransform attributeName="transform" type="rotate" dur="4s" repeatCount="indefinite"
        values="0 20 35; 8 20 35; 0 20 35" keyTimes="0;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95"/>
    </ellipse>
  </svg>`,
};

/**
 * Flame Pulse animation - flickering flame effect
 */
const FLAME_PULSE_PRESET: AnimationPreset = {
    id: 'preset-flame-pulse',
    name: 'Flame Pulse',
    description: 'Flickering flame-like pulsation',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '0.2s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            keyTimes: '0;0.3;0.7;1',
            values: '1 1; 1.02 1.05; 0.98 1.02; 1 1',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="24" rx="8" ry="12" fill="#ff5722">
      <animateTransform attributeName="transform" type="scale" dur="0.2s" repeatCount="indefinite"
        values="1 1; 1.02 1.06; 0.98 1.02; 1 1" keyTimes="0;0.3;0.7;1" additive="sum"/>
    </ellipse>
    <ellipse cx="20" cy="20" rx="5" ry="8" fill="#ff9800">
      <animateTransform attributeName="transform" type="scale" dur="0.15s" repeatCount="indefinite"
        values="1 1; 1.04 1.08; 0.96 1.03; 1 1" keyTimes="0;0.3;0.7;1" additive="sum"/>
    </ellipse>
  </svg>`,
};

/** All decorative loop animation presets */
export const LOOP_PRESETS: AnimationPreset[] = [
    BLINK_PRESET,
    FLASH_PRESET,
    STROBE_PRESET,
    SHIMMER_PRESET,
    STAR_TWINKLE_PRESET,
    GLITCH_PRESET,
    GLITCH_EXTREME_PRESET,
    WAVE_PRESET,
    CLOUD_DRIFT_PRESET,
    WIND_SWAY_PRESET,
    FLAME_PULSE_PRESET,
];

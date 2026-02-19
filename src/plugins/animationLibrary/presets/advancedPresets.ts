import type { AnimationPreset } from '../types';

/**
 * Advanced Animations
 * Complex and unique animation effects
 */

/**
 * Elastic Bounce animation - exaggerated elastic bouncing
 */
const ELASTIC_BOUNCE_PRESET: AnimationPreset = {
    id: 'preset-elastic-bounce',
    name: 'Elastic Bounce',
    description: 'Exaggerated elastic bouncing effect with overshoot',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '1.5s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.2;0.4;0.6;0.8;0.9;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0 0; 0 -50; 0 0; 0 -25; 0 0; 0 -10; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="28" r="8" fill="#4caf50">
      <animateTransform attributeName="transform" type="translate" dur="1.5s" repeatCount="indefinite"
        values="0 0; 0 -18; 0 0; 0 -8; 0 0; 0 -3; 0 0"
        keyTimes="0;0.2;0.4;0.6;0.8;0.9;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </circle>
  </svg>`,
};

/**
 * Squash Bounce animation - elastic bounce with impact deformation
 */
const SQUASH_BOUNCE_PRESET: AnimationPreset = {
    id: 'preset-squash-bounce',
    name: 'Squash Bounce',
    description: 'Elastic vertical bounce with squash-and-stretch on impact.',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '1.5s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.18;0.35;0.53;0.7;0.85;1',
            keySplines: '0.3 0 0.6 1; 0.2 0 0.4 1; 0.3 0 0.6 1; 0.2 0 0.4 1; 0.3 0 0.6 1; 0.3 0 0.6 1',
            values: '0 0; 0 -52; 0 0; 0 -26; 0 0; 0 -9; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '1.5s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.18;0.35;0.53;0.7;0.85;1',
            keySplines: '0.3 0 0.6 1; 0.2 0 0.4 1; 0.3 0 0.6 1; 0.2 0 0.4 1; 0.3 0 0.6 1; 0.3 0 0.6 1',
            values: '1 1; 0.9 1.1; 1.22 0.78; 0.95 1.05; 1.12 0.88; 0.98 1.02; 1 1',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="28" r="8" fill="#26a69a">
      <animateTransform attributeName="transform" type="translate" dur="1.5s" repeatCount="indefinite"
        values="0 0; 0 -18; 0 0; 0 -9; 0 0; 0 -3; 0 0"
        keyTimes="0;0.18;0.35;0.53;0.7;0.85;1" additive="sum"
        calcMode="spline" keySplines="0.3 0 0.6 1; 0.2 0 0.4 1; 0.3 0 0.6 1; 0.2 0 0.4 1; 0.3 0 0.6 1; 0.3 0 0.6 1"/>
      <animateTransform attributeName="transform" type="scale" dur="1.5s" repeatCount="indefinite"
        values="1 1; 0.92 1.08; 1.2 0.8; 0.96 1.04; 1.1 0.9; 0.99 1.01; 1 1"
        keyTimes="0;0.18;0.35;0.53;0.7;0.85;1" additive="sum"
        calcMode="spline" keySplines="0.3 0 0.6 1; 0.2 0 0.4 1; 0.3 0 0.6 1; 0.2 0 0.4 1; 0.3 0 0.6 1; 0.3 0 0.6 1"/>
    </circle>
  </svg>`,
};

/**
 * Orbit animation - circular orbital rotation
 */
const ORBIT_PRESET: AnimationPreset = {
    id: 'preset-orbit',
    name: 'Orbit',
    description: 'Circular orbital rotation around center',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '4s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            from: '0',
            to: '360',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="2" fill="#9e9e9e" opacity="0.5"/>
    <ellipse cx="20" cy="20" rx="12" ry="8" fill="none" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="3 2"/>
    <circle cx="32" cy="20" r="4" fill="#2196f3">
      <animateTransform attributeName="transform" type="rotate" dur="4s" repeatCount="indefinite"
        from="0 20 20" to="360 20 20" calcMode="linear"/>
    </circle>
  </svg>`,
};

/**
 * Spiral animation - spiral scale and rotation
 */
const SPIRAL_PRESET: AnimationPreset = {
    id: 'preset-spiral',
    name: 'Spiral',
    description: 'Spiraling scale with rotation effect',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '3s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '1 1; 0.5 0.5; 1 1',
            additive: 'sum',
            fill: 'freeze',
        },
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '3s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            from: '0',
            to: '720',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="2" fill="#9c27b0">
      <animateTransform attributeName="transform" type="translate" dur="3s" repeatCount="indefinite"
        values="-4 -4; -2 -2; -4 -4" additive="sum" keyTimes="0;0.5;1"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      <animateTransform attributeName="transform" type="scale" dur="3s" repeatCount="indefinite"
        values="1 1; 0.5 0.5; 1 1" additive="sum" keyTimes="0;0.5;1"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      <animateTransform attributeName="transform" type="rotate" dur="3s" repeatCount="indefinite"
        from="0 20 20" to="720 20 20" calcMode="linear"/>
    </rect>
  </svg>`,
};

/**
 * Rubber Band animation - stretchy elastic effect
 */
const RUBBER_BAND_PRESET: AnimationPreset = {
    id: 'preset-rubber-band',
    name: 'Rubber Band',
    description: 'Stretchy rubber band effect with squash and stretch',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '1s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.3;0.4;0.5;0.65;0.75;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '1 1; 1.25 0.75; 0.75 1.25; 1.15 0.85; 0.95 1.05; 1.05 0.95; 1 1',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="20" rx="10" ry="10" fill="#ff5722">
      <animateTransform attributeName="transform" type="translate" dur="1s" repeatCount="indefinite"
        values="0 0; -2.5 2.5; 2.5 -2.5; -1.5 1.5; 0.5 -0.5; -0.5 0.5; 0 0"
        keyTimes="0;0.3;0.4;0.5;0.65;0.75;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
      <animateTransform attributeName="transform" type="scale" dur="1s" repeatCount="indefinite"
        values="1 1; 1.25 0.75; 0.75 1.25; 1.15 0.85; 0.95 1.05; 1.05 0.95; 1 1"
        keyTimes="0;0.3;0.4;0.5;0.65;0.75;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </ellipse>
  </svg>`,
};

/**
 * Breathing Glow animation - glow with breathing rhythm (uses filter)
 */
const BREATHING_GLOW_PRESET: AnimationPreset = {
    id: 'preset-breathing-glow',
    name: 'Breathing Glow',
    description: 'Soft glow with slow breathing rhythm',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'set',
            attributeName: 'filter',
            to: 'url(#filter-breathing-glow)',
        },
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '4s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0.7;1;0.7',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <filter id="filter-breathing-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur">
          <animate attributeName="stdDeviation" dur="4s" repeatCount="indefinite"
            values="3;6;3" keyTimes="0;0.5;1" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
        </feGaussianBlur>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="20" cy="20" r="10" fill="#00bcd4" filter="url(#filter-breathing-glow)" opacity="0.7">
      <animate attributeName="opacity" dur="4s" repeatCount="indefinite"
        values="0.7;1;0.7" keyTimes="0;0.5;1" calcMode="spline"
        keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </circle>
  </svg>`,
};

/**
 * Morph Scale animation - morphing scale with elastic overshoot
 */
const MORPH_SCALE_PRESET: AnimationPreset = {
    id: 'preset-morph-scale',
    name: 'Morph Scale',
    description: 'Morphing scale with elastic overshoot effect',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '2s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.2;0.5;0.7;1',
            keySplines: '0.2 0 0.4 1; 0.4 0 0.2 1; 0.2 0 0.4 1; 0.4 0 0.2 1',
            values: '1 1; 1.3 0.7; 0.7 1.3; 1.1 0.9; 1 1',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="10" width="20" height="20" rx="4" fill="#e91e63">
      <animateTransform attributeName="transform" type="translate" dur="2s" repeatCount="indefinite"
        values="0 0; -3 3; 3 -3; -1 1; 0 0" additive="sum"
        keyTimes="0;0.2;0.5;0.7;1" calcMode="spline"
        keySplines="0.2 0 0.4 1; 0.4 0 0.2 1; 0.2 0 0.4 1; 0.4 0 0.2 1"/>
      <animateTransform attributeName="transform" type="scale" dur="2s" repeatCount="indefinite"
        values="1 1; 1.3 0.7; 0.7 1.3; 1.1 0.9; 1 1" additive="sum"
        keyTimes="0;0.2;0.5;0.7;1" calcMode="spline"
        keySplines="0.2 0 0.4 1; 0.4 0 0.2 1; 0.2 0 0.4 1; 0.4 0 0.2 1"/>
    </rect>
  </svg>`,
};

/** All advanced animation presets */
export const ADVANCED_PRESETS: AnimationPreset[] = [
    ELASTIC_BOUNCE_PRESET,
    SQUASH_BOUNCE_PRESET,
    ORBIT_PRESET,
    SPIRAL_PRESET,
    RUBBER_BAND_PRESET,
    BREATHING_GLOW_PRESET,
    MORPH_SCALE_PRESET,
];

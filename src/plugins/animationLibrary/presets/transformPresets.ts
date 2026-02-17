import type { AnimationPreset } from '../types';

/**
 * Transform Effect Animations
 * Advanced transform-based effects: flips, skews, tilts, and elastic movements
 */

/**
 * Flip X animation - 3D-like horizontal flip
 */
export const FLIP_X_PRESET: AnimationPreset = {
    id: 'preset-flip-x',
    name: 'Flip X',
    description: '3D-like flip on horizontal axis',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.2 1; 0.4 0 0.2 1',
            values: '1 1; 1 0; 1 1',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="10" width="20" height="20" rx="2" fill="#673ab7">
      <animateTransform attributeName="transform" type="scale" dur="1.2s" repeatCount="indefinite"
        values="1 1; 1 0; 1 1" keyTimes="0;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
    </rect>
  </svg>`,
};

/**
 * Flip Y animation - 3D-like vertical flip
 */
export const FLIP_Y_PRESET: AnimationPreset = {
    id: 'preset-flip-y',
    name: 'Flip Y',
    description: '3D-like flip on vertical axis',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.2 1; 0.4 0 0.2 1',
            values: '1 1; 0 1; 1 1',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="10" width="20" height="20" rx="2" fill="#673ab7">
      <animateTransform attributeName="transform" type="scale" dur="1.2s" repeatCount="indefinite"
        values="1 1; 0 1; 1 1" keyTimes="0;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
    </rect>
  </svg>`,
};

/**
 * Flip 3D animation - continuous 3D-like flip loop
 */
export const FLIP_3D_PRESET: AnimationPreset = {
    id: 'preset-flip-3d',
    name: 'Flip 3D',
    description: 'Continuous 3D-like flip animation',
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
            calcMode: 'linear',
            keyTimes: '0;0.25;0.5;0.75;1',
            values: '1 1; 0 1; 1 1; 0 1; 1 1',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="10" width="20" height="20" rx="2" fill="#673ab7">
      <animateTransform attributeName="transform" type="scale" dur="2s" repeatCount="indefinite"
        values="1 1; 0 1; 1 1; 0 1; 1 1" keyTimes="0;0.25;0.5;0.75;1" additive="sum"/>
    </rect>
  </svg>`,
};

/**
 * Skew Loop animation - continuous skewing motion
 */
export const SKEW_LOOP_PRESET: AnimationPreset = {
    id: 'preset-skew-loop',
    name: 'Skew Loop',
    description: 'Continuous horizontal skewing motion',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'skewX',
            attributeName: 'transform',
            dur: '2s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.33;0.66;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0; 10; -10; 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="12" width="20" height="16" rx="2" fill="#00bcd4">
      <animateTransform attributeName="transform" type="skewX" dur="2s" repeatCount="indefinite"
        values="0; 8; -8; 0" keyTimes="0;0.33;0.66;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </rect>
  </svg>`,
};

/**
 * Skew Shake animation - rapid skew trembling
 */
export const SKEW_SHAKE_PRESET: AnimationPreset = {
    id: 'preset-skew-shake',
    name: 'Skew Shake',
    description: 'Rapid skewing trembling effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'skewX',
            attributeName: 'transform',
            dur: '0.3s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            keyTimes: '0;0.33;0.66;1',
            values: '0; 3; -3; 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="12" width="20" height="16" rx="2" fill="#ff5722">
      <animateTransform attributeName="transform" type="skewX" dur="0.3s" repeatCount="indefinite"
        values="0; 3; -3; 0" keyTimes="0;0.33;0.66;1" additive="sum"/>
    </rect>
  </svg>`,
};

/**
 * Tilt animation - gentle tilting motion
 */
export const TILT_PRESET: AnimationPreset = {
    id: 'preset-tilt',
    name: 'Tilt',
    description: 'Gentle tilting back and forth',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'skewX',
            attributeName: 'transform',
            dur: '3s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0; 15; 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="10" width="16" height="20" rx="2" fill="#ff9800">
      <animateTransform attributeName="transform" type="skewX" dur="3s" repeatCount="indefinite"
        values="0; 12; 0" keyTimes="0;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </rect>
  </svg>`,
};

/**
 * Pendulum animation - smooth pendulum swing
 */
export const PENDULUM_PRESET: AnimationPreset = {
    id: 'preset-pendulum',
    name: 'Pendulum',
    description: 'Smooth pendulum-like swinging motion',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '3s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95',
            values: '30; -30; 30',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <line x1="20" y1="5" x2="20" y2="25" stroke="#795548" stroke-width="2">
      <animateTransform attributeName="transform" type="rotate" dur="3s" repeatCount="indefinite"
        values="25 20 5; -25 20 5; 25 20 5" calcMode="spline" additive="sum"
        keyTimes="0;0.5;1" keySplines="0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95"/>
    </line>
    <circle cx="20" cy="28" r="6" fill="#795548">
      <animateTransform attributeName="transform" type="rotate" dur="3s" repeatCount="indefinite"
        values="25 20 5; -25 20 5; 25 20 5" calcMode="spline" additive="sum"
        keyTimes="0;0.5;1" keySplines="0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95"/>
    </circle>
  </svg>`,
};

/**
 * Ringing Bell animation - bell-like ringing motion
 */
export const RINGING_BELL_PRESET: AnimationPreset = {
    id: 'preset-ringing-bell',
    name: 'Ringing Bell',
    description: 'Bell-like ringing motion with decreasing amplitude',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '2s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            keyTimes: '0;0.15;0.3;0.45;0.6;0.75;0.9;1',
            values: '0; 25; -25; 20; -20; 15; -15; 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <path d="M15 28 L20 10 L25 28 Z" fill="#ffc107">
      <animateTransform attributeName="transform" type="rotate" dur="2s" repeatCount="indefinite"
        values="0 20 28; 20 20 28; -20 20 28; 15 20 28; -15 20 28; 10 20 28; -10 20 28; 0 20 28"
        keyTimes="0;0.15;0.3;0.45;0.6;0.75;0.9;1" additive="sum"/>
    </path>
    <circle cx="20" cy="30" r="3" fill="#ffc107">
      <animateTransform attributeName="transform" type="rotate" dur="2s" repeatCount="indefinite"
        values="0 20 28; 20 20 28; -20 20 28; 15 20 28; -15 20 28; 10 20 28; -10 20 28; 0 20 28"
        keyTimes="0;0.15;0.3;0.45;0.6;0.75;0.9;1" additive="sum"/>
    </circle>
  </svg>`,
};

/**
 * Vibrate animation - rapid micro-movements
 */
export const VIBRATE_PRESET: AnimationPreset = {
    id: 'preset-vibrate',
    name: 'Vibrate',
    description: 'Rapid micro-vibration effect',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.05s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            keyTimes: '0;0.25;0.5;0.75;1',
            values: '-2 0; 2 0; -2 0; 2 0; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="3" fill="#e91e63">
      <animateTransform attributeName="transform" type="translate" dur="0.08s" repeatCount="indefinite"
        values="-1 0; 1 0; -1 0; 1 0; 0 0" keyTimes="0;0.25;0.5;0.75;1" additive="sum"/>
    </rect>
  </svg>`,
};

/**
 * Jello X animation - jelly-like horizontal squash
 */
export const JELLO_X_PRESET: AnimationPreset = {
    id: 'preset-jello-x',
    name: 'Jello X',
    description: 'Jelly-like horizontal squash and stretch',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'skewX',
            attributeName: 'transform',
            dur: '1s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            keyTimes: '0;0.111;0.222;0.333;0.444;0.555;0.666;1',
            values: '0; -12.5; 6.25; -3.125; 1.5625; -0.78125; 0.390625; 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="20" rx="12" ry="10" fill="#8bc34a">
      <animateTransform attributeName="transform" type="skewX" dur="1s" repeatCount="indefinite"
        values="0; -10; 5; -2.5; 1.25; -0.6; 0.3; 0"
        keyTimes="0;0.111;0.222;0.333;0.444;0.555;0.666;1" additive="sum"/>
    </ellipse>
  </svg>`,
};

/**
 * Jello Y animation - jelly-like vertical squash
 */
export const JELLO_Y_PRESET: AnimationPreset = {
    id: 'preset-jello-y',
    name: 'Jello Y',
    description: 'Jelly-like vertical squash and stretch',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'skewY',
            attributeName: 'transform',
            dur: '1s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            keyTimes: '0;0.111;0.222;0.333;0.444;0.555;0.666;1',
            values: '0; -12.5; 6.25; -3.125; 1.5625; -0.78125; 0.390625; 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="20" rx="10" ry="12" fill="#8bc34a">
      <animateTransform attributeName="transform" type="skewY" dur="1s" repeatCount="indefinite"
        values="0; -10; 5; -2.5; 1.25; -0.6; 0.3; 0"
        keyTimes="0;0.111;0.222;0.333;0.444;0.555;0.666;1" additive="sum"/>
    </ellipse>
  </svg>`,
};

/**
 * Wiggle animation - playful wiggling motion
 */
export const WIGGLE_PRESET: AnimationPreset = {
    id: 'preset-wiggle',
    name: 'Wiggle',
    description: 'Playful wiggling motion combining rotation and translation',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '0.8s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.2;0.4;0.6;0.8;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0; -5; 5; -3; 3; 0',
            additive: 'sum',
            fill: 'freeze',
        },
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.8s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.2;0.4;0.6;0.8;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0 0; -3 0; 3 0; -2 0; 2 0; 0 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="20" rx="10" ry="12" fill="#03a9f4">
      <animateTransform attributeName="transform" type="rotate" dur="0.8s" repeatCount="indefinite"
        values="0 20 20; -5 20 20; 5 20 20; -3 20 20; 3 20 20; 0 20 20"
        keyTimes="0;0.2;0.4;0.6;0.8;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
      <animateTransform attributeName="transform" type="translate" dur="0.8s" repeatCount="indefinite"
        values="0 0; -2 0; 2 0; -1 0; 1 0; 0 0"
        keyTimes="0;0.2;0.4;0.6;0.8;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </ellipse>
  </svg>`,
};

/**
 * Tada animation - attention-grabbing celebration effect
 */
export const TADA_PRESET: AnimationPreset = {
    id: 'preset-tada',
    name: 'Tada',
    description: 'Attention-grabbing celebration effect',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '1s',
            repeatCount: 1,
            calcMode: 'linear',
            keyTimes: '0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1',
            values: '1 1; 0.9 0.9; 0.9 0.9; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1 1',
            additive: 'sum',
            fill: 'freeze',
        },
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '1s',
            repeatCount: 1,
            calcMode: 'linear',
            keyTimes: '0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1',
            values: '0; -3; -3; 3; -3; 3; -3; 3; -3; 3; 0',
            additive: 'sum',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <polygon points="20,6 24,16 35,16 26,22 29,33 20,26 11,33 14,22 5,16 16,16" fill="#ffc107">
      <animateTransform attributeName="transform" type="scale" dur="1s" repeatCount="indefinite"
        values="1 1; 0.9 0.9; 0.9 0.9; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1.1 1.1; 1 1"
        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1" additive="sum"/>
      <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite"
        values="0 20 20; -3 20 20; -3 20 20; 3 20 20; -3 20 20; 3 20 20; -3 20 20; 3 20 20; -3 20 20; 3 20 20; 0 20 20"
        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1" additive="sum"/>
    </polygon>
  </svg>`,
};

/** All transform effect animation presets */
export const TRANSFORM_PRESETS: AnimationPreset[] = [
    FLIP_X_PRESET,
    FLIP_Y_PRESET,
    FLIP_3D_PRESET,
    SKEW_LOOP_PRESET,
    SKEW_SHAKE_PRESET,
    TILT_PRESET,
    PENDULUM_PRESET,
    RINGING_BELL_PRESET,
    VIBRATE_PRESET,
    JELLO_X_PRESET,
    JELLO_Y_PRESET,
    WIGGLE_PRESET,
    TADA_PRESET,
];

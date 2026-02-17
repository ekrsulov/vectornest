import type { AnimationPreset } from '../types';

/**
 * Entrance & Exit Animations
 * Animations for elements entering or leaving the scene
 */

/**
 * Fade Out animation
 */
export const FADE_OUT_PRESET: AnimationPreset = {
    id: 'preset-fade-out',
    name: 'Fade Out',
    description: 'Fade out to transparent',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '2s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keySplines: '0.4 0 0.2 1',
            keyTimes: '0;1',
            from: '1',
            to: '0',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="#3d5afe">
      <animate attributeName="opacity" dur="1.5s" repeatCount="indefinite"
        values="1;0;1" keyTimes="0;0.5;1" calcMode="spline"
        keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
    </circle>
  </svg>`,
};

/**
 * Pop In animation - scale from 0 with overshoot
 */
export const POP_IN_PRESET: AnimationPreset = {
    id: 'preset-pop-in',
    name: 'Pop In',
    description: 'Elastic pop entrance with bounce overshoot',
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
            keyTimes: '0;0.5;0.7;1',
            keySplines: '0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1',
            values: '0 0; 1.2 1.2; 0.95 0.95; 1 1',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="10" fill="#4caf50">
      <animateTransform attributeName="transform" type="translate" dur="1s" repeatCount="indefinite"
        values="0 0; -2 -2; 0 0; -2 -2" keyTimes="0;0.3;0.5;1" additive="sum"/>
      <animateTransform attributeName="transform" type="scale" dur="1s" repeatCount="indefinite"
        values="0 0; 1.2 1.2; 1 1; 0 0" keyTimes="0;0.3;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1"/>
    </circle>
  </svg>`,
};

/**
 * Pop Out animation - scale to 0 with anticipation
 */
export const POP_OUT_PRESET: AnimationPreset = {
    id: 'preset-pop-out',
    name: 'Pop Out',
    description: 'Elastic pop exit with slight anticipation',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '0.5s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;0.3;1',
            keySplines: '0.4 0 1 1; 0.4 0 1 1',
            values: '1 1; 1.1 1.1; 0 0',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="10" fill="#f44336">
      <animateTransform attributeName="transform" type="scale" dur="1s" repeatCount="indefinite"
        values="1 1; 1.1 1.1; 0 0; 1 1" keyTimes="0;0.2;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 1 1; 0.4 0 1 1; 0.25 0.1 0.25 1"/>
    </circle>
  </svg>`,
};

/**
 * Slide In Left animation
 */
export const SLIDE_IN_LEFT_PRESET: AnimationPreset = {
    id: 'preset-slide-in-left',
    name: 'Slide In Left',
    description: 'Enter from the left side',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.25 0.46 0.45 0.94',
            from: '-100 0',
            to: '0 0',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="3" fill="#2196f3">
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="-20 0; 0 0; 0 0; -20 0" keyTimes="0;0.3;0.7;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19"/>
    </rect>
  </svg>`,
};

/**
 * Slide In Right animation
 */
export const SLIDE_IN_RIGHT_PRESET: AnimationPreset = {
    id: 'preset-slide-in-right',
    name: 'Slide In Right',
    description: 'Enter from the right side',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.25 0.46 0.45 0.94',
            from: '100 0',
            to: '0 0',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="3" fill="#2196f3">
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="20 0; 0 0; 0 0; 20 0" keyTimes="0;0.3;0.7;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19"/>
    </rect>
  </svg>`,
};

/**
 * Slide Out Left animation
 */
export const SLIDE_OUT_LEFT_PRESET: AnimationPreset = {
    id: 'preset-slide-out-left',
    name: 'Slide Out Left',
    description: 'Exit to the left side',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.55 0.055 0.675 0.19',
            from: '0 0',
            to: '-100 0',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="3" fill="#ff5722">
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="0 0; 0 0; -20 0; 0 0" keyTimes="0;0.3;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19; 0.25 0.46 0.45 0.94"/>
    </rect>
  </svg>`,
};

/**
 * Slide Out Right animation
 */
export const SLIDE_OUT_RIGHT_PRESET: AnimationPreset = {
    id: 'preset-slide-out-right',
    name: 'Slide Out Right',
    description: 'Exit to the right side',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.55 0.055 0.675 0.19',
            from: '0 0',
            to: '100 0',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="3" fill="#ff5722">
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="0 0; 0 0; 20 0; 0 0" keyTimes="0;0.3;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19; 0.25 0.46 0.45 0.94"/>
    </rect>
  </svg>`,
};

/**
 * Slide In Top animation
 */
export const SLIDE_IN_TOP_PRESET: AnimationPreset = {
    id: 'preset-slide-in-top',
    name: 'Slide In Top',
    description: 'Enter from the top',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.25 0.46 0.45 0.94',
            from: '0 -100',
            to: '0 0',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="3" fill="#9c27b0">
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="0 -20; 0 0; 0 0; 0 -20" keyTimes="0;0.3;0.7;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19"/>
    </rect>
  </svg>`,
};

/**
 * Slide In Bottom animation
 */
export const SLIDE_IN_BOTTOM_PRESET: AnimationPreset = {
    id: 'preset-slide-in-bottom',
    name: 'Slide In Bottom',
    description: 'Enter from the bottom',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.25 0.46 0.45 0.94',
            from: '0 100',
            to: '0 0',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="3" fill="#9c27b0">
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="0 20; 0 0; 0 0; 0 20" keyTimes="0;0.3;0.7;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19"/>
    </rect>
  </svg>`,
};

/**
 * Slide Out Top animation
 */
export const SLIDE_OUT_TOP_PRESET: AnimationPreset = {
    id: 'preset-slide-out-top',
    name: 'Slide Out Top',
    description: 'Exit to the top',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.55 0.055 0.675 0.19',
            from: '0 0',
            to: '0 -100',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="3" fill="#e91e63">
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="0 0; 0 0; 0 -20; 0 0" keyTimes="0;0.3;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19; 0.25 0.46 0.45 0.94"/>
    </rect>
  </svg>`,
};

/**
 * Slide Out Bottom animation
 */
export const SLIDE_OUT_BOTTOM_PRESET: AnimationPreset = {
    id: 'preset-slide-out-bottom',
    name: 'Slide Out Bottom',
    description: 'Exit to the bottom',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.55 0.055 0.675 0.19',
            from: '0 0',
            to: '0 100',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="3" fill="#e91e63">
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="0 0; 0 0; 0 20; 0 0" keyTimes="0;0.3;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19; 0.25 0.46 0.45 0.94"/>
    </rect>
  </svg>`,
};

/** All entrance/exit animation presets */
export const ENTRANCE_EXIT_PRESETS: AnimationPreset[] = [
    FADE_OUT_PRESET,
    POP_IN_PRESET,
    POP_OUT_PRESET,
    SLIDE_IN_LEFT_PRESET,
    SLIDE_IN_RIGHT_PRESET,
    SLIDE_OUT_LEFT_PRESET,
    SLIDE_OUT_RIGHT_PRESET,
    SLIDE_IN_TOP_PRESET,
    SLIDE_IN_BOTTOM_PRESET,
    SLIDE_OUT_TOP_PRESET,
    SLIDE_OUT_BOTTOM_PRESET,
];

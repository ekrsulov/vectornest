import type { AnimationPreset } from '../types';

/**
 * Special Entrance & Exit Animations
 * Advanced entrance/exit effects beyond basic slides and fades
 */

/**
 * Roll In animation - rotate while entering
 */
export const ROLL_IN_PRESET: AnimationPreset = {
    id: 'preset-roll-in',
    name: 'Roll In',
    description: 'Enter with a rolling rotation',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.25 0.46 0.45 0.94',
            from: '-120',
            to: '0',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="10" width="20" height="20" rx="2" fill="#3f51b5">
      <animateTransform attributeName="transform" type="rotate" dur="1.2s" repeatCount="indefinite"
        values="-120 20 20; 0 20 20; 0 20 20; -120 20 20" keyTimes="0;0.4;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19"/>
    </rect>
  </svg>`,
};

/**
 * Roll Out animation - rotate while exiting
 */
export const ROLL_OUT_PRESET: AnimationPreset = {
    id: 'preset-roll-out',
    name: 'Roll Out',
    description: 'Exit with a rolling rotation',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'rotate',
            attributeName: 'transform',
            dur: '0.6s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.55 0.055 0.675 0.19',
            from: '0',
            to: '120',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="10" width="20" height="20" rx="2" fill="#3f51b5">
      <animateTransform attributeName="transform" type="rotate" dur="1.2s" repeatCount="indefinite"
        values="0 20 20; 0 20 20; 120 20 20; 0 20 20" keyTimes="0;0.3;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19; 0.25 0.46 0.45 0.94"/>
    </rect>
  </svg>`,
};

/**
 * Expand Width animation - horizontal reveal
 */
export const EXPAND_WIDTH_PRESET: AnimationPreset = {
    id: 'preset-expand-width',
    name: 'Expand Width',
    description: 'Reveal by expanding horizontally from center',
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
            keyTimes: '0;1',
            keySplines: '0.23 1 0.32 1',
            from: '0 1',
            to: '1 1',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="5" y="12" width="30" height="16" rx="2" fill="#009688">
      <animateTransform attributeName="transform" type="scale" dur="1.2s" repeatCount="indefinite"
        values="0 1; 1 1; 1 1; 0 1" keyTimes="0;0.4;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.23 1 0.32 1; 0.23 1 0.32 1; 0.55 0.055 0.675 0.19"/>
    </rect>
  </svg>`,
};

/**
 * Expand Height animation - vertical reveal
 */
export const EXPAND_HEIGHT_PRESET: AnimationPreset = {
    id: 'preset-expand-height',
    name: 'Expand Height',
    description: 'Reveal by expanding vertically from center',
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
            keyTimes: '0;1',
            keySplines: '0.23 1 0.32 1',
            from: '1 0',
            to: '1 1',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="5" width="16" height="30" rx="2" fill="#009688">
      <animateTransform attributeName="transform" type="scale" dur="1.2s" repeatCount="indefinite"
        values="1 0; 1 1; 1 1; 1 0" keyTimes="0;0.4;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.23 1 0.32 1; 0.23 1 0.32 1; 0.55 0.055 0.675 0.19"/>
    </rect>
  </svg>`,
};

/**
 * Expand Both animation - uniform reveal from center
 */
export const EXPAND_BOTH_PRESET: AnimationPreset = {
    id: 'preset-expand-both',
    name: 'Expand Both',
    description: 'Reveal by expanding in both directions from center',
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
            keyTimes: '0;1',
            keySplines: '0.175 0.885 0.32 1',
            from: '0 0',
            to: '1 1',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="14" fill="#009688">
      <animateTransform attributeName="transform" type="scale" dur="1.2s" repeatCount="indefinite"
        values="0 0; 1 1; 1 1; 0 0" keyTimes="0;0.4;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.175 0.885 0.32 1; 0.175 0.885 0.32 1; 0.55 0.055 0.675 0.19"/>
    </circle>
  </svg>`,
};

/**
 * Vanish animation - quick disappearance with scale
 */
export const VANISH_PRESET: AnimationPreset = {
    id: 'preset-vanish',
    name: 'Vanish',
    description: 'Quick disappearance with scale and fade',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '0.3s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.55 0.055 0.675 0.19',
            from: '1 1',
            to: '0 0',
            additive: 'sum',
        },
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '0.3s',
            fill: 'freeze',
            repeatCount: 1,
            from: '1',
            to: '0',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="#607d8b">
      <animateTransform attributeName="transform" type="scale" dur="1s" repeatCount="indefinite"
        values="1 1; 1 1; 0 0; 1 1" keyTimes="0;0.3;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.55 0.055 0.675 0.19; 0.25 0.46 0.45 0.94"/>
      <animate attributeName="opacity" dur="1s" repeatCount="indefinite"
        values="1;1;0;1" keyTimes="0;0.3;0.5;1"/>
    </circle>
  </svg>`,
};

/**
 * Melt Down animation - melting effect downward
 */
export const MELT_DOWN_PRESET: AnimationPreset = {
    id: 'preset-melt-down',
    name: 'Melt Down',
    description: 'Melting effect that collapses downward',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '2s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;0.4;0.7;1',
            keySplines: '0.55 0.055 0.675 0.19; 0.55 0.055 0.675 0.19; 0.55 0.055 0.675 0.19',
            values: '1 1; 1.1 0.4; 1.2 0.1; 0 0',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="20" rx="12" ry="10" fill="#795548">
      <animateTransform attributeName="transform" type="scale" dur="2s" repeatCount="indefinite"
        values="1 1; 1.1 0.4; 1.2 0.1; 0 0; 1 1" keyTimes="0;0.3;0.5;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.55 0.055 0.675 0.19; 0.55 0.055 0.675 0.19; 0.55 0.055 0.675 0.19; 0.25 0.46 0.45 0.94"/>
    </ellipse>
  </svg>`,
};

/**
 * Evaporate Up animation - rising and fading out
 */
export const EVAPORATE_UP_PRESET: AnimationPreset = {
    id: 'preset-evaporate-up',
    name: 'Evaporate Up',
    description: 'Rise upward while fading out',
    targetType: 'any',
    preset: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'translate',
            attributeName: 'transform',
            dur: '2s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;0.3;0.7;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
            values: '0 0; 0 -20; 0 -50; 0 -100',
            additive: 'sum',
        },
        {
            type: 'animate',
            attributeName: 'opacity',
            dur: '2s',
            fill: 'freeze',
            repeatCount: 1,
            values: '1; 0.8; 0.3; 0',
            keyTimes: '0;0.3;0.7;1',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="28" r="8" fill="#90a4ae">
      <animateTransform attributeName="transform" type="translate" dur="2s" repeatCount="indefinite"
        values="0 0; 0 -15; 0 -30; 0 0" keyTimes="0;0.3;0.5;1" additive="sum"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
      <animate attributeName="opacity" dur="2s" repeatCount="indefinite"
        values="1; 0.6; 0; 1" keyTimes="0;0.3;0.5;1"/>
    </circle>
  </svg>`,
};

/**
 * Door Open animation - opening door effect
 */
export const DOOR_OPEN_PRESET: AnimationPreset = {
    id: 'preset-door-open',
    name: 'Door Open',
    description: 'Door opening effect from side',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '0.8s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.25 0.46 0.45 0.94',
            from: '1 1',
            to: '0 1',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="8" y="8" width="24" height="24" rx="1" fill="#5d4037">
      <animateTransform attributeName="transform" type="scale" dur="1.5s" repeatCount="indefinite"
        values="1 1; 0 1; 0 1; 1 1" keyTimes="0;0.4;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94"/>
    </rect>
  </svg>`,
};

/**
 * Door Close animation - closing door effect
 */
export const DOOR_CLOSE_PRESET: AnimationPreset = {
    id: 'preset-door-close',
    name: 'Door Close',
    description: 'Door closing effect from side',
    targetType: 'any',
    preset: true,
    centeredScale: true,
    animations: [
        {
            type: 'animateTransform',
            transformType: 'scale',
            attributeName: 'transform',
            dur: '0.8s',
            fill: 'freeze',
            repeatCount: 1,
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.25 0.46 0.45 0.94',
            from: '0 1',
            to: '1 1',
            additive: 'sum',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="8" y="8" width="24" height="24" rx="1" fill="#5d4037">
      <animateTransform attributeName="transform" type="scale" dur="1.5s" repeatCount="indefinite"
        values="0 1; 1 1; 1 1; 0 1" keyTimes="0;0.4;0.6;1" additive="sum"
        calcMode="spline" keySplines="0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94"/>
    </rect>
  </svg>`,
};

/** All special entrance/exit animation presets */
export const SPECIAL_PRESETS: AnimationPreset[] = [
    ROLL_IN_PRESET,
    ROLL_OUT_PRESET,
    EXPAND_WIDTH_PRESET,
    EXPAND_HEIGHT_PRESET,
    EXPAND_BOTH_PRESET,
    VANISH_PRESET,
    MELT_DOWN_PRESET,
    EVAPORATE_UP_PRESET,
    DOOR_OPEN_PRESET,
    DOOR_CLOSE_PRESET,
];

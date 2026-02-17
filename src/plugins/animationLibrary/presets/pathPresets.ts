import type { AnimationPreset } from '../types';

/**
 * Path Animations
 * These animations are specifically designed for path elements
 */

/**
 * Path Draw animation - progressive path drawing
 */
export const PATH_DRAW_PRESET: AnimationPreset = {
    id: 'preset-path-draw',
    name: 'Draw',
    description: 'Progressively draws the path from start to end.',
    targetType: 'path',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'stroke-dashoffset',
            dur: '3s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            values: 'DYNAMIC_PATH_LENGTH',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <path d="M 8,20 Q 14,8 20,20 T 32,20" fill="none" stroke="#4caf50" stroke-width="3" stroke-linecap="round"
          stroke-dasharray="50" stroke-dashoffset="50">
      <animate attributeName="stroke-dashoffset" dur="2s" repeatCount="indefinite"
        values="50;0" calcMode="linear"/>
    </path>
  </svg>`,
};

/**
 * Stroke Width Pulse animation - pulsating stroke
 */
export const STROKE_WIDTH_PULSE_PRESET: AnimationPreset = {
    id: 'preset-stroke-width-pulse',
    name: 'Stroke Pulse',
    description: 'Stroke width pulses between thin and thick.',
    targetType: 'path',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'stroke-width',
            dur: '2s',
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keyTimes: '0;0.5;1',
            keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
            values: 'DYNAMIC_STROKE_WIDTH',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="none" stroke="#ff9800" stroke-width="2">
      <animate attributeName="stroke-width" dur="2s" repeatCount="indefinite"
        values="2;6;2" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </circle>
  </svg>`,
};

/**
 * Path Draw Slow animation - slow progressive path drawing
 */
export const PATH_DRAW_SLOW_PRESET: AnimationPreset = {
    id: 'preset-path-draw-slow',
    name: 'Draw Slow',
    description: 'Slowly draws the path from start to end.',
    targetType: 'path',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'stroke-dashoffset',
            dur: '5s',
            repeatCount: 1,
            fill: 'freeze',
            calcMode: 'spline',
            keyTimes: '0;1',
            keySplines: '0.4 0 0.2 1',
            values: 'DYNAMIC_PATH_LENGTH',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <path d="M 8,20 Q 14,8 20,20 T 32,20" fill="none" stroke="#2196f3" stroke-width="3" stroke-linecap="round"
          stroke-dasharray="50" stroke-dashoffset="50">
      <animate attributeName="stroke-dashoffset" dur="4s" repeatCount="indefinite"
        values="50;0;50" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
    </path>
  </svg>`,
};

/**
 * Dash March animation - marching dash pattern
 */
export const DASH_MARCH_PRESET: AnimationPreset = {
    id: 'preset-dash-march',
    name: 'Dash March',
    description: 'Dashes march along the path continuously.',
    targetType: 'path',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'stroke-dashoffset',
            dur: '1s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            from: '0',
            to: '20',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="none" stroke="#e91e63" stroke-width="2"
            stroke-dasharray="8 4">
      <animate attributeName="stroke-dashoffset" dur="1s" repeatCount="indefinite"
        from="0" to="24"/>
    </circle>
  </svg>`,
};

/**
 * Dash Cycle animation - cycling dash pattern changes
 */
export const DASH_CYCLE_PRESET: AnimationPreset = {
    id: 'preset-dash-cycle',
    name: 'Dash Cycle',
    description: 'Dash pattern cycles between different styles.',
    targetType: 'path',
    preset: true,
    animations: [
        {
            type: 'animate',
            attributeName: 'stroke-dasharray',
            dur: '4s',
            repeatCount: 'indefinite',
            calcMode: 'linear',
            values: '1 1; 10 2; 5 5; 1 1',
            keyTimes: '0;0.33;0.66;1',
            fill: 'freeze',
        },
    ],
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="none" stroke="#9c27b0" stroke-width="2"
            stroke-dasharray="1 1">
      <animate attributeName="stroke-dasharray" dur="4s" repeatCount="indefinite"
        values="1 1; 10 2; 5 5; 1 1" keyTimes="0;0.33;0.66;1"/>
    </circle>
  </svg>`,
};

/** All path animation presets */
export const PATH_PRESETS: AnimationPreset[] = [
    PATH_DRAW_PRESET,
    PATH_DRAW_SLOW_PRESET,
    STROKE_WIDTH_PULSE_PRESET,
    DASH_MARCH_PRESET,
    DASH_CYCLE_PRESET,
];

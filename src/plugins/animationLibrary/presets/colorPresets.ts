import type { AnimationPreset } from '../types';

/**
 * Color Effect Animations
 * Color and opacity-based visual effects
 */

/**
 * Rainbow Fill animation - cycling rainbow colors on fill
 */
const RAINBOW_FILL_PRESET: AnimationPreset = {
  id: 'preset-rainbow-fill',
  name: 'Rainbow Fill',
  description: 'Fill color cycles through rainbow spectrum',
  targetType: 'any',
  preset: true,
  preserveColors: true,
  animations: [
    {
      type: 'animate',
      attributeName: 'fill',
      dur: '6s',
      repeatCount: 'indefinite',
      calcMode: 'linear',
      values: '#ff0000; #ff7f00; #ffff00; #00ff00; #0000ff; #4b0082; #9400d3; #ff0000',
      keyTimes: '0;0.14;0.28;0.42;0.56;0.7;0.84;1',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="14" fill="#ff0000">
      <animate attributeName="fill" dur="3s" repeatCount="indefinite"
        values="#ff0000;#ff7f00;#ffff00;#00ff00;#0000ff;#9400d3;#ff0000"
        keyTimes="0;0.16;0.33;0.5;0.66;0.83;1"/>
    </circle>
  </svg>`,
};

/**
 * Rainbow Stroke animation - cycling rainbow colors on stroke
 */
const RAINBOW_STROKE_PRESET: AnimationPreset = {
  id: 'preset-rainbow-stroke',
  name: 'Rainbow Stroke',
  description: 'Stroke color cycles through rainbow spectrum',
  targetType: 'any',
  preset: true,
  preserveColors: true,
  animations: [
    {
      type: 'animate',
      attributeName: 'stroke',
      dur: '6s',
      repeatCount: 'indefinite',
      calcMode: 'linear',
      values: '#ff0000; #ff7f00; #ffff00; #00ff00; #0000ff; #4b0082; #9400d3; #ff0000',
      keyTimes: '0;0.14;0.28;0.42;0.56;0.7;0.84;1',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="none" stroke="#ff0000" stroke-width="4">
      <animate attributeName="stroke" dur="3s" repeatCount="indefinite"
        values="#ff0000;#ff7f00;#ffff00;#00ff00;#0000ff;#9400d3;#ff0000"
        keyTimes="0;0.16;0.33;0.5;0.66;0.83;1"/>
    </circle>
  </svg>`,
};

/**
 * Color Flash Red animation - urgent red flashing
 */
const COLOR_FLASH_RED_PRESET: AnimationPreset = {
  id: 'preset-color-flash-red',
  name: 'Flash Red',
  description: 'Urgent red color flashing effect',
  targetType: 'any',
  preset: true,
  preserveColors: true,
  animations: [
    {
      type: 'animate',
      attributeName: 'fill',
      dur: '0.3s',
      repeatCount: 'indefinite',
      calcMode: 'discrete',
      values: '#ff0000; #990000; #ff0000',
      keyTimes: '0;0.5;1',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="#ff0000">
      <animate attributeName="fill" dur="0.3s" repeatCount="indefinite"
        values="#ff0000;#990000;#ff0000" keyTimes="0;0.5;1" calcMode="discrete"/>
    </circle>
  </svg>`,
};

/**
 * Color Flash White animation - bright white flash
 */
const COLOR_FLASH_WHITE_PRESET: AnimationPreset = {
  id: 'preset-color-flash-white',
  name: 'Flash White',
  description: 'Bright white flash effect',
  targetType: 'any',
  preset: true,
  preserveColors: true,
  animations: [
    {
      type: 'animate',
      attributeName: 'fill',
      dur: '0.5s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keySplines: '0.4 0 0.2 1; 0.4 0 0.2 1',
      values: 'currentColor; #ffffff; currentColor',
      keyTimes: '0;0.5;1',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="#3d5afe">
      <animate attributeName="fill" dur="0.5s" repeatCount="indefinite"
        values="#3d5afe;#ffeb3b;#3d5afe" keyTimes="0;0.5;1"
        calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
    </circle>
  </svg>`,
};

/**
 * Opacity Pulse animation - pulsating opacity
 */
const OPACITY_PULSE_PRESET: AnimationPreset = {
  id: 'preset-opacity-pulse',
  name: 'Opacity Pulse',
  description: 'Smooth opacity pulsation',
  targetType: 'any',
  preset: true,
  preserveColors: true,
  animations: [
    {
      type: 'animate',
      attributeName: 'opacity',
      dur: '2s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
      values: '1; 0.3; 1',
      keyTimes: '0;0.5;1',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="#00bcd4">
      <animate attributeName="opacity" dur="2s" repeatCount="indefinite"
        values="1;0.3;1" keyTimes="0;0.5;1"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </circle>
  </svg>`,
};

/**
 * Fill Fade Pulse animation - fill opacity pulsation
 */
const FILL_FADE_PULSE_PRESET: AnimationPreset = {
  id: 'preset-fill-fade-pulse',
  name: 'Fill Fade Pulse',
  description: 'Fill opacity fades in and out',
  targetType: 'any',
  preset: true,
  preserveColors: true,
  animations: [
    {
      type: 'animate',
      attributeName: 'fill-opacity',
      dur: '3s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
      values: '1; 0.2; 1',
      keyTimes: '0;0.5;1',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="8" y="8" width="24" height="24" rx="4" fill="#4caf50" stroke="#4caf50" stroke-width="2">
      <animate attributeName="fill-opacity" dur="3s" repeatCount="indefinite"
        values="1;0.2;1" keyTimes="0;0.5;1"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </rect>
  </svg>`,
};

/**
 * Stroke Fade Pulse animation - stroke opacity pulsation
 */
const STROKE_FADE_PULSE_PRESET: AnimationPreset = {
  id: 'preset-stroke-fade-pulse',
  name: 'Stroke Fade Pulse',
  description: 'Stroke opacity fades in and out',
  targetType: 'any',
  preset: true,
  preserveColors: true,
  animations: [
    {
      type: 'animate',
      attributeName: 'stroke-opacity',
      dur: '3s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
      values: '1; 0.2; 1',
      keyTimes: '0;0.5;1',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="none" stroke="#ff9800" stroke-width="4">
      <animate attributeName="stroke-opacity" dur="3s" repeatCount="indefinite"
        values="1;0.2;1" keyTimes="0;0.5;1"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </circle>
  </svg>`,
};

/**
 * Synthwave Color animation - retro synthwave color cycling
 */
const SYNTHWAVE_COLOR_PRESET: AnimationPreset = {
  id: 'preset-synthwave-color',
  name: 'Synthwave',
  description: 'Retro synthwave color cycling (magenta/cyan)',
  targetType: 'any',
  preset: true,
  preserveColors: true,
  animations: [
    {
      type: 'animate',
      attributeName: 'fill',
      dur: '3s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
      values: '#ff00ff; #00ffff; #ff00ff',
      keyTimes: '0;0.5;1',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="8" y="12" width="24" height="16" rx="2" fill="#ff00ff">
      <animate attributeName="fill" dur="3s" repeatCount="indefinite"
        values="#ff00ff;#00ffff;#ff00ff" keyTimes="0;0.5;1"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </rect>
  </svg>`,
};

/** All color effect animation presets */
export const COLOR_PRESETS: AnimationPreset[] = [
  RAINBOW_FILL_PRESET,
  RAINBOW_STROKE_PRESET,
  COLOR_FLASH_RED_PRESET,
  COLOR_FLASH_WHITE_PRESET,
  OPACITY_PULSE_PRESET,
  FILL_FADE_PULSE_PRESET,
  STROKE_FADE_PULSE_PRESET,
  SYNTHWAVE_COLOR_PRESET,
];

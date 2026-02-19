import type { AnimationPreset } from '../types';

/**
 * General Animations
 * These animations can be applied to any element type
 */

/**
 * Pulse animation - simple scale up and down
 */
const PULSE_PRESET: AnimationPreset = {
  id: 'preset-pulse',
  name: 'Pulse',
  description: 'Simple pulsing scale effect',
  targetType: 'any',
  preset: true,
  centeredScale: true,
  animations: [
    {
      type: 'animateTransform',
      transformType: 'scale',
      attributeName: 'transform',
      dur: '1.5s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keyTimes: '0;0.5;1',
      keySplines: '0.4 0 0.2 1; 0.4 0 0.2 1',
      values: '1 1; 1.15 1.15; 1 1',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="10" y="10" width="20" height="20" fill="#3d5afe" opacity="0.8">
      <animateTransform attributeName="transform" type="translate" dur="1.5s" repeatCount="indefinite"
        values="0 0; -3 -3; 0 0" calcMode="spline" additive="sum"
        keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
      <animateTransform attributeName="transform" type="scale" dur="1.5s" repeatCount="indefinite"
        values="1 1; 1.15 1.15; 1 1" calcMode="spline" additive="sum"
        keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
    </rect>
  </svg>`,
};

/**
 * Fade In animation
 */
const FADE_IN_PRESET: AnimationPreset = {
  id: 'preset-fade-in',
  name: 'Fade In',
  description: 'Fade in from transparent',
  targetType: 'any',
  preset: true,
  animations: [
    {
      type: 'animate',
      attributeName: 'opacity',
      dur: '4s',
      fill: 'freeze',
      repeatCount: 1,
      calcMode: 'spline',
      keySplines: '0.2 0 0.2 1',
      keyTimes: '0;1',
      from: '0',
      to: '1',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="#3d5afe">
      <animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" begin="0s"
        values="0;1;0" keyTimes="0;0.6;1" calcMode="spline"
        keySplines="0.2 0 0.2 1; 0.2 0 0.2 1"/>
    </circle>
  </svg>`,
};

/**
 * Breathing animation - smooth organic scale effect centered on the element
 */
const BREATHING_PRESET: AnimationPreset = {
  id: 'preset-breathing',
  name: 'Breathing',
  description: 'Smooth breathing effect that expands and contracts while staying centered.',
  targetType: 'any',
  preset: true,
  centeredScale: true,
  animations: [
    {
      type: 'animateTransform',
      transformType: 'scale',
      attributeName: 'transform',
      dur: '4s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keyTimes: '0;0.4;0.6;1',
      keySplines: '0.4 0 0.2 1; 0.2 0 0.4 1; 0.4 0 0.2 1',
      values: '1 1; 1.08 1.08; 1.06 1.06; 1 1',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="20" rx="14" ry="12" fill="#3d5afe" opacity="0.8">
      <animateTransform attributeName="transform" type="translate" dur="4s" repeatCount="indefinite"
        values="0 0; -1.6 -1.6; -1.2 -1.2; 0 0" calcMode="spline" additive="sum"
        keyTimes="0;0.4;0.6;1" keySplines="0.4 0 0.2 1; 0.2 0 0.4 1; 0.4 0 0.2 1"/>
      <animateTransform attributeName="transform" type="scale" dur="4s" repeatCount="indefinite"
        values="1 1; 1.08 1.08; 1.06 1.06; 1 1" calcMode="spline" additive="sum"
        keyTimes="0;0.4;0.6;1" keySplines="0.4 0 0.2 1; 0.2 0 0.4 1; 0.4 0 0.2 1"/>
    </ellipse>
  </svg>`,
};

/**
 * Heartbeat animation - double pulse effect
 */
const HEARTBEAT_PRESET: AnimationPreset = {
  id: 'preset-heartbeat',
  name: 'Heartbeat',
  description: 'Double pulse effect simulating a natural heartbeat rhythm.',
  targetType: 'any',
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
      keyTimes: '0;0.1;0.2;0.35;0.45;1',
      keySplines: '0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1',
      values: '1 1; 1.15 1.15; 1 1; 1.12 1.12; 1 1; 1 1',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="10" fill="#e91e63" opacity="0.9">
      <animateTransform attributeName="transform" type="translate" dur="1.2s" repeatCount="indefinite"
        values="0 0; -1.5 -1.5; 0 0; -1.2 -1.2; 0 0; 0 0" calcMode="spline" additive="sum"
        keyTimes="0;0.1;0.2;0.35;0.45;1" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"/>
      <animateTransform attributeName="transform" type="scale" dur="1.2s" repeatCount="indefinite"
        values="1 1; 1.15 1.15; 1 1; 1.12 1.12; 1 1; 1 1" calcMode="spline" additive="sum"
        keyTimes="0;0.1;0.2;0.35;0.45;1" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"/>
    </circle>
  </svg>`,
};

/**
 * Float animation - gentle vertical movement
 */
const FLOAT_PRESET: AnimationPreset = {
  id: 'preset-float',
  name: 'Float',
  description: 'Gentle floating motion, moving smoothly up and down.',
  targetType: 'any',
  preset: true,
  animations: [
    {
      type: 'animateTransform',
      transformType: 'translate',
      attributeName: 'transform',
      dur: '3s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keyTimes: '0;0.5;1',
      keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1',
      values: '0 0; 0 -8; 0 0',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="22" rx="12" ry="8" fill="#00bcd4" opacity="0.8">
      <animateTransform attributeName="transform" type="translate" dur="3s" repeatCount="indefinite"
        values="0 0; 0 -6; 0 0" calcMode="spline" additive="sum"
        keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </ellipse>
  </svg>`,
};

/**
 * Swing animation - pendulum rotation
 */
const SWING_PRESET: AnimationPreset = {
  id: 'preset-swing',
  name: 'Swing',
  description: 'Pendulum-like swaying motion, rotating gently from side to side.',
  targetType: 'any',
  preset: true,
  animations: [
    {
      type: 'animateTransform',
      transformType: 'rotate',
      attributeName: 'transform',
      dur: '2s',
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
    <rect x="15" y="8" width="10" height="24" rx="2" fill="#ff9800" opacity="0.9">
      <animateTransform attributeName="transform" type="rotate" dur="2s" repeatCount="indefinite"
        values="0 20 20; 10 20 20; 0 20 20; -10 20 20; 0 20 20" calcMode="spline" additive="sum"
        keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </rect>
  </svg>`,
};

/**
 * Spin animation - continuous rotation
 */
const SPIN_PRESET: AnimationPreset = {
  id: 'preset-spin',
  name: 'Spin',
  description: 'Continuous 360° rotation around the center.',
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
      values: '0; 360',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="2" fill="#9c27b0" opacity="0.9">
      <animateTransform attributeName="transform" type="rotate" dur="2s" repeatCount="indefinite"
        values="0 20 20; 360 20 20" calcMode="linear" additive="sum"/>
    </rect>
  </svg>`,
};

/**
 * Shake animation - rapid trembling
 */
const SHAKE_PRESET: AnimationPreset = {
  id: 'preset-shake',
  name: 'Shake',
  description: 'Rapid horizontal trembling for attention-grabbing effect.',
  targetType: 'any',
  preset: true,
  animations: [
    {
      type: 'animateTransform',
      transformType: 'translate',
      attributeName: 'transform',
      dur: '0.5s',
      repeatCount: 'indefinite',
      calcMode: 'linear',
      keyTimes: '0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1',
      values: '0 0; -4 0; 4 0; -4 0; 4 0; -3 0; 3 0; -2 0; 2 0; -1 0; 0 0',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="14" width="16" height="12" rx="2" fill="#f44336" opacity="0.9">
      <animateTransform attributeName="transform" type="translate" dur="0.5s" repeatCount="indefinite"
        values="0 0; -3 0; 3 0; -3 0; 3 0; -2 0; 2 0; -1 0; 1 0; -0.5 0; 0 0" calcMode="linear" additive="sum"
        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1"/>
    </rect>
  </svg>`,
};

/**
 * Bounce animation - elastic bouncing
 */
const BOUNCE_PRESET: AnimationPreset = {
  id: 'preset-bounce',
  name: 'Bounce',
  description: 'Playful elastic bouncing motion.',
  targetType: 'any',
  preset: true,
  animations: [
    {
      type: 'animateTransform',
      transformType: 'translate',
      attributeName: 'transform',
      dur: '1s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keyTimes: '0;0.2;0.4;0.5;0.6;0.8;1',
      keySplines: '0.3 0 0.7 1; 0.3 0 0.7 1; 0.3 0 0.7 1; 0.3 0 0.7 1; 0.3 0 0.7 1; 0.3 0 0.7 1',
      values: '0 0; 0 -12; 0 0; 0 -6; 0 0; 0 -2; 0 0',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="26" r="10" fill="#4caf50" opacity="0.9">
      <animateTransform attributeName="transform" type="translate" dur="1s" repeatCount="indefinite"
        values="0 0; 0 -10; 0 0; 0 -5; 0 0; 0 -2; 0 0" calcMode="spline" additive="sum"
        keyTimes="0;0.2;0.4;0.5;0.6;0.8;1" keySplines="0.3 0 0.7 1; 0.3 0 0.7 1; 0.3 0 0.7 1; 0.3 0 0.7 1; 0.3 0 0.7 1; 0.3 0 0.7 1"/>
    </circle>
  </svg>`,
};

/**
 * Wobble animation - jelly-like motion
 */
const WOBBLE_PRESET: AnimationPreset = {
  id: 'preset-wobble',
  name: 'Wobble',
  description: 'Jelly-like wobbling motion combining rotation and translation.',
  targetType: 'any',
  preset: true,
  animations: [
    {
      type: 'animateTransform',
      transformType: 'translate',
      attributeName: 'transform',
      dur: '1s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keyTimes: '0;0.15;0.3;0.45;0.6;0.75;1',
      keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
      values: '0 0; -6 0; 5 0; -4 0; 3 0; -1 0; 0 0',
      additive: 'sum',
      fill: 'freeze',
    },
    {
      type: 'animateTransform',
      transformType: 'rotate',
      attributeName: 'transform',
      dur: '1s',
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keyTimes: '0;0.15;0.3;0.45;0.6;0.75;1',
      keySplines: '0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1',
      values: '0; -5; 4; -3; 2; -1; 0',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <ellipse cx="20" cy="20" rx="12" ry="10" fill="#673ab7" opacity="0.9">
      <animateTransform attributeName="transform" type="translate" dur="1s" repeatCount="indefinite"
        values="0 0; -5 0; 4 0; -3 0; 2 0; -1 0; 0 0" calcMode="spline" additive="sum"
        keyTimes="0;0.15;0.3;0.45;0.6;0.75;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
      <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite"
        values="0 20 20; -5 20 20; 4 20 20; -3 20 20; 2 20 20; -1 20 20; 0 20 20" calcMode="spline" additive="sum"
        keyTimes="0;0.15;0.3;0.45;0.6;0.75;1" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"/>
    </ellipse>
  </svg>`,
};

/**
 * Spin Counter-Clockwise animation
 */
const SPIN_CCW_PRESET: AnimationPreset = {
  id: 'preset-spin-ccw',
  name: 'Spin CCW',
  description: 'Continuous counter-clockwise 360° rotation.',
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
      values: '360; 0',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="12" width="16" height="16" rx="2" fill="#9c27b0" opacity="0.9">
      <animateTransform attributeName="transform" type="rotate" dur="2s" repeatCount="indefinite"
        values="360 20 20; 0 20 20" calcMode="linear" additive="sum"/>
    </rect>
  </svg>`,
};

/**
 * Shake Hard animation - intense error shake
 */
const SHAKE_HARD_PRESET: AnimationPreset = {
  id: 'preset-shake-hard',
  name: 'Shake Hard',
  description: 'Intense horizontal shake for error states.',
  targetType: 'any',
  preset: true,
  animations: [
    {
      type: 'animateTransform',
      transformType: 'translate',
      attributeName: 'transform',
      dur: '0.4s',
      repeatCount: 1,
      calcMode: 'linear',
      keyTimes: '0;0.1;0.3;0.5;0.7;1',
      values: '0 0; -10 0; 10 0; -10 0; 10 0; 0 0',
      additive: 'sum',
      fill: 'freeze',
    },
  ],
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="12" y="14" width="16" height="12" rx="2" fill="#f44336" opacity="0.9">
      <animateTransform attributeName="transform" type="translate" dur="0.4s" repeatCount="indefinite"
        values="0 0; -8 0; 8 0; -8 0; 8 0; 0 0" calcMode="linear" additive="sum"
        keyTimes="0;0.1;0.3;0.5;0.7;1"/>
    </rect>
  </svg>`,
};

/** All general animation presets */
export const GENERAL_PRESETS: AnimationPreset[] = [
  PULSE_PRESET,
  FADE_IN_PRESET,
  BREATHING_PRESET,
  HEARTBEAT_PRESET,
  FLOAT_PRESET,
  SWING_PRESET,
  SPIN_PRESET,
  SPIN_CCW_PRESET,
  SHAKE_PRESET,
  SHAKE_HARD_PRESET,
  BOUNCE_PRESET,
  WOBBLE_PRESET,
];

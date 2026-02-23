/**
 * animationAttributeOptions — Exhaustive attribute/type options for SVG animations.
 *
 * Provides categorized attribute lists for each animation type:
 * - `set`: Discrete attributes (visibility, display, fill, etc.)
 * - `animate`: All animatable presentation/geometry attributes by category
 * - `animateTransform`: Transform-specific attribute (always "transform")
 *
 * Also provides transform type options with value format hints.
 */

import type { AnimationType } from '../plugins/animationSystem/types';

export interface AttributeOption {
  value: string;
  label: string;
}

// ─── Set Animation Attributes ───────────────────────────────────────────────
// `set` is used for discrete, non-interpolable attribute changes

const SET_ATTRIBUTES: AttributeOption[] = [
  { value: 'visibility', label: 'Visibility' },
  { value: 'display', label: 'Display' },
  { value: 'fill', label: 'Fill Color' },
  { value: 'stroke', label: 'Stroke Color' },
  { value: 'opacity', label: 'Opacity' },
  { value: 'fill-opacity', label: 'Fill Opacity' },
  { value: 'stroke-opacity', label: 'Stroke Opacity' },
  { value: 'stroke-width', label: 'Stroke Width' },
  { value: 'stroke-dasharray', label: 'Stroke Dash Array' },
  { value: 'stroke-dashoffset', label: 'Stroke Dash Offset' },
  { value: 'stroke-linecap', label: 'Stroke Linecap' },
  { value: 'stroke-linejoin', label: 'Stroke Linejoin' },
  { value: 'fill-rule', label: 'Fill Rule' },
  { value: 'clip-rule', label: 'Clip Rule' },
  { value: 'font-size', label: 'Font Size' },
  { value: 'font-weight', label: 'Font Weight' },
  { value: 'font-family', label: 'Font Family' },
  { value: 'text-anchor', label: 'Text Anchor' },
  { value: 'dominant-baseline', label: 'Dominant Baseline' },
  { value: 'class', label: 'CSS Class' },
];

// ─── Animate Attributes (by category) ───────────────────────────────────────

const COMMON_ATTRIBUTES: AttributeOption[] = [
  { value: 'opacity', label: 'Opacity' },
  { value: 'fill', label: 'Fill Color' },
  { value: 'stroke', label: 'Stroke Color' },
  { value: 'd', label: 'Path Data (morph)' },
  { value: 'visibility', label: 'Visibility' },
  { value: 'display', label: 'Display' },
];

const POSITION_ATTRIBUTES: AttributeOption[] = [
  { value: 'x', label: 'X' },
  { value: 'y', label: 'Y' },
  { value: 'cx', label: 'Center X' },
  { value: 'cy', label: 'Center Y' },
  { value: 'dx', label: 'Delta X' },
  { value: 'dy', label: 'Delta Y' },
  { value: 'width', label: 'Width' },
  { value: 'height', label: 'Height' },
  { value: 'r', label: 'Radius' },
  { value: 'rx', label: 'Radius X' },
  { value: 'ry', label: 'Radius Y' },
  { value: 'x1', label: 'X1' },
  { value: 'y1', label: 'Y1' },
  { value: 'x2', label: 'X2' },
  { value: 'y2', label: 'Y2' },
  { value: 'points', label: 'Points' },
];

const STYLE_ATTRIBUTES: AttributeOption[] = [
  { value: 'stroke-width', label: 'Stroke Width' },
  { value: 'stroke-dashoffset', label: 'Stroke Dash Offset (path draw)' },
  { value: 'stroke-dasharray', label: 'Stroke Dash Array' },
  { value: 'fill-opacity', label: 'Fill Opacity' },
  { value: 'stroke-opacity', label: 'Stroke Opacity' },
  { value: 'stroke-linecap', label: 'Stroke Linecap' },
  { value: 'stroke-linejoin', label: 'Stroke Linejoin' },
  { value: 'stroke-miterlimit', label: 'Stroke Miter Limit' },
  { value: 'marker-start', label: 'Marker Start' },
  { value: 'marker-mid', label: 'Marker Mid' },
  { value: 'marker-end', label: 'Marker End' },
  { value: 'color', label: 'Color' },
];

const GRADIENT_ATTRIBUTES: AttributeOption[] = [
  { value: 'offset', label: 'Stop Offset' },
  { value: 'stop-color', label: 'Stop Color' },
  { value: 'stop-opacity', label: 'Stop Opacity' },
  { value: 'fx', label: 'Focal X (radial)' },
  { value: 'fy', label: 'Focal Y (radial)' },
  { value: 'fr', label: 'Focal Radius (radial)' },
  { value: 'spreadMethod', label: 'Spread Method' },
  { value: 'gradientTransform', label: 'Gradient Transform' },
];

const FILTER_ATTRIBUTES: AttributeOption[] = [
  { value: 'stdDeviation', label: 'Blur (stdDeviation)' },
  { value: 'baseFrequency', label: 'Base Frequency' },
  { value: 'scale', label: 'Scale' },
  { value: 'values', label: 'Color Matrix Values' },
  { value: 'flood-color', label: 'Flood Color' },
  { value: 'flood-opacity', label: 'Flood Opacity' },
  { value: 'k1', label: 'K1 (composite)' },
  { value: 'k2', label: 'K2 (composite)' },
  { value: 'k3', label: 'K3 (composite)' },
  { value: 'k4', label: 'K4 (composite)' },
  { value: 'seed', label: 'Seed (turbulence)' },
  { value: 'numOctaves', label: 'Num Octaves' },
];

const TEXT_ATTRIBUTES: AttributeOption[] = [
  { value: 'font-size', label: 'Font Size' },
  { value: 'letter-spacing', label: 'Letter Spacing' },
  { value: 'word-spacing', label: 'Word Spacing' },
  { value: 'textLength', label: 'Text Length' },
  { value: 'font-weight', label: 'Font Weight' },
  { value: 'text-decoration', label: 'Text Decoration' },
  { value: 'startOffset', label: 'Text Path Start Offset' },
];

const TRANSFORM_ANIMATE_ATTRIBUTES: AttributeOption[] = [
  { value: 'transform', label: 'Transform' },
];

const CLIP_MASK_ATTRIBUTES: AttributeOption[] = [
  { value: 'clip-path', label: 'Clip Path' },
  { value: 'mask', label: 'Mask' },
  { value: 'filter', label: 'Filter' },
];

// ─── All Animate Attributes (union) ─────────────────────────────────────────

const ALL_ANIMATE_ATTRIBUTES: AttributeOption[] = [
  ...COMMON_ATTRIBUTES,
  ...POSITION_ATTRIBUTES,
  ...STYLE_ATTRIBUTES,
  ...TRANSFORM_ANIMATE_ATTRIBUTES,
  ...TEXT_ATTRIBUTES,
  ...GRADIENT_ATTRIBUTES,
  ...FILTER_ATTRIBUTES,
  ...CLIP_MASK_ATTRIBUTES,
];

// ─── Transform Type Options ─────────────────────────────────────────────────
// Primary transform types with value format hints

export interface TransformTypeOption {
  value: string;
  label: string;
  /** Value format hint shown as placeholder */
  hint: string;
}

const TRANSFORM_TYPE_OPTIONS: TransformTypeOption[] = [
  { value: 'translate', label: 'Translate', hint: 'tx [ty]' },
  { value: 'scale', label: 'Scale', hint: 'sx [sy]' },
  { value: 'rotate', label: 'Rotate', hint: 'angle [cx cy]' },
  { value: 'skewX', label: 'Skew X', hint: 'angle' },
  { value: 'skewY', label: 'Skew Y', hint: 'angle' },
];

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get attribute options appropriate for a given animation type.
 */
export function getAttributeOptionsForType(type?: AnimationType): AttributeOption[] {
  switch (type) {
    case 'set':
      return SET_ATTRIBUTES;
    case 'animateTransform':
      return TRANSFORM_ANIMATE_ATTRIBUTES;
    case 'animate':
      return ALL_ANIMATE_ATTRIBUTES;
    default:
      return ALL_ANIMATE_ATTRIBUTES;
  }
}

/**
 * Get transform type options (for animateTransform).
 * Returns a simplified version without hints for use in CustomSelect.
 */
export function getTransformTypeOptions(): AttributeOption[] {
  return TRANSFORM_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }));
}

/**
 * Get full transform type options with value format hints.
 */
export function getTransformTypeOptionsWithHints(): TransformTypeOption[] {
  return TRANSFORM_TYPE_OPTIONS;
}

/**
 * Get all available animation type options.
 */
export function getAnimationTypeOptions(): AttributeOption[] {
  return [
    { value: 'animate', label: 'Animate' },
    { value: 'animateTransform', label: 'Transform' },
    { value: 'animateMotion', label: 'Motion' },
    { value: 'set', label: 'Set' },
  ];
}

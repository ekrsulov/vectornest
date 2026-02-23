/**
 * Shared helpers for gizmo contribution definitions.
 *
 * Extracted from duplicated code across contribution files so that every gizmo
 * category uses a single source of truth for SMIL value parsing/formatting.
 */

import type { SVGAnimation } from '../../types';

// =============================================================================
// SMIL Values Helpers  (string-typed keyframes, used by style/clip/gradient/…)
// =============================================================================

/**
 * Parse SMIL values attribute into an array of string keyframes.
 * Example: "2;14;2"                 -> ["2", "14", "2"]
 * Example: "#ef4444;#22c55e;#3b82f6" -> ["#ef4444", "#22c55e", "#3b82f6"]
 */
export function parseStyleValuesKeyframes(values: string | undefined): string[] {
  if (!values) return [];
  return values.split(';').map((v) => v.trim());
}

/**
 * Format a string-keyframe array back to a SMIL values attribute.
 */
export function formatStyleValuesKeyframes(keyframes: string[]): string {
  return keyframes.join(';');
}

/**
 * Extract from / to values from a style animation, supporting both
 * `from`/`to` and `values` attributes.
 */
export function extractStyleAnimationValues(animation: SVGAnimation): {
  from: string;
  to: string;
  hasValues: boolean;
  keyframes: string[];
} {
  if (animation.values) {
    const keyframes = parseStyleValuesKeyframes(animation.values);
    return {
      from: keyframes[0] ?? '',
      to: keyframes[keyframes.length - 1] ?? '',
      hasValues: true,
      keyframes,
    };
  }
  return {
    from: String(animation.from ?? ''),
    to: String(animation.to ?? ''),
    hasValues: false,
    keyframes: [],
  };
}

// =============================================================================
// Gizmo color palette — shared colour constants for consistent theming
// =============================================================================

export interface GizmoColorPair {
  dark: string;
  light: string;
}

/** Canonical colour palette keyed by animation category / purpose. */
export const GIZMO_COLORS = {
  translate: { dark: '#63b3ed', light: '#3182ce' },
  rotate:    { dark: '#68d391', light: '#38a169' },
  scale:     { dark: '#f6ad55', light: '#dd6b20' },
  skew:      { dark: '#fc8181', light: '#e53e3e' },
  vector:    { dark: '#b794f4', light: '#805ad5' },
  style:     { dark: '#f687b3', light: '#d53f8c' },
  clipMask:  { dark: '#76e4f7', light: '#0987a0' },
  gradient:  { dark: '#fbd38d', light: '#d69e2e' },
  filter:    { dark: '#a78bfa', light: '#7c3aed' },
  hierarchy: { dark: '#9ae6b4', light: '#38a169' },
  interactive: { dark: '#90cdf4', light: '#3182ce' },
  typography: { dark: '#fbb6ce', light: '#d53f8c' },
  fx:        { dark: '#fed7aa', light: '#dd6b20' },
  scene:     { dark: '#c4b5fd', light: '#6d28d9' },
} as const;

/**
 * Resolve a colour pair to a single value based on the current colour mode.
 */
export function resolveGizmoColor(
  pair: GizmoColorPair,
  colorMode: 'light' | 'dark',
): string {
  return colorMode === 'dark' ? pair.dark : pair.light;
}

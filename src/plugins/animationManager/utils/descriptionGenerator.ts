/**
 * Description Generator — Creates human-readable labels from SVGAnimation objects.
 * Used in the Animation Map (Zone 1) rows.
 */

import type { SVGAnimation } from '../../animationSystem/types';

/**
 * Get a short icon/emoji for the animation type.
 */
export function getAnimationTypeIcon(anim: SVGAnimation): string {
  switch (anim.type) {
    case 'animateTransform':
      return '🔄';
    case 'animateMotion':
      return '📐';
    case 'set':
      return '⏸';
    case 'animate':
    default:
      return '⚡';
  }
}

/**
 * Get a label for the animation type.
 */
export function getAnimationTypeLabel(anim: SVGAnimation): string {
  switch (anim.type) {
    case 'animate':
      return 'animate';
    case 'animateTransform':
      return 'transform';
    case 'animateMotion':
      return 'motion';
    case 'set':
      return 'set';
    case 'custom':
      return 'custom';
    default:
      return 'animation';
  }
}

/**
 * Parse a value that might be numeric to a readable format.
 */
function formatValue(val: string | number | undefined): string {
  if (val === undefined || val === '') return '?';
  if (typeof val === 'number') return String(val);
  // Try to shorten long values
  const s = String(val);
  if (s.length > 20) return s.slice(0, 17) + '…';
  return s;
}

/**
 * Generate a concise human-readable description for an animation.
 * Examples:
 *   - "opacity 0 → 1"
 *   - "rotate 0° → 360°"
 *   - "translateX 0 → 100"
 *   - "fill #ff0000 → #0000ff"
 *   - "path draw"
 *   - "motion along path"
 */
export function generateAnimationDescription(anim: SVGAnimation): string {
  // animateMotion
  if (anim.type === 'animateMotion') {
    if (anim.mpath) return 'motion along mpath';
    if (anim.path) return 'motion along path';
    return 'motion';
  }

  // animateTransform
  if (anim.type === 'animateTransform' && anim.transformType) {
    const t = anim.transformType;
    if (anim.from !== undefined && anim.to !== undefined) {
      const suffix = t === 'rotate' ? '°' : '';
      return `${t} ${formatValue(anim.from)}${suffix} → ${formatValue(anim.to)}${suffix}`;
    }
    if (anim.values) {
      const parts = String(anim.values).split(';').filter(Boolean);
      if (parts.length >= 2) {
        const suffix = t === 'rotate' ? '°' : '';
        return `${t} ${parts[0].trim()}${suffix} → ${parts[parts.length - 1].trim()}${suffix}`;
      }
    }
    return t;
  }

  // set
  if (anim.type === 'set') {
    const attr = anim.attributeName ?? 'attr';
    return `set ${attr} = ${formatValue(anim.to)}`;
  }

  // animate — detect special patterns
  const attr = anim.attributeName ?? '';

  // Path draw (stroke-dashoffset)
  if (attr === 'stroke-dashoffset') {
    return 'path draw';
  }

  // From/To mode
  if (anim.from !== undefined && anim.to !== undefined) {
    return `${attr} ${formatValue(anim.from)} → ${formatValue(anim.to)}`;
  }

  // Values mode
  if (anim.values) {
    const parts = String(anim.values).split(';').filter(Boolean);
    if (parts.length >= 2) {
      return `${attr} ${parts[0].trim()} → ${parts[parts.length - 1].trim()}`;
    }
    if (parts.length === 1) {
      return `${attr} → ${parts[0].trim()}`;
    }
  }

  // To-only
  if (anim.to !== undefined) {
    return `${attr} → ${formatValue(anim.to)}`;
  }

  return attr || 'animation';
}

/**
 * Format duration for display.
 */
export function formatDuration(dur: string | undefined): string {
  if (!dur) return '?';
  const s = String(dur);
  // Already has 's' suffix
  if (s.endsWith('s')) return s;
  // Try to parse as number
  const n = parseFloat(s);
  if (!isNaN(n)) return `${n}s`;
  return s;
}

/**
 * Format repeat count for display.
 */
export function formatRepeatCount(count: number | 'indefinite' | undefined): string {
  if (count === undefined) return '1';
  if (count === 'indefinite') return '∞';
  return String(count);
}

/**
 * Compute total duration in seconds including repeats.
 */
export function computeTotalDuration(anim: SVGAnimation): number {
  const durSec = parseFloat(String(anim.dur ?? '0').replace('s', '')) || 0;
  const repeatDur = anim.repeatDur
    ? parseFloat(String(anim.repeatDur).replace('s', ''))
    : null;
  const repeat =
    anim.repeatCount === 'indefinite'
      ? Infinity
      : typeof anim.repeatCount === 'number'
        ? anim.repeatCount
        : 1;
  if (repeatDur && repeatDur > 0) return repeatDur;
  if (repeat === Infinity) return Infinity;
  return durSec * repeat;
}

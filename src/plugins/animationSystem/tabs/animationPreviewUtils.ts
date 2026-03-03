import type { SVGAnimation } from '../types';
import type { CanvasElement } from '../../../types';

// ─── Types ────────────────────────────────────────────────────────

export type PreviewAnimation = Omit<SVGAnimation, 'id'> & { id?: string };

export type AnimationPreviewPanelProps = {
  elements: CanvasElement[];
  baseAnimations: SVGAnimation[];
  draftAnimation: PreviewAnimation | null;
  selectedElement?: CanvasElement;
  getDraftAnimation?: () => PreviewAnimation | null;
  previewVersion: number;
  onPreviewActivated?: () => void;
};

// ─── Constants ────────────────────────────────────────────────────

/** Throttle slider updates to ~15fps to reduce React re-renders during animation */
export const SLIDER_UPDATE_INTERVAL = 1000 / 15;

// ─── Pure utility functions ───────────────────────────────────────

export const ensureAnimationWithId = (anim: PreviewAnimation): SVGAnimation => ({
  ...anim,
  id: anim.id ?? `preview-${anim.targetElementId}`,
});

export const formatXml = (xml: string): string => {
  const normalized = xml.replace(/>\s+</g, '><').trim();
  const lines = normalized.replace(/></g, '>\n<').split('\n');
  let indent = 0;
  const formatted = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.match(/^<\/\w/)) {
      indent = Math.max(indent - 1, 0);
    }
    const pad = '  '.repeat(indent);
    const out = `${pad}${trimmed}`;
    if (trimmed.match(/^<[^!?][^>]*[^/]>$/) && !trimmed.startsWith('</') && !trimmed.includes('</')) {
      indent += 1;
    }
    return out;
  });
  return formatted.join('\n');
};

export const computeTotalDuration = (animation?: SVGAnimation): number => {
  if (!animation) return 0;
  const durSec = parseFloat(String(animation.dur ?? '0').replace('s', '')) || 0;
  const repeatDur = animation.repeatDur ? parseFloat(String(animation.repeatDur).replace('s', '')) : null;
  const repeat = animation.repeatCount === 'indefinite'
    ? 1
    : typeof animation.repeatCount === 'number'
      ? animation.repeatCount
      : 1;
  if (repeatDur && repeatDur > 0) return repeatDur;
  return durSec * repeat;
};

/** Parse a color values string (like "#ff0000;#00ff00;#0000ff") into an array of colors */
export const parseColorValues = (values: string): string[] => {
  return values.split(';').map(v => v.trim()).filter(Boolean);
};

/** Parse numeric transform values (like "0 0.5 0.5;360 0.5 0.5") into an array */
export const parseTransformValues = (values: string): string[] => {
  return values.split(';').map(v => v.trim()).filter(Boolean);
};

/** Interpolate between two hex colors */
export const interpolateColor = (color1: string, color2: string, progress: number): string => {
  const parseHex = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b];
  };

  const [r1, g1, b1] = parseHex(color1);
  const [r2, g2, b2] = parseHex(color2);

  const r = Math.round(r1 + (r2 - r1) * progress);
  const g = Math.round(g1 + (g2 - g1) * progress);
  const b = Math.round(b1 + (b2 - b1) * progress);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/** Interpolate a value from a values array based on progress */
export const interpolateFromValues = (
  values: string[],
  progress: number,
  interpolateFn: (v1: string, v2: string, p: number) => string
): string => {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];

  const numSegments = values.length - 1;
  const segmentProgress = progress * numSegments;
  const segmentIndex = Math.min(Math.floor(segmentProgress), numSegments - 1);
  const localProgress = segmentProgress - segmentIndex;

  return interpolateFn(values[segmentIndex], values[segmentIndex + 1] || values[segmentIndex], localProgress);
};

// ─── DOM utility functions ────────────────────────────────────────

/**
 * Namespace all defs (clipPaths, gradients, patterns, filters, masks, markers)
 * in a preview SVG to avoid ID collisions with the main canvas.
 * Returns a map of old IDs to new unique IDs.
 */
export function namespaceSvgDefs(svgEl: SVGSVGElement, restartKey: number): Map<string, string> {
  const idMap = new Map<string, string>();
  const timestamp = Date.now();

  // Namespace clipPaths
  svgEl.querySelectorAll<SVGClipPathElement>('clipPath[id]').forEach((el, idx) => {
    const oldId = el.id;
    el.id = `${oldId}-preview-${restartKey}-${timestamp}-clip-${idx}`;
    idMap.set(oldId, el.id);
  });

  // Namespace gradients (linearGradient, radialGradient)
  svgEl.querySelectorAll<SVGGradientElement>('linearGradient[id], radialGradient[id]').forEach((el, idx) => {
    const oldId = el.id;
    el.id = `${oldId}-preview-${restartKey}-${timestamp}-grad-${idx}`;
    idMap.set(oldId, el.id);
  });

  // Namespace patterns
  svgEl.querySelectorAll<SVGPatternElement>('pattern[id]').forEach((el, idx) => {
    const oldId = el.id;
    el.id = `${oldId}-preview-${restartKey}-${timestamp}-pat-${idx}`;
    idMap.set(oldId, el.id);
  });

  // Namespace filters
  svgEl.querySelectorAll<SVGFilterElement>('filter[id]').forEach((el, idx) => {
    const oldId = el.id;
    el.id = `${oldId}-preview-${restartKey}-${timestamp}-filt-${idx}`;
    idMap.set(oldId, el.id);
  });

  // Namespace masks
  svgEl.querySelectorAll<SVGMaskElement>('mask[id]').forEach((el, idx) => {
    const oldId = el.id;
    el.id = `${oldId}-preview-${restartKey}-${timestamp}-mask-${idx}`;
    idMap.set(oldId, el.id);
  });

  // Namespace markers
  svgEl.querySelectorAll<SVGMarkerElement>('marker[id]').forEach((el, idx) => {
    const oldId = el.id;
    el.id = `${oldId}-preview-${restartKey}-${timestamp}-marker-${idx}`;
    idMap.set(oldId, el.id);
  });

  if (!idMap.size) return idMap;

  // Update clip-path references
  svgEl.querySelectorAll<SVGElement>('[clip-path]').forEach((el) => {
    const raw = el.getAttribute('clip-path');
    if (!raw) return;
    idMap.forEach((newId, oldId) => {
      if (raw.includes(`#${oldId}`)) {
        const updated = raw.replace(`#${oldId}`, `#${newId}`);
        el.setAttribute('clip-path', updated);
        el.style.setProperty('clip-path', `url(#${newId})`);
        el.style.setProperty('-webkit-clip-path', `url(#${newId})`);
      }
    });
  });

  // Update fill references (gradients, patterns)
  svgEl.querySelectorAll<SVGElement>('[fill^="url(#"]').forEach((el) => {
    const raw = el.getAttribute('fill');
    if (!raw) return;
    idMap.forEach((newId, oldId) => {
      if (raw.includes(`#${oldId}`)) {
        el.setAttribute('fill', raw.replace(`#${oldId}`, `#${newId}`));
      }
    });
  });

  // Update stroke references (gradients, patterns)
  svgEl.querySelectorAll<SVGElement>('[stroke^="url(#"]').forEach((el) => {
    const raw = el.getAttribute('stroke');
    if (!raw) return;
    idMap.forEach((newId, oldId) => {
      if (raw.includes(`#${oldId}`)) {
        el.setAttribute('stroke', raw.replace(`#${oldId}`, `#${newId}`));
      }
    });
  });

  // Update filter references
  svgEl.querySelectorAll<SVGElement>('[filter^="url(#"]').forEach((el) => {
    const raw = el.getAttribute('filter');
    if (!raw) return;
    idMap.forEach((newId, oldId) => {
      if (raw.includes(`#${oldId}`)) {
        el.setAttribute('filter', raw.replace(`#${oldId}`, `#${newId}`));
      }
    });
  });

  // Update mask references
  svgEl.querySelectorAll<SVGElement>('[mask^="url(#"]').forEach((el) => {
    const raw = el.getAttribute('mask');
    if (!raw) return;
    idMap.forEach((newId, oldId) => {
      if (raw.includes(`#${oldId}`)) {
        el.setAttribute('mask', raw.replace(`#${oldId}`, `#${newId}`));
      }
    });
  });

  // Update marker references
  svgEl.querySelectorAll<SVGElement>('[marker-start^="url(#"], [marker-mid^="url(#"], [marker-end^="url(#"]').forEach((el) => {
    const attrs: Array<'marker-start' | 'marker-mid' | 'marker-end'> = ['marker-start', 'marker-mid', 'marker-end'];
    attrs.forEach((attr) => {
      const raw = el.getAttribute(attr);
      if (!raw) return;
      idMap.forEach((newId, oldId) => {
        if (raw.includes(`#${oldId}`)) {
          el.setAttribute(attr, raw.replace(`#${oldId}`, `#${newId}`));
        }
      });
    });
  });

  return idMap;
}

/**
 * Force browser repaint for gradient animations.
 * SMIL animations on gradient stops may not trigger visual updates in some browsers
 * when using setCurrentTime().
 */
export function forceGradientRepaint(svgEl: SVGSVGElement | null): void {
  if (!svgEl) return;

  const elementsWithGradient = svgEl.querySelectorAll<SVGElement>('[fill^="url(#"], [stroke^="url(#"]');
  elementsWithGradient.forEach((el) => {
    // Force repaint by reading a layout property
    void el.getBoundingClientRect();

    // Toggle a tiny transform to force repaint
    const currentTransform = el.getAttribute('transform') || '';
    el.setAttribute('transform', currentTransform + ' translate(0,0)');
    // Immediately restore (browser will still process the change)
    requestAnimationFrame(() => {
      el.setAttribute('transform', currentTransform || '');
    });
  });

  // Also force SVG root repaint
  void svgEl.getBoundingClientRect();
}

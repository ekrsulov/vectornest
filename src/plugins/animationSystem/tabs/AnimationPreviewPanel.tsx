import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ReactDOMServer from 'react-dom/server';
import { Box, HStack, Spinner, Text, useColorModeValue } from '@chakra-ui/react';
import { PanelStyledButton } from '../../../ui/PanelStyledButton';
import { SliderControl } from '../../../ui/SliderControl';
import type { CanvasElement } from '../../../types';
import type { SVGAnimation } from '../types';
import { canvasRendererRegistry, type CanvasRenderContext } from '../../../canvas/renderers/CanvasRendererRegistry';
import { defsContributionRegistry } from '../../../utils/defsContributionRegistry';
import { createPlayingAnimationState } from '../../../utils/animationStatePreparation';
import { canvasStoreApi } from '../../../store/canvasStore';
import { getElementBounds as getElementBoundsService } from '../../../canvas/geometry/CanvasGeometryService';
import { PanelToggle } from '../../../ui/PanelToggle';
import { CopyButton } from '../../../ui/CopyButton';

type PreviewAnimation = Omit<SVGAnimation, 'id'> & { id?: string };

type AnimationPreviewPanelProps = {
  elements: CanvasElement[];
  baseAnimations: SVGAnimation[];
  draftAnimation: PreviewAnimation | null;
  selectedElement?: CanvasElement;
  getDraftAnimation?: () => PreviewAnimation | null;
  previewVersion: number;
  onPreviewActivated?: () => void;
};

const ensureAnimationWithId = (anim: PreviewAnimation): SVGAnimation => ({
  ...anim,
  id: anim.id ?? `preview-${anim.targetElementId}`,
});

const formatXml = (xml: string): string => {
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

const computeTotalDuration = (animation?: SVGAnimation): number => {
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

// Throttle slider updates to ~15fps to reduce React re-renders during animation
const _SLIDER_UPDATE_INTERVAL = 1000 / 15;

const safeStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val as object)) return '[Circular]';
          seen.add(val as object);
          if (val instanceof Map) return { type: 'Map', entries: Array.from(val.entries()) };
          if (val instanceof Set) return { type: 'Set', values: Array.from(val.values()) };
        }
        return val;
      },
      2
    );
  } catch {
    return String(value);
  }
};

const debugLog = (message: string, payload?: unknown) => {
  const timestamp = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[AnimationPreviewPanel ${timestamp}] ${message}`);
    return;
  }
  const expanded = safeStringify(payload);
  console.log(`[AnimationPreviewPanel ${timestamp}] ${message}`, payload, '\n', expanded);
};

const AnimationPreviewPanelComponent: React.FC<AnimationPreviewPanelProps> = ({
  elements,
  baseAnimations,
  draftAnimation,
  selectedElement,
  getDraftAnimation,
  previewVersion,
  onPreviewActivated,
}) => {
  const [appliedDraft, setAppliedDraft] = useState<PreviewAnimation | null>(null);
  const latestDraftRef = useRef<PreviewAnimation | null>(draftAnimation);
  const pendingPreviewRef = useRef(false);
  useEffect(() => {
    latestDraftRef.current = draftAnimation;
  }, [draftAnimation]);

  useEffect(() => {
    if (previewVersion > 0) {
      pendingPreviewRef.current = true;
    } else {
      pendingPreviewRef.current = false;
    }
  }, [previewVersion]);

  const buildAnimationSets = useCallback((draft: PreviewAnimation | null) => {
    // For transitive animations, use previewElementId to find the element that uses the def
    // Fall back to targetElementId for direct animations, then to selectedElement
    const previewTargetId = draft?.previewElementId ?? draft?.targetElementId ?? selectedElement?.id;
    const target = elements.find((el) => el.id === previewTargetId);

    const clipId = (() => {
      if (!target) return undefined;
      const data = target.data as Record<string, unknown>;
      return (data.clipPathTemplateId as string | undefined) ?? (data.clipPathId as string | undefined);
    })();

    const defTargetIds = (() => {
      if (!target) {
        return {
          gradientIds: [] as string[],
          patternIds: [] as string[],
          filterIds: [] as string[],
          maskIds: [] as string[],
          markerIds: [] as string[],
        };
      }
      const data = target.data as Record<string, unknown>;
      const gradientIds: string[] = [];
      const patternIds: string[] = [];
      const filterIds: string[] = [];
      const maskIds: string[] = [];
      const markerIds: string[] = [];
      
      const extractPaintId = (paint: unknown): string | undefined => {
        if (typeof paint !== 'string') return undefined;
        const match = paint.match(/url\(#([^)]+)\)/);
        return match ? match[1] : undefined;
      };
      
      const fillId = extractPaintId(data.fillColor);
      const strokeId = extractPaintId(data.strokeColor);
      if (fillId) {
        gradientIds.push(fillId);
        patternIds.push(fillId);
      }
      if (strokeId) {
        gradientIds.push(strokeId);
        patternIds.push(strokeId);
      }
      
      const filterId = data.filterId as string | undefined;
      if (filterId) filterIds.push(filterId);
      const maskId = (data as { maskId?: string }).maskId;
      if (maskId) maskIds.push(maskId);
      const markerStart = (data as { markerStart?: string }).markerStart;
      const markerMid = (data as { markerMid?: string }).markerMid;
      const markerEnd = (data as { markerEnd?: string }).markerEnd;
      [markerStart, markerMid, markerEnd].forEach((id) => {
        if (id) markerIds.push(id);
      });
      
      return { gradientIds, patternIds, filterIds, maskIds, markerIds };
    })();

    const elementAnimations = (() => {
      if (!target) return [] as SVGAnimation[];
      const base = baseAnimations
        .filter((a) => a.targetElementId === target.id && !a.clipPathTargetId && !a.gradientTargetId && !a.patternTargetId && !a.filterTargetId && !a.maskTargetId)
        .map((a) => ensureAnimationWithId(a));
      if (draft) {
        const existing = base.findIndex((a) => a.id === draft.id);
        const normalized = ensureAnimationWithId({
          ...draft,
          targetElementId: draft.targetElementId ?? target.id,
          repeatCount: draft.repeatCount === 'indefinite' ? 1 : draft.repeatCount,
        });
        if (existing >= 0) {
          const next = [...base];
          next[existing] = normalized;
          return next;
        }
        return [...base, normalized];
      }
      return base;
    })();

    const clipAnimations = clipId
      ? baseAnimations.filter((a) => a.clipPathTargetId === clipId).map((a) => ensureAnimationWithId(a))
      : ([] as SVGAnimation[]);

    const defAnimations = (() => {
      const { gradientIds, patternIds, filterIds, maskIds, markerIds } = defTargetIds;
      const gradientAnims = baseAnimations.filter((a) => a.gradientTargetId && gradientIds.includes(a.gradientTargetId));
      const patternAnims = baseAnimations.filter((a) => a.patternTargetId && patternIds.includes(a.patternTargetId));
      const filterAnims = baseAnimations.filter((a) => a.filterTargetId && filterIds.includes(a.filterTargetId));
      const maskAnims = baseAnimations.filter((a) => a.maskTargetId && maskIds.includes(a.maskTargetId));
      const markerAnims = baseAnimations.filter((a) => a.markerTargetId && markerIds.includes(a.markerTargetId));
      const baseDefAnims = [...gradientAnims, ...patternAnims, ...filterAnims, ...maskAnims, ...markerAnims].map((a) => ensureAnimationWithId(a));
      
      // If the draft is a def animation (gradient, pattern, filter, mask), include it
      if (draft) {
        const isGradientDraft = draft.gradientTargetId && gradientIds.includes(draft.gradientTargetId);
        const isPatternDraft = draft.patternTargetId && patternIds.includes(draft.patternTargetId);
        const isFilterDraft = draft.filterTargetId && filterIds.includes(draft.filterTargetId);
        const isMaskDraft = draft.maskTargetId && maskIds.includes(draft.maskTargetId);
        const isMarkerDraft = draft.markerTargetId && markerIds.includes(draft.markerTargetId);
        
        if (isGradientDraft || isPatternDraft || isFilterDraft || isMaskDraft || isMarkerDraft) {
          const normalizedDraft = ensureAnimationWithId({
            ...draft,
            repeatCount: draft.repeatCount === 'indefinite' ? 1 : draft.repeatCount,
          });
          // Replace existing animation with same id or add new
          const existingIdx = baseDefAnims.findIndex((a) => a.id === normalizedDraft.id);
          if (existingIdx >= 0) {
            baseDefAnims[existingIdx] = normalizedDraft;
          } else {
            baseDefAnims.push(normalizedDraft);
          }
        }
      }
      
      return baseDefAnims;
    })();

    return { targetElement: target, clipTargetId: clipId, defTargetIds, animations: elementAnimations, clipAnimations, defAnimations };
  }, [baseAnimations, elements, selectedElement?.id]);

  const { targetElement, clipTargetId, defTargetIds, animations, clipAnimations, defAnimations } = useMemo(
    () => buildAnimationSets(appliedDraft),
    [appliedDraft, buildAnimationSets]
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const measureRef = useRef<SVGSVGElement | null>(null);
  const [viewBox, setViewBox] = useState<string>('0 0 200 200');
  const [isComputing, setIsComputing] = useState(false);
  const [domPlaying, setDomPlaying] = useState(false);
  const [restartKey, _setRestartKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playRequestId, setPlayRequestId] = useState(0);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [isWrapEnabled, setIsWrapEnabled] = useState(false);
  const debugLogCountRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const playStartRef = useRef<number | null>(null);
  const maxDuration = useMemo(() => {
    const combined = [...animations, ...clipAnimations, ...defAnimations];
    if (!combined.length) return 0;
    return Math.max(...combined.map((a) => computeTotalDuration(a)));
  }, [animations, clipAnimations, defAnimations]);

  // Use a ref for currentTime during playback to avoid recreating baseContext every frame
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  
  // Use a ref for domPlaying to avoid recreating baseContext on play/pause transitions
  const domPlayingRef = useRef(domPlaying);
  domPlayingRef.current = domPlaying;
  
  // Refs to access latest clip animation data inside effects without re-subscribing
  const clipAnimationsRef = useRef(clipAnimations);
  clipAnimationsRef.current = clipAnimations;
  const clipTargetIdRef = useRef<string | undefined>(clipTargetId);
  useEffect(() => {
    clipTargetIdRef.current = clipTargetId;
  }, [clipTargetId, targetElement?.id]);

  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => map.set(el.id, el));
    return map;
  }, [elements]);

  /**
   * Namespace all defs (clipPaths, gradients, patterns, filters) in the preview SVG
   * to avoid ID collisions with the main canvas's defs.
   * This is critical because the browser may reference the main canvas's defs
   * instead of the preview's defs if they share the same IDs.
   */
  const namespaceAllDefs = useCallback((svgEl: SVGSVGElement) => {
    const idMap = new Map<string, string>();
    const timestamp = Date.now();
    
    // Namespace clipPaths
    const clipPaths = svgEl.querySelectorAll<SVGClipPathElement>('clipPath[id]');
    clipPaths.forEach((el, idx) => {
      const oldId = el.id;
      const unique = `${oldId}-preview-${restartKey}-${timestamp}-clip-${idx}`;
      el.id = unique;
      idMap.set(oldId, unique);
    });

    // Namespace gradients (linearGradient, radialGradient)
    const gradients = svgEl.querySelectorAll<SVGGradientElement>('linearGradient[id], radialGradient[id]');
    gradients.forEach((el, idx) => {
      const oldId = el.id;
      const unique = `${oldId}-preview-${restartKey}-${timestamp}-grad-${idx}`;
      el.id = unique;
      idMap.set(oldId, unique);
    });

    // Namespace patterns
    const patterns = svgEl.querySelectorAll<SVGPatternElement>('pattern[id]');
    patterns.forEach((el, idx) => {
      const oldId = el.id;
      const unique = `${oldId}-preview-${restartKey}-${timestamp}-pat-${idx}`;
      el.id = unique;
      idMap.set(oldId, unique);
    });

    // Namespace filters
    const filters = svgEl.querySelectorAll<SVGFilterElement>('filter[id]');
    filters.forEach((el, idx) => {
      const oldId = el.id;
      const unique = `${oldId}-preview-${restartKey}-${timestamp}-filt-${idx}`;
      el.id = unique;
      idMap.set(oldId, unique);
    });

    // Namespace masks
    const masks = svgEl.querySelectorAll<SVGMaskElement>('mask[id]');
    masks.forEach((el, idx) => {
      const oldId = el.id;
      const unique = `${oldId}-preview-${restartKey}-${timestamp}-mask-${idx}`;
      el.id = unique;
      idMap.set(oldId, unique);
    });

    // Namespace markers
    const markers = svgEl.querySelectorAll<SVGMarkerElement>('marker[id]');
    markers.forEach((el, idx) => {
      const oldId = el.id;
      const unique = `${oldId}-preview-${restartKey}-${timestamp}-marker-${idx}`;
      el.id = unique;
      idMap.set(oldId, unique);
    });

    if (!idMap.size) return;

    // Update all references to the renamed defs
    // Handle clip-path references
    const elementsWithClip = svgEl.querySelectorAll<SVGElement>('[clip-path]');
    elementsWithClip.forEach((el) => {
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

    // Handle fill references (gradients, patterns)
    const elementsWithFill = svgEl.querySelectorAll<SVGElement>('[fill^="url(#"]');
    elementsWithFill.forEach((el) => {
      const raw = el.getAttribute('fill');
      if (!raw) return;
      idMap.forEach((newId, oldId) => {
        if (raw.includes(`#${oldId}`)) {
          const updated = raw.replace(`#${oldId}`, `#${newId}`);
          el.setAttribute('fill', updated);
        }
      });
    });

    // Handle stroke references (gradients, patterns)
    const elementsWithStroke = svgEl.querySelectorAll<SVGElement>('[stroke^="url(#"]');
    elementsWithStroke.forEach((el) => {
      const raw = el.getAttribute('stroke');
      if (!raw) return;
      idMap.forEach((newId, oldId) => {
        if (raw.includes(`#${oldId}`)) {
          const updated = raw.replace(`#${oldId}`, `#${newId}`);
          el.setAttribute('stroke', updated);
        }
      });
    });

    // Handle filter references
    const elementsWithFilter = svgEl.querySelectorAll<SVGElement>('[filter^="url(#"]');
    elementsWithFilter.forEach((el) => {
      const raw = el.getAttribute('filter');
      if (!raw) return;
      idMap.forEach((newId, oldId) => {
        if (raw.includes(`#${oldId}`)) {
          const updated = raw.replace(`#${oldId}`, `#${newId}`);
          el.setAttribute('filter', updated);
        }
      });
    });

    // Handle mask references
    const elementsWithMask = svgEl.querySelectorAll<SVGElement>('[mask^="url(#"]');
    elementsWithMask.forEach((el) => {
      const raw = el.getAttribute('mask');
      if (!raw) return;
      idMap.forEach((newId, oldId) => {
        if (raw.includes(`#${oldId}`)) {
          const updated = raw.replace(`#${oldId}`, `#${newId}`);
          el.setAttribute('mask', updated);
        }
      });
    });

    // Handle marker references
    const elementsWithMarkers = svgEl.querySelectorAll<SVGElement>('[marker-start^="url(#"], [marker-mid^="url(#"], [marker-end^="url(#"]');
    elementsWithMarkers.forEach((el) => {
      const attrs: Array<'marker-start' | 'marker-mid' | 'marker-end'> = ['marker-start', 'marker-mid', 'marker-end'];
      attrs.forEach((attr) => {
        const raw = el.getAttribute(attr);
        if (!raw) return;
        idMap.forEach((newId, oldId) => {
          if (raw.includes(`#${oldId}`)) {
            const updated = raw.replace(`#${oldId}`, `#${newId}`);
            el.setAttribute(attr, updated);
          }
        });
      });
    });

    // Update clipTargetIdRef if it was renamed
    const mappedClip = clipTargetIdRef.current ? idMap.get(clipTargetIdRef.current) : undefined;
    if (mappedClip) {
      clipTargetIdRef.current = mappedClip;
    }

    debugLog('Namespaced defs', {
      count: idMap.size,
      mappings: Array.from(idMap.entries()).map(([old, newId]) => ({ old, new: newId })),
    });
  }, [restartKey]);
  
  const applyClipFallback = useCallback((svgEl: SVGSVGElement | null, timeSec: number) => {
    if (!svgEl || !clipTargetIdRef.current || !clipAnimationsRef.current.length) return;
    const clipNode = svgEl.querySelector<SVGClipPathElement>(`clipPath#${clipTargetIdRef.current}`);
    if (!clipNode) return;
    const firstShape = clipNode.firstElementChild as SVGElement | null;
    const targetEl = svgEl.querySelector<SVGElement>('[data-element-id]');
    if (targetEl && clipTargetIdRef.current) {
      const clipUrl = `url(#${clipTargetIdRef.current})`;
      targetEl.setAttribute('clip-path', clipUrl);
      targetEl.style.setProperty('clip-path', clipUrl);
      targetEl.style.setProperty('-webkit-clip-path', clipUrl);
    }
    clipAnimationsRef.current.forEach((anim) => {
      if (anim.type !== 'animate' || !anim.attributeName || !firstShape) return;
      const durSec = parseFloat(String(anim.dur ?? '0').replace('s', '')) || 0;
      const from = anim.from !== undefined ? parseFloat(String(anim.from)) : null;
      const to = anim.to !== undefined ? parseFloat(String(anim.to)) : null;
      if (durSec <= 0 || from === null || to === null || Number.isNaN(from) || Number.isNaN(to)) return;
      const progress = Math.min(1, Math.max(0, durSec > 0 ? timeSec / durSec : 1));
      const value = from + (to - from) * progress;
      if ('width' in firstShape && anim.attributeName === 'width') {
        (firstShape as SVGRectElement).width.baseVal.value = value;
      } else if ('height' in firstShape && anim.attributeName === 'height') {
        (firstShape as SVGRectElement).height.baseVal.value = value;
      } else {
        firstShape.setAttribute(anim.attributeName, String(value));
      }
    });
  }, []);

  /**
   * Force browser repaint for gradient animations.
   * SMIL animations on gradient stops may not trigger visual updates in some browsers
   * when using setCurrentTime(). This function forces a repaint by briefly toggling
   * a style property on elements that use gradients.
   */
  const forceGradientRepaint = useCallback((svgEl: SVGSVGElement | null) => {
    if (!svgEl) return;
    
    // Find all elements that use gradient fills or strokes
    const elementsWithGradient = svgEl.querySelectorAll<SVGElement>('[fill^="url(#"], [stroke^="url(#"]');
    elementsWithGradient.forEach((el) => {
      // Force repaint by reading a layout property
      // This triggers the browser to recalculate styles and repaint
      void el.getBoundingClientRect();
      
      // Alternative: toggle a tiny transform to force repaint
      const currentTransform = el.getAttribute('transform') || '';
      el.setAttribute('transform', currentTransform + ' translate(0,0)');
      // Immediately restore (browser will still process the change)
      requestAnimationFrame(() => {
        el.setAttribute('transform', currentTransform || '');
      });
    });
    
    // Also try forcing SVG root repaint
    void svgEl.getBoundingClientRect();
  }, []);

  /**
   * Parse a color values string (like "#ff0000;#00ff00;#0000ff") into an array of colors
   */
  const parseColorValues = (values: string): string[] => {
    return values.split(';').map(v => v.trim()).filter(Boolean);
  };

  /**
   * Parse numeric transform values (like "0 0.5 0.5;360 0.5 0.5") into an array
   */
  const parseTransformValues = (values: string): string[] => {
    return values.split(';').map(v => v.trim()).filter(Boolean);
  };

  /**
   * Interpolate between two hex colors
   */
  const interpolateColor = (color1: string, color2: string, progress: number): string => {
    // Parse hex colors
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

  /**
   * Interpolate a value from a values array based on progress
   */
  const interpolateFromValues = useCallback((
    values: string[],
    progress: number,
    interpolateFn: (v1: string, v2: string, p: number) => string
  ): string => {
    if (values.length === 0) return '';
    if (values.length === 1) return values[0];
    
    // Map progress to segment
    const numSegments = values.length - 1;
    const segmentProgress = progress * numSegments;
    const segmentIndex = Math.min(Math.floor(segmentProgress), numSegments - 1);
    const localProgress = segmentProgress - segmentIndex;
    
    return interpolateFn(values[segmentIndex], values[segmentIndex + 1] || values[segmentIndex], localProgress);
  }, []);

  /**
   * Apply a lightweight fallback for simple numeric attribute animations (e.g., r, opacity)
   * to keep them in sync when SMIL stalls under programmatic playback.
   */
  const applyAttributeAnimationFallback = useCallback((svgEl: SVGSVGElement | null, timeSec: number) => {
    if (!svgEl) return;
    const animateNodes = svgEl.querySelectorAll<SVGAnimateElement>('animate');

    animateNodes.forEach((node) => {
      // Skip gradients/patterns handled by dedicated fallback logic
      if (node.closest('linearGradient, radialGradient, pattern')) return;
      const attributeName = node.getAttribute('attributeName');
      if (!attributeName) return;
      // Skip multi-value attributes that require tuple parsing; let native SMIL handle them
      if (attributeName === 'viewBox' || attributeName === 'd' || attributeName === 'points' || attributeName === 'transform') {
        return;
      }
      const durAttr = node.getAttribute('dur') ?? '0s';
      const durSec = parseFloat(durAttr.replace('s', '')) || 0;
      if (durSec <= 0) return;

      const repeatAttr = node.getAttribute('repeatCount');
      const repeatCount = repeatAttr === 'indefinite' ? Infinity : repeatAttr ? parseFloat(repeatAttr) || 1 : 1;
      const effectiveTime = repeatCount === Infinity ? timeSec % durSec : Math.min(timeSec, durSec * repeatCount);
      const progress = durSec === 0 ? 0 : (effectiveTime % durSec) / durSec;

      const valuesAttr = node.getAttribute('values');
      const fromAttr = node.getAttribute('from');
      const toAttr = node.getAttribute('to');
      const tokens = valuesAttr?.split(';').map((t) => t.trim()).filter(Boolean) ?? [];
      const parseNum = (val?: string | null): number | null => {
        if (val === undefined || val === null) return null;
        const num = parseFloat(val);
        return Number.isNaN(num) ? null : num;
      };

      const parent = node.parentElement;
      if (!parent) return;

      let interpolated: number | null = null;

      if (tokens.length >= 2 && tokens.every((v) => parseNum(v) !== null)) {
        interpolated = parseFloat(
          interpolateFromValues(tokens, progress, (a, b, p) => {
            const n1 = parseNum(a) ?? 0;
            const n2 = parseNum(b) ?? n1;
            return String(n1 + (n2 - n1) * p);
          })
        );
      } else {
        const from = parseNum(fromAttr);
        const to = parseNum(toAttr);
        if (from !== null && to !== null) {
          interpolated = from + (to - from) * progress;
        }
      }

      if (interpolated !== null && Number.isFinite(interpolated)) {
        parent.setAttribute(attributeName, String(interpolated));
      }
    });
  }, [interpolateFromValues]);

  /**
   * Apply gradient animation fallback - manually update gradient values when SMIL doesn't work.
   * This reads animate elements directly from the SVG DOM and manually interpolates values.
   */
  const applyGradientFallback = useCallback((svgEl: SVGSVGElement | null, timeSec: number) => {
    if (!svgEl) return;

    // Find all animate elements inside gradients
    const gradients = svgEl.querySelectorAll<SVGGradientElement>('linearGradient, radialGradient');
    
    gradients.forEach((gradientEl) => {
      // Handle stop-color animations on stops
      const stops = gradientEl.querySelectorAll('stop');
      stops.forEach((stopEl) => {
        const animates = stopEl.querySelectorAll<SVGAnimateElement>('animate[attributeName="stop-color"]');
        animates.forEach((animateEl) => {
          const durAttr = animateEl.getAttribute('dur') ?? '0s';
          const durSec = parseFloat(durAttr.replace('s', '')) || 0;
          if (durSec <= 0) return;

          const progress = Math.min(1, Math.max(0, timeSec / durSec));
          
          const valuesAttr = animateEl.getAttribute('values');
          if (valuesAttr) {
            const colors = parseColorValues(valuesAttr);
            if (colors.length >= 2) {
              const interpolatedColor = interpolateFromValues(colors, progress, interpolateColor);
              stopEl.setAttribute('stop-color', interpolatedColor);
            }
          } else {
            // from/to style animation
            const fromColor = animateEl.getAttribute('from') ?? '#000000';
            const toColor = animateEl.getAttribute('to') ?? '#ffffff';
            const interpolatedColor = interpolateColor(fromColor, toColor, progress);
            stopEl.setAttribute('stop-color', interpolatedColor);
          }
        });
      });

      // Handle gradient-level animateTransform
      const transformAnims = gradientEl.querySelectorAll<SVGAnimateTransformElement>('animateTransform');
      transformAnims.forEach((animateEl) => {
        const durAttr = animateEl.getAttribute('dur') ?? '0s';
        const durSec = parseFloat(durAttr.replace('s', '')) || 0;
        if (durSec <= 0) return;

        const progress = Math.min(1, Math.max(0, timeSec / durSec));
        const transformType = animateEl.getAttribute('type') ?? 'rotate';
        const valuesAttr = animateEl.getAttribute('values');
        
        if (valuesAttr) {
          const transformValues = parseTransformValues(valuesAttr);
          if (transformValues.length >= 2 && transformType === 'rotate') {
            // Parse "angle cx cy" format
            const parseRotate = (val: string): [number, number, number] => {
              const parts = val.split(/\s+/).map(Number);
              return [parts[0] || 0, parts[1] ?? 0.5, parts[2] ?? 0.5];
            };

            const interpolateRotate = (v1: string, v2: string, p: number): string => {
              const [a1, cx1, cy1] = parseRotate(v1);
              const [a2, cx2, cy2] = parseRotate(v2);
              const angle = a1 + (a2 - a1) * p;
              const cx = cx1 + (cx2 - cx1) * p;
              const cy = cy1 + (cy2 - cy1) * p;
              return `${angle} ${cx} ${cy}`;
            };

            const interpolatedValue = interpolateFromValues(transformValues, progress, interpolateRotate);
            gradientEl.setAttribute('gradientTransform', `rotate(${interpolatedValue})`);
          }
        }
      });
    });
  }, [interpolateFromValues]);

  const baseContext = useMemo<CanvasRenderContext>(() => ({
    viewport: { zoom: 1, panX: 0, panY: 0 },
    activePlugin: 'animationSystem',
    scaleStrokeWithZoom: true,
    colorMode: 'light',
    rendererOverrides: undefined,
    isElementHidden: () => false,
    isElementLocked: () => false,
    isElementSelected: () => false,
    isSelecting: false,
    elementMap,
    animations,
    animationState: {
      // Use a getter to always get the latest domPlaying without causing re-renders
      get isPlaying() { return domPlayingRef.current; },
      get hasPlayed() { return domPlayingRef.current; },
      // Use a getter to always get the latest currentTime without causing re-renders
      get currentTime() { return currentTimeRef.current; },
      startTime: null,
      playbackRate: 1,
      restartKey,
      chainDelays: new Map(),
      isWorkspaceOpen: true,
    },
    eventHandlers: {},
  }), [animations, restartKey, elementMap]);

  const baseViewBox = useMemo(() => {
    if (!targetElement) return '0 0 200 200';
    const bounds = getElementBoundsService(targetElement, { zoom: 1, panX: 0, panY: 0 });
    if (!bounds) return '0 0 200 200';
    const padding = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.15;
    const x = bounds.minX - padding;
    const y = bounds.minY - padding;
    const w = bounds.maxX - bounds.minX + padding * 2;
    const h = bounds.maxY - bounds.minY + padding * 2;
    return `${x} ${y} ${w} ${h}`;
  }, [targetElement]);

  const renderPreview = useCallback((ctx: CanvasRenderContext = baseContext) => {
    if (!targetElement) return null;
    return canvasRendererRegistry.render(targetElement, ctx);
  }, [baseContext, targetElement]);

  // Helper function to generate SVG HTML with a specific viewBox
  // Used both for the preview useMemo and for manual insertion in handlePlay
  const generateSvgHtml = useCallback((vb: string): string => {
    if (!targetElement) return '';
    
    // Force isPlaying=true so animations use begin="0s" while preview controls timeline manually.
    const previewChainDelays = new Map<string, number>();
    const playingAnimationState = createPlayingAnimationState({
      restartKey,
      isWorkspaceOpen: true,
      isCanvasPreviewMode: false,
      chainDelays: previewChainDelays,
    });
    
    const defsContext = {
      ...canvasStoreApi.getState(),
      // Include all animation types: element, clipPath, gradient, pattern, filter
      animations: [...animations, ...clipAnimations, ...defAnimations],
      animationState: playingAnimationState,
      calculateChainDelays: () => previewChainDelays,
    };
    
    const defsContent = defsContributionRegistry.renderDefs(
      defsContext,
      canvasStoreApi.getState().elements ?? [targetElement]
    );
    
    // Also use playing context for element rendering so animations inside elements have begin="0s"
    const playingContext: CanvasRenderContext = {
      ...baseContext,
      animationState: playingAnimationState,
    };
    const elementContent = renderPreview(playingContext);
    
    const svgMarkup = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox={vb}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>{defsContent}</defs>
        {elementContent}
      </svg>
    );
    
    return ReactDOMServer.renderToStaticMarkup(svgMarkup);
  }, [targetElement, animations, clipAnimations, defAnimations, baseContext, restartKey, renderPreview]);

  // Generate raw SVG HTML string for the preview
  // This avoids React re-rendering and allows SMIL animations to work correctly
  const previewSvgHtml = useMemo(() => {
    if (previewVersion === 0 || !targetElement) return '';
    if (!pendingPreviewRef.current) return '';
    pendingPreviewRef.current = false;
    
    const svgHtml = generateSvgHtml(viewBox);
    
    // Check if the element has clip-path attribute applied
    const hasClipPathAttr = svgHtml.includes('clip-path=');
    const textData = targetElement.data as Record<string, unknown>;
    
    debugLog('Generated SVG HTML', {
      clipTargetId,
      defTargetIds,
      hasClipAnimations: clipAnimations.length > 0,
      hasDefAnimations: defAnimations.length > 0,
      clipAnimationTypes: clipAnimations.map(a => ({ id: a.id, type: a.type, attr: a.attributeName, from: a.from, to: a.to })),
      defAnimationTypes: defAnimations.map(a => ({ id: a.id, type: a.type, attr: a.attributeName, gradientTargetId: a.gradientTargetId, patternTargetId: a.patternTargetId, filterTargetId: a.filterTargetId, maskTargetId: a.maskTargetId })),
      svgHtmlLength: svgHtml.length,
      svgHtmlPreview: svgHtml.substring(0, 500),
      // Critical debug: does the element have clipPath reference?
      hasClipPathAttr,
      elementClipPathId: textData.clipPathId,
      elementClipPathTemplateId: textData.clipPathTemplateId,
    });
    
    return svgHtml;
  }, [previewVersion, targetElement, clipAnimations, defAnimations, viewBox, generateSvgHtml, clipTargetId, defTargetIds]);
  
  // Container ref for the raw SVG
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  // Update the container's innerHTML when previewSvgHtml changes, but NOT during playback
  useEffect(() => {
    if (previewVersion === 0 || !svgContainerRef.current || !previewSvgHtml || domPlaying) return;
    svgContainerRef.current.innerHTML = previewSvgHtml;
    // Get the SVG element and store it in svgRef
    const svgEl = svgContainerRef.current.querySelector('svg') as SVGSVGElement | null;
    if (svgEl) {
      namespaceAllDefs(svgEl);
      svgRef.current = svgEl;
      // Pause animations initially
      svgEl.pauseAnimations?.();
      // Ensure clip fallback matches the initial paused state
      applyClipFallback(svgEl, currentTimeRef.current ?? 0);
    }
  }, [previewSvgHtml, domPlaying, applyClipFallback, namespaceAllDefs, previewVersion]);

  const computeAnimatedViewBox = useCallback(async () => {
    if (previewVersion === 0 || !measureRef.current || !targetElement || (!animations.length && !clipAnimations.length && !defAnimations.length)) {
      setViewBox(baseViewBox);
      return baseViewBox;
    }
    setIsComputing(true);
    const svgEl = measureRef.current;
    const targetNode = svgEl.querySelector('[data-preview-target="true"]') as SVGGraphicsElement | null;
    if (!targetNode) {
      setViewBox(baseViewBox);
      setIsComputing(false);
      return baseViewBox;
    }
    const samples = Math.max(40, Math.ceil((maxDuration || 1) / 0.05));
    const step = (maxDuration || 1) / samples;
    const acc = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const sampleAt = (t: number) => {
      try {
        svgEl.setCurrentTime?.(t);
        const bbox = targetNode.getBBox();
        acc.minX = Math.min(acc.minX, bbox.x);
        acc.minY = Math.min(acc.minY, bbox.y);
        acc.maxX = Math.max(acc.maxX, bbox.x + bbox.width);
        acc.maxY = Math.max(acc.maxY, bbox.y + bbox.height);
      } catch {
        // ignore
      }
    };
    sampleAt(0);
    for (let i = 1; i <= samples; i += 1) {
      sampleAt(step * i);
    }
    // Also sample end explicitly to ensure we catch the final frame
    sampleAt(maxDuration || step * samples);
    const width = Math.max(1, acc.maxX - acc.minX);
    const height = Math.max(1, acc.maxY - acc.minY);
    const padding = Math.max(width, height) * 0.15;
    const computedViewBox = `${acc.minX - padding} ${acc.minY - padding} ${width + padding * 2} ${height + padding * 2}`;
    setViewBox(computedViewBox);
    setIsComputing(false);
    return computedViewBox;
  }, [animations.length, clipAnimations.length, defAnimations.length, baseViewBox, maxDuration, targetElement, previewVersion]);

  const runPlay = useCallback(async () => {
    const computedViewBox = await computeAnimatedViewBox();
    
    // Generate SVG HTML with the correct viewBox and insert it BEFORE starting playback
    // This ensures the clipPath is visible in the viewport
    // The SVG is generated with begin="0s" so the animation starts immediately upon insertion
    if (svgContainerRef.current && targetElement) {
      const finalSvgHtml = generateSvgHtml(computedViewBox);
      svgContainerRef.current.innerHTML = finalSvgHtml;
      const svgEl = svgContainerRef.current.querySelector('svg') as SVGSVGElement | null;
      if (svgEl) {
        svgRef.current = svgEl;
        namespaceAllDefs(svgEl);
        // CRITICAL: When SVG is inserted via innerHTML, the SMIL document starts PAUSED.
        // We must unpause it for animations to run and explicitly trigger beginElement for safety.
        const animateNodes = svgEl.querySelectorAll<SVGAnimationElement>('animate, animateTransform, animateMotion, set');
        animateNodes.forEach((node) => {
          try {
            // beginElement() is needed when animations have begin="indefinite" or were frozen previously
            node.beginElement?.();
          } catch {
            // ignore
          }
        });
        svgEl.setCurrentTime?.(0);
        svgEl.unpauseAnimations?.();
      }
      debugLog('Inserted SVG with correct viewBox before play', { computedViewBox });
    }
    
    // Debug: surface current animation context to console for troubleshooting playback
    debugLog('play', {
      targetElementId: targetElement?.id,
      targetElementClipPathId: (targetElement?.data as Record<string, unknown> | undefined)?.clipPathId,
      targetElementClipPathTemplateId: (targetElement?.data as Record<string, unknown> | undefined)?.clipPathTemplateId,
      clipTargetId,
      animations: animations.map((a) => ({
        id: a.id,
        targetElementId: a.targetElementId,
        clipPathTargetId: a.clipPathTargetId,
        type: a.type,
        attributeName: a.attributeName,
        begin: a.begin,
        dur: a.dur,
        repeatCount: a.repeatCount,
      })),
      clipAnimations: clipAnimations.map((a) => ({
        id: a.id,
        clipPathTargetId: a.clipPathTargetId,
        type: a.type,
        attributeName: a.attributeName,
        begin: a.begin,
        dur: a.dur,
        repeatCount: a.repeatCount,
      })),
      defAnimations: defAnimations.map((a) => ({
        id: a.id,
        gradientTargetId: a.gradientTargetId,
        patternTargetId: a.patternTargetId,
        filterTargetId: a.filterTargetId,
        type: a.type,
        attributeName: a.attributeName,
        begin: a.begin,
        dur: a.dur,
        repeatCount: a.repeatCount,
      })),
      viewBox,
      restartKey,
    });
    debugLogCountRef.current = 0;
    playStartRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Don't increment restartKey during play - it causes React to recreate the SVG
    // which destroys the SMIL animation state.
    setCurrentTime(0);
    setDomPlaying(true);
    // No need for requestAnimationFrame callback - the animation already started with begin="0s"
    // when the SVG was inserted above
  }, [animations, clipAnimations, clipTargetId, computeAnimatedViewBox, defAnimations, generateSvgHtml, namespaceAllDefs, targetElement, viewBox, restartKey]);

  const handlePlay = useCallback(() => {
    const nextDraft = getDraftAnimation?.() ?? draftAnimation ?? latestDraftRef.current ?? null;
    setAppliedDraft(nextDraft);
    latestDraftRef.current = nextDraft;
    pendingPreviewRef.current = true;
    onPreviewActivated?.();
    setPlayRequestId((id) => id + 1);
  }, [draftAnimation, getDraftAnimation, onPreviewActivated]);

  useEffect(() => {
    if (playRequestId === 0) return;
    runPlay();
  }, [playRequestId, runPlay]);

  const handlePause = () => {
    setDomPlaying(false);
    if (svgRef.current?.pauseAnimations) {
      svgRef.current.pauseAnimations();
    }
  };

  const handleStop = () => {
    setDomPlaying(false);
    setCurrentTime(0);
    if (svgRef.current?.setCurrentTime) {
      svgRef.current.setCurrentTime(0);
    }
    if (svgRef.current?.pauseAnimations) {
      svgRef.current.pauseAnimations();
    }
  };

  const handleScrub = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxDuration || val));
    setDomPlaying(false);
    setCurrentTime(clamped);
    if (svgRef.current?.setCurrentTime) {
      svgRef.current.setCurrentTime(clamped);
    }
    applyClipFallback(svgRef.current, clamped);
    applyAttributeAnimationFallback(svgRef.current, clamped);
    if (svgRef.current?.pauseAnimations) {
      svgRef.current.pauseAnimations();
    }
  };

  useEffect(() => {
    // Ensure animations are paused on mount/target change
    if (svgRef.current?.pauseAnimations) {
      svgRef.current.pauseAnimations();
    }
  }, [targetElement?.id]);

  // Ref to track last state update time for throttling
  const lastStateUpdateRef = useRef<number>(0);
  
  // Use ref for maxDuration - only update when NOT playing to avoid mid-animation changes
  const maxDurationRef = useRef(maxDuration);
  // Only update the ref when not playing to prevent mid-animation value changes
  if (!domPlaying) {
    maxDurationRef.current = maxDuration;
  }

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !domPlaying || previewVersion === 0) return;
    // Capture maxDuration at the start of playback
    const capturedMaxDuration = maxDurationRef.current;
    debugLog('tick effect starting', { domPlaying, maxDuration: capturedMaxDuration });
    
    if (playStartRef.current === null) {
      playStartRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
    const start = playStartRef.current;
    let cancelled = false;
    const tick = (ts: number) => {
      if (cancelled) {
        debugLog('tick cancelled, skipping');
        return;
      }
      const elapsed = Math.max(0, (ts - start) / 1000);
      // Use capturedMaxDuration (captured at effect start) to avoid mid-animation changes
      const nextTime = Math.min(capturedMaxDuration || elapsed, elapsed);
      
      // Manually drive the SVG timeline to guarantee SMIL animations advance
      // in environments where unpauseAnimations alone is not enough.
      if (svgEl.animationsPaused?.()) {
        svgEl.unpauseAnimations();
      }
      svgEl.setCurrentTime?.(nextTime);
      applyClipFallback(svgEl, nextTime);
      
      // Apply manual gradient animation fallback - SMIL may not work properly
      // for gradient stop colors and transforms in some browsers
      applyGradientFallback(svgEl, nextTime);
      // Apply generic attribute fallback for simple numeric animations
      applyAttributeAnimationFallback(svgEl, nextTime);
      
      // Force repaint for gradient animations - ensure visual updates are reflected
      forceGradientRepaint(svgEl);
      
      // Update ref for time display without causing re-renders
      currentTimeRef.current = nextTime;
      
      // Throttle state updates so the slider moves smoothly without re-rendering every frame
      if (ts - lastStateUpdateRef.current >= _SLIDER_UPDATE_INTERVAL) {
        setCurrentTime(nextTime);
        lastStateUpdateRef.current = ts;
      }
      
      // Debug logging for first few ticks only
      if (debugLogCountRef.current < 5) {
        // Find all clipPaths and their animate children dynamically
        const allClipPaths = svgEl.querySelectorAll('clipPath');
        const clipPathInfo = Array.from(allClipPaths).map(cp => {
          const animates = cp.querySelectorAll('animate, animateTransform');
          const shapes = cp.querySelectorAll('rect, path, circle, ellipse');
          return {
            id: cp.id,
            animateCount: animates.length,
            shapeCount: shapes.length,
            firstShape: shapes[0] ? {
              tag: shapes[0].tagName,
              width: (shapes[0] as SVGRectElement).width?.animVal?.value,
              baseWidth: (shapes[0] as SVGRectElement).width?.baseVal?.value,
            } : null,
          };
        });
        debugLog('tick', {
          t: nextTime.toFixed(3),
          clipPathInfo,
          allAnimatesInSvg: svgEl.querySelectorAll('animate, animateTransform').length,
        });
        debugLogCountRef.current += 1;
      }
      // Use capturedMaxDuration for comparison
      if (capturedMaxDuration && nextTime >= capturedMaxDuration) {
        // Final state update to ensure slider shows end position
        debugLog('animation complete, stopping', { nextTime, capturedMaxDuration });
        setCurrentTime(nextTime);
        setDomPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      debugLog('tick effect cleanup');
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [domPlaying, applyClipFallback, applyGradientFallback, applyAttributeAnimationFallback, forceGradientRepaint, previewVersion]); // Only depend on domPlaying, use refs for other values

  // Update SVG markup display - use the raw HTML we already generated
  useEffect(() => {
    // Skip frequent updates during playback to prevent interference with SMIL animation
    if (domPlaying || previewVersion === 0) return;
    
    if (previewSvgHtml) {
      setSvgMarkup(formatXml(previewSvgHtml));
    } else {
      setSvgMarkup('');
    }
  }, [previewSvgHtml, domPlaying, previewVersion]);

  // Track the previous domPlaying state to detect transitions
  const prevDomPlayingRef = useRef(domPlaying);
  
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || previewVersion === 0) return;
    
    const wasPlaying = prevDomPlayingRef.current;
    prevDomPlayingRef.current = domPlaying;
    
    // Only act on transitions, not on every currentTime change
    if (domPlaying && !wasPlaying) {
      // Transition to playing - just log for debugging
      // The animation already started with begin="0s" when the SVG was inserted in handlePlay
      debugLog('domPlaying -> playing (transition)', {
        currentTime: currentTimeRef.current,
      });
      
      // Log animate elements for debugging
      const animateElements = svgEl.querySelectorAll('animate, animateTransform, animateMotion, set');
      debugLog('Found animate elements at play start', {
        count: animateElements.length,
        elements: Array.from(animateElements).map(el => ({
          tagName: el.tagName,
          attributeName: el.getAttribute('attributeName'),
          begin: el.getAttribute('begin'),
          dur: el.getAttribute('dur'),
          from: el.getAttribute('from'),
          to: el.getAttribute('to'),
          parentTag: el.parentElement?.tagName,
          parentId: el.parentElement?.id,
        })),
      });
      
      // Log clipPath info for debugging
      const clipPaths = svgEl.querySelectorAll('clipPath');
      debugLog('ClipPaths in DOM at play start', {
        count: clipPaths.length,
        ids: Array.from(clipPaths).map(cp => cp.id),
        contents: Array.from(clipPaths).map(cp => ({
          id: cp.id,
          childCount: cp.children.length,
          children: Array.from(cp.children).map(c => ({ tag: c.tagName, id: (c as Element).id || undefined })),
        })),
      });
      
      // Log elements with clip-path for debugging
      const allElements = svgEl.querySelectorAll('[data-element-id]');
      debugLog('Elements with clip-path attribute', {
        elementsFound: allElements.length,
        elements: Array.from(allElements).map(el => ({
          id: el.getAttribute('data-element-id'),
          tagName: el.tagName,
          clipPathAttr: el.getAttribute('clip-path'),
          clipPathStyle: (el as HTMLElement).style?.clipPath,
        })),
        svgOuterHTML: svgEl.outerHTML.substring(0, 1500),
      });
      
    } else if (!domPlaying && wasPlaying) {
      // Transition to paused
      debugLog('domPlaying -> pause (transition)', { currentTime: currentTimeRef.current });
      svgEl.pauseAnimations?.();
      svgEl.setCurrentTime?.(currentTimeRef.current);
      playStartRef.current = null;
    }
    // Note: scrubbing is handled by handleScrub directly, not by this effect
    // During playback, the tick handler manages animation time
  }, [domPlaying, previewVersion]);

  const previewBg = useColorModeValue('gray.50', 'gray.700');
  const codeBg = useColorModeValue('#f7f7f7', '#1a202c');
  const draftAvailable = useMemo(() => Boolean(draftAnimation || getDraftAnimation?.()), [draftAnimation, getDraftAnimation]);
  const hasPreviewContent = Boolean(
    targetElement && (
      animations.length
      || clipAnimations.length
      || defAnimations.length
      || appliedDraft
      || draftAvailable
    )
  );
  const measurementCtx = useMemo<CanvasRenderContext>(() => {
    const animationState = (baseContext.animationState as Record<string, unknown> | undefined) ?? {};
    const measurementAnimationState = createPlayingAnimationState({
      restartKey: (animationState.restartKey as number | undefined ?? 0) + 1,
      isWorkspaceOpen: true,
      isCanvasPreviewMode: false,
    });
    return {
      ...baseContext,
      animationState: {
        ...animationState,
        // measurement should always simulate playing from t=0
        ...measurementAnimationState,
      },
    };
  }, [baseContext]);

  return (
    <Box borderWidth="1px" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }} borderRadius="md" p={2}>
      <HStack justify="space-between" align="center" mb={2}>
        <Text fontSize="sm" fontWeight="semibold">Preview</Text>
        <HStack spacing={2}>
          {isComputing && <Spinner size="xs" />}
        <PanelStyledButton
          size="xs"
          onClick={handlePlay}
          isDisabled={!hasPreviewContent}
        >
          Play
        </PanelStyledButton>
        <PanelStyledButton
          size="xs"
          onClick={handlePause}
          isDisabled={!hasPreviewContent}
        >
          Pause
        </PanelStyledButton>
        <PanelStyledButton
          size="xs"
          onClick={handleStop}
          isDisabled={!hasPreviewContent}
        >
          Stop
        </PanelStyledButton>
      </HStack>
    </HStack>
      <Box mb={2}>
        <SliderControl
          value={currentTime}
          min={0}
          max={maxDuration || Math.max(1, parseFloat(String((appliedDraft ?? draftAnimation)?.dur ?? '1').replace('s', '')) || 1)}
          step={0.01}
          onChange={handleScrub}
          formatter={(v) => `${v.toFixed(2)}s`}
          valueWidth="60px"
          marginBottom="0"
          inline
        />
      </Box>
      <HStack align="stretch" spacing={2}>
        <Box
          flex="1"
          minH="200px"
          borderWidth="1px"
          borderColor="gray.200"
          _dark={{ borderColor: 'gray.600' }}
          borderRadius="sm"
          bg={previewBg}
          display="flex"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
        >
          {previewVersion > 0 ? (
            targetElement ? (
              <div
                ref={svgContainerRef}
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            ) : (
              <Text fontSize="sm" color="gray.500">Select an element to preview.</Text>
            )
          ) : (
            <Text fontSize="sm" color="gray.500">Press Play to generate the preview.</Text>
          )}
        </Box>
        <Box
          flex="1"
          minH="200px"
          maxH="260px"
          borderWidth="1px"
          borderColor="gray.200"
          _dark={{ borderColor: 'gray.600' }}
          borderRadius="sm"
          bg={codeBg}
          p={2}
          overflowY="auto"
          userSelect="text"
        >
          <HStack justify="space-between" align="center" mb={2}>
            <Text fontSize="xs" color="gray.500">SVG Source</Text>
            <HStack spacing={2}>
              <PanelToggle
                isChecked={isWrapEnabled}
                onChange={(e) => setIsWrapEnabled(e.target.checked)}
              >
                Wrap Text
              </PanelToggle>
              <CopyButton text={svgMarkup || '<svg />'} isDisabled={!svgMarkup} size="xs" />
            </HStack>
          </HStack>
          <Text
            fontFamily="mono"
            fontSize="xs"
            whiteSpace={isWrapEnabled ? 'pre-wrap' : 'pre'}
          >
            {svgMarkup || '<svg />'}
          </Text>
        </Box>
      </HStack>
      {previewVersion > 0 && (
        <Box position="absolute" width="0" height="0" overflow="hidden" opacity={0} pointerEvents="none">
          <svg
            key={`measure-${restartKey}`}
            ref={measureRef}
            width="0"
            height="0"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {defsContributionRegistry.renderDefs(
                {
                  ...canvasStoreApi.getState(),
                  animations: [...animations, ...clipAnimations, ...defAnimations],
                  animationState: {
                    ...(baseContext.animationState ?? {}),
                    restartKey,
                  },
                  calculateChainDelays: () => new Map(),
                },
                targetElement ? [targetElement] : []
              )}
            </defs>
            {targetElement ? (
              <g data-preview-target="true">
                {renderPreview(measurementCtx)}
              </g>
            ) : null}
          </svg>
        </Box>
      )}
    </Box>
  );
};

export const AnimationPreviewPanel = React.memo(AnimationPreviewPanelComponent);

/**
 * Export Utilities - Centralized SVG/PNG export logic
 * Orchestrates export flow while delegating SVG serialization.
 */

import type { CanvasElement } from '../types';
import type { CanvasStore } from '../store/canvasStore';
import { detectThemeColorMode, transformMonoColor } from './colorModeSyncUtils';
import { logger } from './logger';
import {
  getPausedAnimationTime,
  prepareExportAnimationState,
} from './animationStatePreparation';
import {
  serializePathsForExport,
  type ExportOptions,
  type SerializedExport,
} from './export/svgSerialization';

export { serializePathsForExport };
export type { ExportOptions, SerializedExport };

/**
 * Helper to download a blob as a file.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { parseSeconds } from './svgLengthUtils';

/**
 * Linear interpolation between two values.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Apply a single SMIL animation element's interpolated value
 * to its parent SVG element at the given time.
 */
function applyAnimatedValue(anim: SVGAnimationElement, currentTime: number): void {
  const parent = anim.parentElement as SVGElement | null;
  if (!parent) return;

  const dur = parseSeconds(anim.getAttribute('dur')) || 0.00001;
  const repeatDur = parseSeconds(anim.getAttribute('repeatDur'));
  const begin = parseSeconds(anim.getAttribute('begin'));
  const effectiveDur = repeatDur > 0 ? repeatDur : dur;
  const localT = Math.max(0, currentTime - begin);
  const progress = Math.min(1, effectiveDur > 0 ? localT / effectiveDur : 1);

  const attrName = anim.getAttribute('attributeName');
  if (!attrName) return;

  if (anim.tagName === 'animateTransform') {
    const type = anim.getAttribute('type') || 'translate';
    const from = anim.getAttribute('from') || '';
    const to = anim.getAttribute('to') || '';
    const parseNums = (v: string): number[] => v.split(/[\s,]+/).filter(Boolean).map(Number);
    const fromNums = parseNums(from);
    const toNums = parseNums(to);
    const count = Math.min(fromNums.length, toNums.length);
    if (count === 0) return;

    const values: number[] = [];
    for (let i = 0; i < count; i += 1) {
      values.push(lerp(fromNums[i], toNums[i], progress));
    }
    parent.setAttribute('transform', `${type}(${values.join(' ')})`);
    return;
  }

  // Basic numeric interpolation for <animate>.
  const from = anim.getAttribute('from');
  const to = anim.getAttribute('to');
  const fromNum = from !== null ? parseFloat(from) : null;
  const toNum = to !== null ? parseFloat(to) : null;
  if (fromNum !== null && toNum !== null && Number.isFinite(fromNum) && Number.isFinite(toNum)) {
    parent.setAttribute(attrName, String(lerp(fromNum, toNum, progress)));
  } else if (to) {
    parent.setAttribute(attrName, to);
  }
}

/**
 * Create an offscreen container, insert SVG content, and return both.
 */
function createOffscreenSvgContainer(svgContent: string): { container: HTMLDivElement; svgEl: SVGSVGElement | null } {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '-99999px';
  container.style.width = '0';
  container.style.height = '0';
  container.style.overflow = 'hidden';
  container.innerHTML = svgContent;

  return { container, svgEl: container.querySelector('svg') };
}

/**
 * Freeze an animated SVG at a given timeline time and return serialized markup.
 */
function snapshotSvgAtTime(svgContent: string, currentTime?: number | null): string {
  if (currentTime === undefined || currentTime === null || typeof document === 'undefined') {
    return svgContent;
  }

  try {
    const { container, svgEl } = createOffscreenSvgContainer(svgContent);
    if (!svgEl) return svgContent;

    document.body.appendChild(container);
    try {
      // Advance timeline to the requested time, then pause to freeze that frame.
      svgEl.unpauseAnimations?.();
      svgEl.setCurrentTime?.(currentTime);
      svgEl.unpauseAnimations?.();
      svgEl.setCurrentTime?.(currentTime);
      svgEl.pauseAnimations?.();
      svgEl.setCurrentTime?.(currentTime);

      // Force layout to apply the frame before serialization.
      const rootGroup = svgEl.querySelector<SVGGElement>('[data-export-root="true"]');
      rootGroup?.getBBox?.();

      // Apply animated values and remove animation nodes.
      const animNodes = svgEl.querySelectorAll<SVGAnimationElement>('animate, animateTransform');
      animNodes.forEach((node) => applyAnimatedValue(node, currentTime));
      animNodes.forEach((node) => node.remove());
    } catch {
      // Ignore setCurrentTime failures.
    }

    const serialized = new XMLSerializer().serializeToString(svgEl);
    container.remove();
    return serialized;
  } catch {
    return svgContent;
  }
}

function convertSvgToPngAndDownload(
  svgContent: string,
  bounds: SerializedExport['bounds'],
  filename: string,
  currentTime?: number | null
): void {
  const snapshot = snapshotSvgAtTime(svgContent, currentTime);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(snapshot)}`;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    logger.error('Could not get canvas context');
    return;
  }

  // Scale for high-DPI displays so exported PNGs are crisp on Retina screens
  const dpr = window.devicePixelRatio || 1;
  canvas.width = bounds.width * dpr;
  canvas.height = bounds.height * dpr;
  canvas.style.width = `${bounds.width}px`;
  canvas.style.height = `${bounds.height}px`;
  ctx.scale(dpr, dpr);

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, bounds.width, bounds.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        logger.error('Could not create PNG blob');
        return;
      }
      downloadBlob(blob, filename);
    }, 'image/png');
  };
  img.onerror = () => {
    logger.error('Failed to load SVG image');
  };
  img.src = svgDataUrl;
}

const transformMonoColorsInSvg = (svgContent: string, targetMode: 'light' | 'dark'): string => {
  const monoRegex = /#(?:fff|ffffff|000|000000)\b/gi;
  return svgContent.replace(monoRegex, (match) => {
    const normalized = match.length === 4
      ? `#${match[1]}${match[1]}${match[2]}${match[2]}${match[3]}${match[3]}`
      : match.toLowerCase();
    return transformMonoColor(normalized, targetMode);
  });
};

/**
 * Unified export function for both SVG and PNG formats.
 */
export function exportSelection(
  format: 'svg' | 'png',
  elements: CanvasElement[],
  selectedIds: string[],
  documentName: string,
  selectedOnly: boolean = false,
  padding: number = 20,
  defsContent?: string,
  state?: CanvasStore
): void {
  // Prepare animation state so definition animations render during export.
  const exportState = state ? prepareExportAnimationState(state) : undefined;
  const colorMode = detectThemeColorMode();

  if (elements.length === 0) {
    return;
  }

  const result = serializePathsForExport(elements, selectedIds, {
    selectedOnly,
    padding: selectedOnly ? 0 : padding,
    defs: defsContent,
    state: exportState,
    normalizeMetadataToLightMode: colorMode === 'dark',
  });

  if (!result) {
    return;
  }

  const { svgContent, bounds } = result;
  const sanitizedName = documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const finalSvg = colorMode === 'dark' ? transformMonoColorsInSvg(svgContent, 'dark') : svgContent;

  const pausedTime = getPausedAnimationTime(exportState);

  if (format === 'svg') {
    const blob = new Blob([finalSvg], { type: 'image/svg+xml' });
    downloadBlob(blob, `${sanitizedName}.svg`);
  } else if (format === 'png') {
    convertSvgToPngAndDownload(finalSvg, bounds, `${sanitizedName}.png`, pausedTime);
  }
}

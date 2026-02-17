/**
 * Export Utilities - Centralized SVG/PNG export logic
 * Eliminates duplication between saveAsSvg and saveAsPng
 */

import type { CanvasElement, GroupElement, PathElement, Viewport } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import type { Bounds } from '../boundsUtils';
import { mergeBounds } from '../measurementUtils';
import { buildElementMap } from '../elementMapUtils';
import { logger } from '../logger';
import { elementContributionRegistry } from '../elementContributionRegistry';
import { animationContributionRegistry } from '../animationContributionRegistry';
import { escapeXmlAttribute } from '../xmlEscapeUtils';
import { pluginManager } from '../pluginManager';
import { parseSeconds } from '../svgLengthUtils';
import { serializePathElement } from './pathSerialization';
import { safeChildIdsFromElement as safeChildIds } from '../groupTraversalUtils';
import { isMonoColor, transformMonoColor } from '../colorModeSyncUtils';

export interface ExportOptions {
  selectedOnly: boolean;
  padding?: number;
  defs?: string;
  state?: CanvasStore;
  normalizeMetadataToLightMode?: boolean;
}

export interface SerializedExport {
  svgContent: string;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

interface ExportNode {
  element: CanvasElement;
  children: ExportNode[];
}

type ArtboardExportBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

type ExportArtboardState = {
  enabled?: boolean;
  selectedPresetId?: string | null;
  customWidth?: number;
  customHeight?: number;
  backgroundColor?: string;
  showMargins?: boolean;
  marginSize?: number;
};

interface ExportedArtboardMetadata {
  version: number;
  enabled: boolean;
  selectedPresetId: string | null;
  customWidth: number;
  customHeight: number;
  backgroundColor: string;
  showMargins: boolean;
  marginSize: number;
  exportBounds: ArtboardExportBounds;
}

const VECTORNEST_ARTBOARD_METADATA_ID = 'vectornest-artboard';
const VECTORNEST_ARTBOARD_METADATA_ATTR = 'data-vectornest-artboard';
const VECTORNEST_ARTBOARD_BACKGROUND_ATTR = 'data-vectornest-artboard-background';
const ARTBOARD_METADATA_VERSION = 2;

const toFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toPositiveNumber = (value: unknown, fallback: number): number => {
  const resolved = toFiniteNumber(value, fallback);
  return resolved > 0 ? resolved : fallback;
};

const toNonNegativeNumber = (value: unknown, fallback: number): number => {
  const resolved = toFiniteNumber(value, fallback);
  return resolved >= 0 ? resolved : fallback;
};

const getExportArtboardState = (state?: CanvasStore): ExportArtboardState | null => {
  const candidate = (state as unknown as { artboard?: ExportArtboardState } | undefined)?.artboard;
  if (!candidate) {
    return null;
  }
  return candidate;
};

const serializeArtboardMetadata = (
  state: CanvasStore | undefined,
  artboardBounds: ArtboardExportBounds | null,
  normalizeToLightMode: boolean
): string | null => {
  const artboardState = getExportArtboardState(state);
  if (!artboardState?.enabled || !artboardBounds) {
    return null;
  }

  const exportBounds: ArtboardExportBounds = {
    minX: toFiniteNumber(artboardBounds.minX, 0),
    minY: toFiniteNumber(artboardBounds.minY, 0),
    width: toPositiveNumber(artboardBounds.width, 1),
    height: toPositiveNumber(artboardBounds.height, 1),
  };

  const normalizeColorForMetadata = (color: string): string => {
    if (!normalizeToLightMode || !isMonoColor(color)) {
      return color;
    }
    return transformMonoColor(color, 'light');
  };

  const payload: ExportedArtboardMetadata = {
    version: ARTBOARD_METADATA_VERSION,
    enabled: true,
    selectedPresetId: typeof artboardState.selectedPresetId === 'string'
      ? artboardState.selectedPresetId
      : null,
    customWidth: toPositiveNumber(artboardState.customWidth, exportBounds.width),
    customHeight: toPositiveNumber(artboardState.customHeight, exportBounds.height),
    backgroundColor: typeof artboardState.backgroundColor === 'string'
      ? normalizeColorForMetadata(artboardState.backgroundColor)
      : 'none',
    showMargins: Boolean(artboardState.showMargins),
    marginSize: toNonNegativeNumber(artboardState.marginSize, 20),
    exportBounds,
  };

  return encodeURIComponent(JSON.stringify(payload));
};

function serializeElementWithContribution(element: CanvasElement, indent: string, state?: CanvasStore): string | null {
  const isHidden = state?.isElementHidden?.(element.id) ?? false;
  const applyHiddenDisplay = (markup: string): string => {
    if (!isHidden) return markup;
    const withReplacedDisplay = markup.replace(/^(\s*<[^>]*?)\sdisplay="[^"]*"/, '$1 display="none"');
    if (withReplacedDisplay !== markup) {
      return withReplacedDisplay;
    }
    return markup.replace(/^(\s*<\w+)/, '$1 display="none"');
  };

  if (element.type === 'path') {
    return serializePathElement(element as PathElement, indent, state);
  }

  const serialized = elementContributionRegistry.serializeElement(element);
  if (!serialized) {
    return null;
  }

  // Check for animations on non-path elements
  if (state) {
    const animations = animationContributionRegistry.serializeAnimationsForElement(state, element);
    if (animations.length > 0) {
      // Need to inject animations into the element
      // Convert self-closing tag to tag with children
      const selfClosingMatch = serialized.match(/^(<\w+[^>]*)\s*\/>$/);
      if (selfClosingMatch) {
        const animLines = animations.split('\n').map(line => `  ${line}`).join('\n');
        return applyHiddenDisplay(`${indent}${selfClosingMatch[1]}>\n${indent}${animLines}\n${indent}</${serialized.match(/^<(\w+)/)?.[1] ?? 'element'}>`);
      }
      // For non-self-closing tags, inject before the closing tag
      const closingMatch = serialized.match(/^(.*)<\/(\w+)>$/s);
      if (closingMatch) {
        const animLines = animations.split('\n').map(line => `  ${line}`).join('\n');
        return applyHiddenDisplay(`${indent}${closingMatch[1]}${animLines}\n${indent}</${closingMatch[2]}>`);
      }
    }
  }

  // Keep indentation consistent with group serialization
  return applyHiddenDisplay(`${indent}${serialized}`);
}

/**
 * Serialize an export node (group or path) recursively
 */
function serializeNode(node: ExportNode, indentLevel: number, state?: CanvasStore): string {
  const indent = '  '.repeat(indentLevel);

  if (node.element.type !== 'group') {
    return serializeElementWithContribution(node.element, indent, state) ?? '';
  }

  const groupElement = node.element as GroupElement;
  const attributes: string[] = [`id="${groupElement.id}"`];
  const isHidden = state?.isElementHidden?.(groupElement.id) ?? Boolean(groupElement.data.isHidden);
  if (groupElement.data.name) {
    attributes.push(`data-name="${escapeXmlAttribute(groupElement.data.name)}"`);
  }
  if (isHidden) {
    attributes.push('display="none"');
  }

  if (groupElement.data.transformMatrix) {
    attributes.push(`transform="matrix(${groupElement.data.transformMatrix.join(' ')})"`);
  } else {
    const t = groupElement.data.transform;
    if (t && (t.translateX !== 0 || t.translateY !== 0 || t.rotation !== 0 || t.scaleX !== 1 || t.scaleY !== 1)) {
      const transform = `translate(${t.translateX},${t.translateY}) rotate(${t.rotation}) scale(${t.scaleX},${t.scaleY})`;
      attributes.push(`transform="${transform}"`);
    }
  }

  if (groupElement.data.filterId) {
    attributes.push(`filter="url(#${groupElement.data.filterId})"`);
  }

  if (groupElement.data.opacity !== undefined) {
    attributes.push(`opacity="${groupElement.data.opacity}"`);
  }

  const groupClipRef = groupElement.data.clipPathId ?? groupElement.data.clipPathTemplateId;
  if (groupClipRef) {
    attributes.push(`clip-path="url(#${groupClipRef})"`);
  }
  if ((groupElement.data as { maskId?: string }).maskId) {
    attributes.push(`mask="url(#${(groupElement.data as { maskId?: string }).maskId})"`);
  }
  const groupStyleParts: string[] = [];
  if (groupElement.data.mixBlendMode) groupStyleParts.push(`mix-blend-mode:${groupElement.data.mixBlendMode}`);
  if (groupElement.data.isolation) groupStyleParts.push(`isolation:${groupElement.data.isolation}`);
  if (groupStyleParts.length) {
    attributes.push(`style="${groupStyleParts.join(';')}"`);
  }

  const animations = state
    ? animationContributionRegistry.serializeAnimationsForElement(state, groupElement)
    : '';
  const hasAnimations = animations.length > 0;

  if (node.children.length === 0 && !hasAnimations) {
    return `${indent}<g${attributes.length ? ' ' + attributes.join(' ') : ''} />`;
  }

  const childrenContent = node.children.map(child => serializeNode(child, indentLevel + 1, state)).join('\n');

  let result = `${indent}<g${attributes.length ? ' ' + attributes.join(' ') : ''}>\n`;
  if (hasAnimations) {
    result += animations.split('\n').map(line => `${indent}  ${line}`).join('\n') + '\n';
  }
  if (childrenContent) {
    result += childrenContent + '\n';
  }
  result += `${indent}</g>`;

  return result;
}

/**
 * Collect bounds for all renderable elements from export nodes recursively.
 */
function collectElementBounds(nodes: ExportNode[], viewport: Viewport, elementMap: Map<string, CanvasElement>): Bounds[] {
  const bounds: Bounds[] = [];

  nodes.forEach(node => {
    if (node.element.type === 'group') {
      bounds.push(...collectElementBounds(node.children, viewport, elementMap));
    } else {
      const elementBounds = elementContributionRegistry.getBounds(node.element, {
        viewport,
        elementMap,
      });

      if (elementBounds) {
        bounds.push(elementBounds);
      }
    }
  });

  return bounds;
}

/**
 * Build export tree respecting hierarchy
 */
function buildExportTree(
  elements: CanvasElement[],
  selectedIds: string[],
  selectedOnly: boolean
): ExportNode[] {
  const elementMap = buildElementMap(elements);

  const selectedSet = new Set(selectedIds);

  const hasSelectedAncestor = (element: CanvasElement): boolean => {
    if (!element.parentId) return false;
    let currentParentId: string | null | undefined = element.parentId;
    while (currentParentId) {
      if (selectedSet.has(currentParentId)) {
        return true;
      }
      const parent = elementMap.get(currentParentId);
      currentParentId = parent?.parentId;
    }
    return false;
  };

  const buildNode = (element: CanvasElement): ExportNode | null => {
    if (element.type === 'group') {
      const childNodes = safeChildIds(element)
        .map((childId: string) => elementMap.get(childId))
        .filter((child: CanvasElement | undefined): child is CanvasElement => Boolean(child))
        .map((child: CanvasElement) => buildNode(child))
        .filter((node: ExportNode | null | undefined): node is ExportNode => Boolean(node));

      if (childNodes.length === 0 && selectedOnly) {
        return null;
      }

      return { element, children: childNodes };
    }

    // Treat plugin-defined elements as leaves in the export tree
    return { element, children: [] };
  };

  let rootElements: CanvasElement[];
  if (selectedOnly) {
    rootElements = selectedIds
      .map(id => elementMap.get(id))
      .filter((element): element is CanvasElement => Boolean(element))
      .filter(element => !hasSelectedAncestor(element))
      .sort((a, b) => a.zIndex - b.zIndex);
  } else {
    rootElements = elements
      .filter(element => !element.parentId)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  return rootElements
    .map(element => buildNode(element))
    .filter((node): node is ExportNode => Boolean(node));
}

/**
 * Centralized function to serialize paths for export
 * Used by both saveAsSvg and saveAsPng to ensure consistency
 * 
 * @param elements - All canvas elements
 * @param selectedIds - Currently selected element IDs
 * @param options - Export options (selectedOnly, padding)
 * @returns Serialized SVG content and bounds
 */
export function serializePathsForExport(
  elements: CanvasElement[],
  selectedIds: string[],
  options: ExportOptions
): SerializedExport | null {
  const { selectedOnly, padding = 0, defs, state, normalizeMetadataToLightMode = false } = options;

  // Build export tree respecting hierarchy
  const exportNodes = buildExportTree(elements, selectedIds, selectedOnly);
  const elementMap = buildElementMap(elements);

  if (exportNodes.length === 0) {
    return null;
  }

  const boundsList = collectElementBounds(exportNodes, { zoom: 1, panX: 0, panY: 0 }, elementMap);
  const calculatedBounds = mergeBounds(boundsList);

  // Check if artboard is enabled and use its bounds instead
  const artboardApi = pluginManager.getPluginApi<{
    getExportBounds: () => ArtboardExportBounds | null;
    isEnabled: () => boolean;
  }>('artboard');

  const artboardBounds = artboardApi?.isEnabled() ? artboardApi.getExportBounds() : null;
  const hasFixedArtboardExportBounds = Boolean(artboardBounds);
  const artboardMetadataPayload = serializeArtboardMetadata(
    state,
    artboardBounds,
    normalizeMetadataToLightMode
  );
  const artboardBackgroundColor = (() => {
    const artboardState = getExportArtboardState(state);
    if (!artboardState?.enabled) return null;
    const background = artboardState.backgroundColor;
    if (!background || background === 'none') return null;
    return background;
  })();

  // Use fallback bounds if calculation fails - allows Structure Panel to work
  // even when individual element bounds can't be determined
  const fallbackBounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  // Use artboard bounds if available, otherwise use calculated bounds
  let bounds: Bounds;
  if (artboardBounds) {
    // Use artboard bounds for export (fixed size)
    bounds = {
      minX: artboardBounds.minX,
      minY: artboardBounds.minY,
      maxX: artboardBounds.minX + artboardBounds.width,
      maxY: artboardBounds.minY + artboardBounds.height,
    };
  } else {
    bounds = calculatedBounds ?? fallbackBounds;
  }

  if (!artboardBounds && (!boundsList.length || !calculatedBounds)) {
    logger.warn('Could not calculate bounds for export, using fallback');
  }

  // Serialize all nodes to SVG markup (pass state for animation export)
  const serializedElements = exportNodes.map(node => serializeNode(node, 1, state)).join('\n');

  // Compute animated bounds (run animations once, similar to workspace preview) when animations exist
  const stateWithAnimations = state as unknown as { animations?: unknown[] } | undefined;
  const hasAnimations = Boolean(stateWithAnimations?.animations?.length);

  const baseWidth = Math.max(1, bounds.maxX - bounds.minX);
  const baseHeight = Math.max(1, bounds.maxY - bounds.minY);
  const baseViewBox = `${bounds.minX} ${bounds.minY} ${baseWidth} ${baseHeight}`;
  const animatedBounds = hasAnimations && !hasFixedArtboardExportBounds
    ? computeAnimatedBoundsForExport(serializedElements, defs, baseViewBox)
    : null;

  const finalBounds = hasFixedArtboardExportBounds ? bounds : (animatedBounds ?? bounds);

  // Artboard exports keep a fixed canvas size and ignore extra export padding.
  const effectivePadding = hasFixedArtboardExportBounds ? 0 : padding;
  // Apply padding after animated bounds are resolved
  let { minX, minY, maxX, maxY } = finalBounds;
  minX -= effectivePadding;
  minY -= effectivePadding;
  maxX += effectivePadding;
  maxY += effectivePadding;

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const viewBox = `${minX} ${minY} ${width} ${height}`;

  // Check if content uses href references (for xlink namespace compatibility)
  const combinedContent = (defs ?? '') + (serializedElements ?? '');
  const needsXlink = /\bhref="#/.test(combinedContent) || /xlink:href/.test(combinedContent);
  const hasForeignObject = exportNodes.some((node) => {
    const check = (n: ExportNode): boolean =>
      n.element.type === 'foreignObject' || n.children.some((child) => check(child));
    return check(node);
  });

  // Build complete SVG document
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  const baseAttrs = [
    `width="${width}"`,
    `height="${height}"`,
    `viewBox="${viewBox}"`,
    `xmlns="http://www.w3.org/2000/svg"`,
  ];
  if (needsXlink) baseAttrs.push(`xmlns:xlink="http://www.w3.org/1999/xlink"`);
  if (hasForeignObject) baseAttrs.push(`xmlns:xhtml="http://www.w3.org/1999/xhtml"`);
  svgContent += `<svg ${baseAttrs.join(' ')}>`;

  if (artboardMetadataPayload) {
    const escapedPayload = escapeXmlAttribute(artboardMetadataPayload);
    svgContent += `\n<metadata id="${VECTORNEST_ARTBOARD_METADATA_ID}" ${VECTORNEST_ARTBOARD_METADATA_ATTR}="${escapedPayload}" />\n`;
  }

  if (defs) {
    svgContent += `\n${defs}\n`;
  }

  if (hasFixedArtboardExportBounds && artboardBounds && artboardBackgroundColor) {
    const fill = escapeXmlAttribute(artboardBackgroundColor);
    svgContent += `<rect ${VECTORNEST_ARTBOARD_BACKGROUND_ATTR}="true" x="${artboardBounds.minX}" y="${artboardBounds.minY}" width="${artboardBounds.width}" height="${artboardBounds.height}" fill="${fill}" />\n`;
  }

  if (serializedElements) {
    svgContent += `${defs ? '' : '\n'}${serializedElements}\n`;
  }

  svgContent += `</svg>`;

  return {
    svgContent,
    bounds: { minX, minY, maxX, maxY, width, height }
  };
}

/**
 * Estimate animated bounds by sampling the exported SVG timeline.
 */
function computeAnimatedBoundsForExport(
  serializedElements: string,
  defs: string | undefined,
  initialViewBox: string
): Bounds | null {
  if (typeof document === 'undefined') return null;

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.left = '-99999px';
  tempContainer.style.top = '-99999px';
  tempContainer.style.width = '0';
  tempContainer.style.height = '0';
  tempContainer.style.overflow = 'hidden';

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgEl.setAttribute('viewBox', initialViewBox);
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svgEl.innerHTML = `${defs ? `<defs>${defs}</defs>` : ''}<g data-export-root="true">${serializedElements}</g>`;
  tempContainer.appendChild(svgEl);
  document.body.appendChild(tempContainer);

  const animateNodes = svgEl.querySelectorAll<SVGAnimationElement>('animate, animateTransform, animateMotion, set');
  animateNodes.forEach((node) => {
    node.setAttribute('repeatCount', '1');
  });

  let maxDuration = 0;
  animateNodes.forEach((node) => {
    const dur = parseSeconds(node.getAttribute('dur'));
    const repeatDur = parseSeconds(node.getAttribute('repeatDur'));
    const effectiveDur = repeatDur > 0 ? repeatDur : dur;
    if (effectiveDur > maxDuration) {
      maxDuration = effectiveDur;
    }
  });
  if (maxDuration <= 0) {
    maxDuration = 1;
  }

  const samples = Math.max(40, Math.ceil(maxDuration / 0.05));
  const step = (maxDuration || 1) / samples;
  const acc = { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY };
  const rootGroup = svgEl.querySelector<SVGGElement>('[data-export-root="true"]');

  const sampleAt = (t: number) => {
    try {
      svgEl.setCurrentTime?.(t);
    } catch {
      // ignore
    }
    if (!rootGroup) return;
    try {
      const bbox = rootGroup.getBBox();
      acc.minX = Math.min(acc.minX, bbox.x);
      acc.minY = Math.min(acc.minY, bbox.y);
      acc.maxX = Math.max(acc.maxX, bbox.x + bbox.width);
      acc.maxY = Math.max(acc.maxY, bbox.y + bbox.height);
    } catch {
      // ignore measurement errors
    }
  };

  sampleAt(0);
  for (let i = 1; i <= samples; i += 1) {
    sampleAt(step * i);
  }
  sampleAt(maxDuration);

  tempContainer.remove();

  if (![acc.minX, acc.minY, acc.maxX, acc.maxY].every((v) => Number.isFinite(v))) {
    return null;
  }

  return {
    minX: acc.minX,
    minY: acc.minY,
    maxX: acc.maxX,
    maxY: acc.maxY,
  };
}

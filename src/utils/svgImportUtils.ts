/**
 * SVG Import Utilities
 * Handles importing SVG files and converting them to internal path format.
 */

import type { PathData } from '../types';
import { pluginManager } from './pluginManager';
import { detectThemeColorMode, isMonoColor, transformMonoColor } from './colorModeSyncUtils';
import {
  ensureMaskImports,
  parseMaskDefs,
  type MaskImportDefinition,
} from './import/maskImportUtils';
import {
  applyGlobalTextStyleToNodes,
  extractGlobalTextStyle,
} from './import/textStyleUtils';
import { generateShortId } from './idGenerator';
import { parseSvgDocument } from './svg/parser';
import { applyEmbeddedClassStyles } from './svg/styleAttributes';
import { extractSVGDimensions, flattenImportedElements } from './svg/importHelpers';
import { processElement, type TextPathAttachment } from './svg/processElement';
import type {
  ImportedArtboardMetadata,
  ImportedElement,
  SVGDimensions,
  SVGImportResult,
} from './svg/importTypes';

// Re-export for backward compatibility.
export { shapeToPath } from './import/shapeToPath';
export { extractStyleAttributes } from './svg/styleAttributes';
export { flattenImportedElements } from './svg/importHelpers';
export type { Matrix } from './svg/transform';
export type {
  ImportedArtboardMetadata,
  ImportedElement,
  ImportedEmbeddedSvgElement,
  ImportedForeignObjectElement,
  ImportedGroupElement,
  ImportedImageElement,
  ImportedNativeShapeElement,
  ImportedNativeTextElement,
  ImportedPathElement,
  ImportedSymbolInstanceElement,
  ImportedUseElement,
  SVGDimensions,
  SVGImportResult,
} from './svg/importTypes';

const VECTORNEST_ARTBOARD_METADATA_ID = 'vectornest-artboard';
const VECTORNEST_ARTBOARD_METADATA_ATTR = 'data-vectornest-artboard';
const VECTORNEST_ARTBOARD_BACKGROUND_ATTR = 'data-vectornest-artboard-background';
const DEFAULT_ARTBOARD_MARGIN = 20;

type LooseRecord = Record<string, unknown>;

const isLooseRecord = (value: unknown): value is LooseRecord => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const normalizeMonoColorLiteral = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === '#000000' || normalized === '#000') return '#000000';
  if (normalized === '#ffffff' || normalized === '#fff') return '#ffffff';
  return null;
};

const swapMonoColorLiteral = (value: string): string => {
  const normalized = normalizeMonoColorLiteral(value);
  if (!normalized) return value;
  if (!isMonoColor(normalized)) return value;
  return transformMonoColor(normalized, 'dark');
};

const transformImportedMonoColorValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return swapMonoColorLiteral(value);
  }

  if (Array.isArray(value)) {
    let changed = false;
    const nextArray = value.map((item) => {
      const nextItem = transformImportedMonoColorValue(item);
      if (nextItem !== item) {
        changed = true;
      }
      return nextItem;
    });
    return changed ? nextArray : value;
  }

  if (isLooseRecord(value)) {
    let changed = false;
    const nextObject: LooseRecord = {};
    Object.entries(value).forEach(([key, nestedValue]) => {
      const nextValue = transformImportedMonoColorValue(nestedValue);
      if (nextValue !== nestedValue) {
        changed = true;
      }
      nextObject[key] = nextValue;
    });
    return changed ? nextObject : value;
  }

  return value;
};

const transformImportedElementsForDarkMode = (elements: ImportedElement[]): ImportedElement[] => {
  let changed = false;
  const transformed: ImportedElement[] = elements.map((element): ImportedElement => {
    if (element.type === 'group') {
      const nextChildren = transformImportedElementsForDarkMode(element.children);
      if (nextChildren !== element.children) {
        changed = true;
        return {
          ...element,
          children: nextChildren,
        };
      }
      return element;
    }

    const nextData = transformImportedMonoColorValue(element.data);
    if (nextData !== element.data) {
      changed = true;
      return {
        ...element,
        data: nextData as typeof element.data,
      } as ImportedElement;
    }

    return element;
  });

  return changed ? transformed : elements;
};

const transformArtboardMetadataForDarkMode = (
  artboardMetadata: ImportedArtboardMetadata | null
): ImportedArtboardMetadata | null => {
  if (!artboardMetadata) {
    return null;
  }
  // Metadata v1 may already be encoded in either light or dark, depending on when it was exported.
  // Only normalize v2+ payloads, which are explicitly exported with light-mode mono values.
  if (artboardMetadata.version < 2) {
    return artboardMetadata;
  }

  const nextBackgroundColor = swapMonoColorLiteral(artboardMetadata.backgroundColor);
  if (nextBackgroundColor === artboardMetadata.backgroundColor) {
    return artboardMetadata;
  }

  return {
    ...artboardMetadata,
    backgroundColor: nextBackgroundColor,
  };
};

const decodeMetadataPayload = (value: string): unknown => {
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
};

const extractArtboardMetadata = (svgElement: Element): ImportedArtboardMetadata | null => {
  const metadataNode = Array.from(svgElement.children).find((child) => {
    if (child.tagName.toLowerCase() !== 'metadata') {
      return false;
    }
    return (
      child.getAttribute(VECTORNEST_ARTBOARD_METADATA_ATTR) !== null ||
      child.getAttribute('id') === VECTORNEST_ARTBOARD_METADATA_ID
    );
  });

  if (!metadataNode) {
    return null;
  }

  const encodedPayload = metadataNode.getAttribute(VECTORNEST_ARTBOARD_METADATA_ATTR)?.trim()
    || metadataNode.textContent?.trim();
  if (!encodedPayload) {
    return null;
  }

  const parsed = decodeMetadataPayload(encodedPayload);
  if (!isLooseRecord(parsed)) {
    return null;
  }

  const parsedBounds = parsed.exportBounds;
  if (!isLooseRecord(parsedBounds)) {
    return null;
  }

  const minX = toFiniteNumber(parsedBounds.minX);
  const minY = toFiniteNumber(parsedBounds.minY);
  const width = toFiniteNumber(parsedBounds.width);
  const height = toFiniteNumber(parsedBounds.height);

  if (minX === null || minY === null || width === null || height === null || width <= 0 || height <= 0) {
    return null;
  }

  const versionRaw = toFiniteNumber(parsed.version);
  const customWidthRaw = toFiniteNumber(parsed.customWidth);
  const customHeightRaw = toFiniteNumber(parsed.customHeight);
  const marginSizeRaw = toFiniteNumber(parsed.marginSize);
  const backgroundColor = typeof parsed.backgroundColor === 'string' && parsed.backgroundColor.trim()
    ? parsed.backgroundColor
    : 'none';

  return {
    version: versionRaw !== null && versionRaw > 0 ? Math.floor(versionRaw) : 1,
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
    selectedPresetId: typeof parsed.selectedPresetId === 'string' ? parsed.selectedPresetId : null,
    customWidth: customWidthRaw !== null && customWidthRaw > 0 ? customWidthRaw : width,
    customHeight: customHeightRaw !== null && customHeightRaw > 0 ? customHeightRaw : height,
    backgroundColor,
    showMargins: Boolean(parsed.showMargins),
    marginSize: marginSizeRaw !== null && marginSizeRaw >= 0 ? marginSizeRaw : DEFAULT_ARTBOARD_MARGIN,
    exportBounds: {
      minX,
      minY,
      width,
      height,
    },
  };
};

/**
 * Import SVG file and return both dimensions and imported element data.
 */
export async function importSVGWithDimensions(file: File): Promise<SVGImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const svgContent = e.target?.result as string;
        const doc = parseSvgDocument(svgContent);

        const svgElement = doc.querySelector('svg');
        if (!svgElement) {
          reject(new Error('No SVG element found'));
          return;
        }

        // Inline style/class rules into attributes so downstream processing sees native values.
        applyEmbeddedClassStyles(doc);

        const dimensions: SVGDimensions = extractSVGDimensions(svgElement);
        const importedColorMode = detectThemeColorMode();
        const artboardMetadata = extractArtboardMetadata(svgElement);
        const globalTextStyle = extractGlobalTextStyle(doc);

        const pluginImports: Record<string, unknown[]> = {};
        pluginManager.getImportDefHandlers().forEach((handler) => {
          const result = handler(doc);
          if (!result) return;
          Object.entries(result).forEach(([key, value]) => {
            const existing = pluginImports[key] ?? [];
            pluginImports[key] = [...existing, ...value];
          });
        });

        // Always collect marker definitions from the document so marker-start/mid/end render.
        const markerNodes = Array.from(doc.querySelectorAll('marker'));
        if (markerNodes.length) {
          const importedMarkers = markerNodes.map((node) => {
            const id = node.getAttribute('id') ?? generateShortId('mrk');
            return {
              id,
              name: id.replace(/^marker-/, '').replace(/-/g, ' '),
              path: node.querySelector('path')?.getAttribute('d') ?? 'M0 0',
              markerWidth: parseFloat(node.getAttribute('markerWidth') ?? '6'),
              markerHeight: parseFloat(node.getAttribute('markerHeight') ?? '6'),
              refX: parseFloat(node.getAttribute('refX') ?? '0'),
              refY: parseFloat(node.getAttribute('refY') ?? '0'),
              orient: node.getAttribute('orient') ?? 'auto',
              markerUnits: node.getAttribute('markerUnits') ?? undefined,
              viewBox: node.getAttribute('viewBox') ?? undefined,
              content: node.innerHTML,
            };
          });
          const existingMarkers = (pluginImports.marker as { id: string }[] | undefined) ?? [];
          const mergedById = new Map<string, unknown>();
          [...existingMarkers, ...importedMarkers].forEach((m) => {
            if (!m.id) return;
            mergedById.set(m.id, m);
          });
          pluginImports.marker = Array.from(mergedById.values());
        }

        // Always collect masks from the document to ensure they're available even if the mask plugin is disabled.
        const parsedMasks = parseMaskDefs(doc);
        if (parsedMasks.length) {
          const existingMasks = (pluginImports.mask as MaskImportDefinition[] | undefined) ?? [];
          const mergedById = new Map<string, MaskImportDefinition>();
          [...existingMasks, ...parsedMasks].forEach((mask) => {
            if (!mask.id) return;
            mergedById.set(mask.id, mask);
          });
          pluginImports.mask = Array.from(mergedById.values());
        }

        // Process all elements.
        const elements: ImportedElement[] = [];
        const attachments: TextPathAttachment[] = [];
        applyGlobalTextStyleToNodes(svgElement, globalTextStyle);
        Array.from(svgElement.children).forEach((child) => {
          const isArtboardMetadataNode = child.tagName.toLowerCase() === 'metadata' && (
            child.getAttribute(VECTORNEST_ARTBOARD_METADATA_ATTR) !== null ||
            child.getAttribute('id') === VECTORNEST_ARTBOARD_METADATA_ID
          );
          const isArtboardBackgroundRect = child.tagName.toLowerCase() === 'rect' &&
            child.getAttribute(VECTORNEST_ARTBOARD_BACKGROUND_ATTR) === 'true';
          if (isArtboardMetadataNode) {
            return;
          }
          if (isArtboardBackgroundRect) {
            return;
          }
          elements.push(...processElement(
            child,
            { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
            attachments,
            { textStyle: globalTextStyle, doc, svgDimensions: dimensions }
          ));
        });

        const shouldApplyDarkModeImportTransform = importedColorMode === 'dark';
        const normalizedElements = shouldApplyDarkModeImportTransform
          ? transformImportedElementsForDarkMode(elements)
          : elements;
        const normalizedArtboardMetadata = shouldApplyDarkModeImportTransform
          ? transformArtboardMetadataForDarkMode(artboardMetadata)
          : artboardMetadata;

        // Attach textPaths to their referenced paths.
        if (attachments.length) {
          const attachmentMap = new Map<string, TextPathAttachment>();
          attachments.forEach((a) => attachmentMap.set(a.targetId, a));
          const attachedTargets = new Set<string>();
          const attach = (els: ImportedElement[], allowRefTargets: boolean): void => {
            els.forEach((el) => {
              if (el.type === 'path') {
                const sourceId = (el.data as PathData).sourceId;
                if (!sourceId) return;
                if (attachedTargets.has(sourceId)) return;
                const att = attachmentMap.get(sourceId);
                if (!att || !att.textPath?.text) return;
                const isRef = Boolean((el.data as { isTextPathRef?: boolean }).isTextPathRef);
                if (isRef && !allowRefTargets) return;
                const nextTextPath = shouldApplyDarkModeImportTransform
                  ? transformImportedMonoColorValue(att.textPath)
                  : att.textPath;
                el.data.textPath = { ...(nextTextPath as typeof att.textPath) };
                attachedTargets.add(sourceId);
              } else if (el.type === 'group') {
                attach(el.children, allowRefTargets);
              }
            });
          };
          // Prefer attaching to non-ref paths first, then fallback to refs.
          attach(normalizedElements, false);
          attach(normalizedElements, true);
        }

        const paths = flattenImportedElements(normalizedElements);

        // Ensure masks referenced by elements are captured even if mask defs were not plugin-provided.
        const pluginImportsWithMasks = ensureMaskImports(doc, normalizedElements, pluginImports);

        // Allow plugin-imported elements even if there are no core paths.
        if (paths.length === 0 && normalizedElements.length === 0 && !normalizedArtboardMetadata) {
          reject(new Error('No valid paths found in SVG'));
          return;
        }

        resolve({
          dimensions,
          paths,
          elements: normalizedElements,
          pluginImports: pluginImportsWithMasks,
          artboardMetadata: normalizedArtboardMetadata,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

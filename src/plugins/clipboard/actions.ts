/**
 * Clipboard Actions
 * Core logic for copy/cut/paste operations
 */

import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement, GroupData, PathData } from '../../types';
import type { ClipboardInternalData, ClipboardSlice } from './slice';
import { CLIPBOARD_SCHEMA_VERSION, VECTORNEST_MIME_TYPE } from './slice';
import { logger } from '../../utils/logger';
import { serializePathsForExport } from '../../utils/exportUtils';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { duplicateElement } from '../../utils/duplicationUtils';
import { buildElementMap } from '../../utils/elementMapUtils';
import { mergeBounds } from '../../utils/measurementUtils';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import type { Bounds } from '../../utils/boundsUtils';
import { importSVGWithDimensions } from '../../utils/svgImportUtils';
import { translateImportedElements, addImportedElementsToCanvas } from '../../utils/importHelpers';
import { mergeImportedResources } from '../../utils/importContributionRegistry';
import { sanitizeSvgContent } from '../../utils/sanitizeSvgContent';

// Paste offset increment (cascading paste)
const PASTE_OFFSET_INCREMENT = 10;

// App version for clipboard data
const APP_VERSION = '1.0.0';

/**
 * Generate a new unique ID, avoiding collisions with existing elements
 */
function generateUniqueId(existingIds: Set<string>, baseId?: string): string {
  const base = baseId || 'elem';
  let newId: string;
  do {
    newId = `${base}-${Math.random().toString(36).slice(2, 11)}`;
  } while (existingIds.has(newId));
  return newId;
}

/**
 * Rewrite IDs in elements and defs to avoid collisions
 */
function rewriteIds(
  elements: CanvasElement[],
  existingIds: Set<string>
): { elements: CanvasElement[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();
  const rewrittenElements: CanvasElement[] = [];

  // First pass: generate new IDs for all elements
  for (const el of elements) {
    const newId = generateUniqueId(existingIds, el.type);
    idMap.set(el.id, newId);
    existingIds.add(newId);
  }

  // Second pass: rewrite elements with new IDs and update references
  for (const el of elements) {
    const newId = idMap.get(el.id)!;
    const newElement: CanvasElement = {
      ...el,
      id: newId,
      parentId: el.parentId ? idMap.get(el.parentId) ?? el.parentId : null,
    };

    // Update group childIds
    if (el.type === 'group') {
      const groupData = el.data as GroupData;
      (newElement.data as GroupData).childIds = groupData.childIds.map(
        childId => idMap.get(childId) ?? childId
      );
    }

    // Update paint references in path data
    if (el.type === 'path') {
      const pathData = el.data as PathData;
      const newData = { ...pathData };

      // Rewrite gradient/pattern references
      const rewritePaintRef = (paint: string): string => {
        const match = paint.match(/url\(#([^)]+)\)/);
        if (match) {
          const originalId = match[1];
          const newRefId = idMap.get(originalId);
          if (newRefId) {
            return `url(#${newRefId})`;
          }
        }
        return paint;
      };

      if (typeof newData.fillColor === 'string' && newData.fillColor.includes('url(#')) {
        newData.fillColor = rewritePaintRef(newData.fillColor);
      }
      if (typeof newData.strokeColor === 'string' && newData.strokeColor.includes('url(#')) {
        newData.strokeColor = rewritePaintRef(newData.strokeColor);
      }

      // Rewrite filter, clipPath, mask references
      if (newData.filterId && idMap.has(newData.filterId)) {
        newData.filterId = idMap.get(newData.filterId);
      }
      if (newData.clipPathId && idMap.has(newData.clipPathId)) {
        newData.clipPathId = idMap.get(newData.clipPathId);
      }
      if ((newData as { maskId?: string }).maskId && idMap.has((newData as { maskId?: string }).maskId!)) {
        (newData as { maskId?: string }).maskId = idMap.get((newData as { maskId?: string }).maskId!);
      }

      newElement.data = newData;
    }

    rewrittenElements.push(newElement);
  }

  return { elements: rewrittenElements, idMap };
}

/**
 * Calculate bounds for selected elements
 */
function calculateSelectionBounds(
  elements: CanvasElement[],
  selectedIds: string[]
): Bounds | null {
  const elementMap = buildElementMap(elements);
  const selectedElements = selectedIds
    .map(id => elementMap.get(id))
    .filter((el): el is CanvasElement => !!el);

  const boundsList: Bounds[] = [];
  for (const el of selectedElements) {
    const bounds = elementContributionRegistry.getBounds(el, {
      viewport: { zoom: 1, panX: 0, panY: 0 },
      elementMap,
    });
    if (bounds) {
      boundsList.push(bounds);
    }
  }

  return mergeBounds(boundsList);
}

/**
 * Get selected elements with their children (for groups)
 */
function getSelectedElementsWithChildren(
  elements: CanvasElement[],
  selectedIds: string[]
): CanvasElement[] {
  const elementMap = buildElementMap(elements);
  const result: CanvasElement[] = [];
  const addedIds = new Set<string>();

  const addElementWithChildren = (id: string) => {
    if (addedIds.has(id)) return;
    const el = elementMap.get(id);
    if (!el) return;

    addedIds.add(id);
    result.push(el);

    if (el.type === 'group') {
      const groupData = el.data as GroupData;
      for (const childId of groupData.childIds) {
        addElementWithChildren(childId);
      }
    }
  };

  for (const id of selectedIds) {
    addElementWithChildren(id);
  }

  return result;
}

/**
 * Copy selected elements to clipboard
 */
export async function copySelectedElements(store: CanvasStore & ClipboardSlice): Promise<void> {
  const { selectedIds, elements, viewport } = store;

  if (selectedIds.length === 0) {
    store.updateClipboardState({ statusMessage: 'Nothing to copy' });
    return;
  }

  try {
    // Get selected elements with children
    const selectedElements = getSelectedElementsWithChildren(elements, selectedIds);

    // Calculate bounds
    const bounds = calculateSelectionBounds(elements, selectedIds);
    if (!bounds) {
      store.updateClipboardState({ statusMessage: 'Failed to calculate bounds' });
      return;
    }

    // Serialize defs for selected elements
    const defsContent = defsContributionRegistry.serializeDefs(store, selectedElements);

    // Generate SVG content
    const exportResult = serializePathsForExport(elements, selectedIds, {
      selectedOnly: true,
      padding: 0,
      defs: defsContent,
      state: store,
    });

    if (!exportResult) {
      store.updateClipboardState({ statusMessage: 'Failed to serialize selection' });
      return;
    }

    const { svgContent } = exportResult;

    // Build internal clipboard data
    const internalData: ClipboardInternalData = {
      schemaVersion: CLIPBOARD_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      documentUnits: 'px',
      elements: selectedElements,
      bbox: {
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      },
      origin: {
        x: viewport.panX,
        y: viewport.panY,
      },
      defs: {},
      idMap: {},
      timestamp: Date.now(),
    };

    // Create clipboard items with multiple MIME types
    const clipboardItems: ClipboardItem[] = [];

    try {
      // Build blobs for different formats
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const htmlBlob = new Blob([`<div>${svgContent}</div>`], { type: 'text/html' });
      const textBlob = new Blob([svgContent], { type: 'text/plain' });

      // Try to create PNG (optional, may fail in some environments)
      let pngBlob: Blob | null = null;
      try {
        pngBlob = await svgToPngBlob(svgContent, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
      } catch {
        logger.warn('Failed to create PNG for clipboard');
      }

      // Build clipboard item data
      const itemData: Record<string, Blob> = {
        'image/svg+xml': svgBlob,
        'text/html': htmlBlob,
        'text/plain': textBlob,
      };

      if (pngBlob) {
        itemData['image/png'] = pngBlob;
      }

      clipboardItems.push(new ClipboardItem(itemData));

      // Write to clipboard
      await navigator.clipboard.write(clipboardItems);

      // Store internal data in localStorage for cross-tab access
      localStorage.setItem(VECTORNEST_MIME_TYPE, JSON.stringify(internalData));

      store.updateClipboardState({
        hasInternalData: true,
        pasteCount: 0,
        statusMessage: `Copied ${selectedIds.length} element${selectedIds.length > 1 ? 's' : ''}`,
      });

      logger.info('Copied to clipboard', { count: selectedIds.length });
    } catch (error) {
      // Fallback to text-only clipboard
      logger.warn('Full clipboard write failed, falling back to text', error);
      await navigator.clipboard.writeText(svgContent);
      localStorage.setItem(VECTORNEST_MIME_TYPE, JSON.stringify(internalData));
      
      store.updateClipboardState({
        hasInternalData: true,
        pasteCount: 0,
        statusMessage: `Copied ${selectedIds.length} element${selectedIds.length > 1 ? 's' : ''} (text only)`,
      });
    }
  } catch (error) {
    logger.error('Failed to copy to clipboard', error);
    store.updateClipboardState({ statusMessage: 'Failed to copy' });
  }
}

/**
 * Cut selected elements to clipboard
 */
export async function cutSelectedElements(store: CanvasStore & ClipboardSlice): Promise<void> {
  const { selectedIds } = store;

  if (selectedIds.length === 0) {
    store.updateClipboardState({ statusMessage: 'Nothing to cut' });
    return;
  }

  // Store the IDs to delete after paste
  store.updateClipboardState({
    isCutOperation: true,
    cutElementIds: [...selectedIds],
  });

  // Perform the copy
  await copySelectedElements(store);

  // Delete the elements (this will be undoable)
  store.deleteSelectedElements();

  store.updateClipboardState({
    statusMessage: `Cut ${selectedIds.length} element${selectedIds.length > 1 ? 's' : ''}`,
  });
}

/**
 * Paste from clipboard
 */
export async function pasteFromClipboard(
  store: CanvasStore & ClipboardSlice,
  inPlace: boolean = false
): Promise<void> {
  try {
    // First, check for internal VectorNest data in localStorage
    const internalDataStr = localStorage.getItem(VECTORNEST_MIME_TYPE);
    
    if (internalDataStr) {
      const internalData: ClipboardInternalData = JSON.parse(internalDataStr);
      
      // Validate schema version
      if (internalData.schemaVersion === CLIPBOARD_SCHEMA_VERSION) {
        await pasteInternalData(store, internalData, inPlace);
        return;
      }
    }

    // Fall back to system clipboard
    const clipboardItems = await navigator.clipboard.read();
    
    for (const item of clipboardItems) {
      // Try SVG first
      if (item.types.includes('image/svg+xml')) {
        const blob = await item.getType('image/svg+xml');
        const svgText = await blob.text();
        await pasteSvgContent(store, svgText, inPlace);
        return;
      }

      // Try HTML (may contain embedded SVG)
      if (item.types.includes('text/html')) {
        const blob = await item.getType('text/html');
        const htmlText = await blob.text();
        const svgMatch = htmlText.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);
        if (svgMatch) {
          await pasteSvgContent(store, svgMatch[0], inPlace);
          return;
        }
      }

      // Try plain text (may be SVG string)
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        const text = await blob.text();
        if (text.trim().startsWith('<svg') || text.trim().startsWith('<?xml')) {
          await pasteSvgContent(store, text, inPlace);
          return;
        }
      }

      // Try PNG image
      if (item.types.includes('image/png')) {
        const blob = await item.getType('image/png');
        await pasteImage(store, blob, inPlace);
        return;
      }
    }

    store.updateClipboardState({ statusMessage: 'No pasteable content in clipboard' });
  } catch (error) {
    logger.error('Failed to paste from clipboard', error);
    store.updateClipboardState({ statusMessage: 'Failed to paste' });
  }
}

/**
 * Paste internal VectorNest data
 */
async function pasteInternalData(
  store: CanvasStore & ClipboardSlice,
  data: ClipboardInternalData,
  inPlace: boolean
): Promise<void> {
  const { elements, addElement, updateElement, selectElements, viewport } = store;
  const { pasteCount } = store.clipboard;

  // Build set of existing IDs
  const existingIds = new Set(elements.map(el => el.id));

  // Rewrite IDs to avoid collisions
  const { elements: rewrittenElements } = rewriteIds(data.elements, existingIds);

  // Calculate offset
  let offsetX = 0;
  let offsetY = 0;

  if (!inPlace) {
    // Calculate cascading offset based on paste count
    offsetX = PASTE_OFFSET_INCREMENT * (pasteCount + 1);
    offsetY = PASTE_OFFSET_INCREMENT * (pasteCount + 1);
  }

  // Get root elements (no parent or parent not in selection)
  const elementIds = new Set(rewrittenElements.map(el => el.id));
  const rootElements = rewrittenElements.filter(el => !el.parentId || !elementIds.has(el.parentId));

  // Build element map for duplication
  const tempElementMap = buildElementMap(rewrittenElements);
  const newIds: string[] = [];

  // Add elements to store
  for (const el of rootElements) {
    const newId = duplicateElement(
      el,
      tempElementMap,
      addElement,
      updateElement,
      undefined,
      { offsetX, offsetY, applyAutoOffset: !inPlace }
    );
    newIds.push(newId);
  }

  // Select newly pasted elements
  selectElements(newIds);

  store.updateClipboardState({
    pasteCount: pasteCount + 1,
    lastPastePosition: { x: viewport.panX, y: viewport.panY },
    statusMessage: `Pasted ${newIds.length} element${newIds.length > 1 ? 's' : ''}`,
  });

  logger.info('Pasted internal data', { count: newIds.length });
}

/**
 * Paste SVG content from external source
 */
async function pasteSvgContent(
  store: CanvasStore & ClipboardSlice,
  svgContent: string,
  inPlace: boolean
): Promise<void> {
  try {
    // Sanitize the SVG
    const sanitized = sanitizeSvgContent(svgContent);

    // Parse and import via full SVG importer so we keep foreignObject, images, etc.
    const file = new File([sanitized], 'clipboard.svg', { type: 'image/svg+xml' });
    const { elements: importedElements, pluginImports } = await importSVGWithDimensions(file);

    if (!importedElements || importedElements.length === 0) {
      store.updateClipboardState({ statusMessage: 'No elements found in SVG' });
      return;
    }

    const { elements, addElement, updateElement, selectElements } = store;
    const { pasteCount } = store.clipboard;

    // Calculate offset
    const offsetX = inPlace ? 0 : PASTE_OFFSET_INCREMENT * (pasteCount + 1);
    const offsetY = inPlace ? 0 : PASTE_OFFSET_INCREMENT * (pasteCount + 1);

    const translatedElements = translateImportedElements(importedElements, offsetX, offsetY);

    // zIndex start after existing elements
    const maxZIndex = elements.length > 0 ? Math.max(...elements.map(e => e.zIndex)) : -1;
    let groupCounter = 1;
    const getNextGroupName = () => `Imported Group ${groupCounter++}`;

    const { childIds, sourceIdMap, createdIds, hiddenElementIds } = addImportedElementsToCanvas(
      translatedElements,
      addElement,
      updateElement,
      getNextGroupName,
      null,
      { value: maxZIndex + 1 }
    );

    mergeImportedResources(pluginImports ?? {}, sourceIdMap, store);

    if (hiddenElementIds.length) {
      hiddenElementIds.forEach((id) => store.toggleElementVisibility(id));
    }

    if (childIds.length > 0) {
      selectElements(childIds);
    }

    store.updateClipboardState({
      pasteCount: pasteCount + 1,
      statusMessage: `Pasted ${childIds.length || createdIds.length} element${(childIds.length || createdIds.length) > 1 ? 's' : ''}`,
    });

    logger.info('Pasted SVG content', { count: childIds.length || createdIds.length });
  } catch (error) {
    logger.error('Failed to paste SVG content', error);
    store.updateClipboardState({ statusMessage: 'Failed to parse SVG' });
  }
}

/**
 * Paste image as embedded image element
 */
async function pasteImage(
  store: CanvasStore & ClipboardSlice,
  blob: Blob,
  inPlace: boolean
): Promise<void> {
  try {
    // Convert blob to data URL
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Get image dimensions
    const img = new Image();
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = dataUrl;
    });

    const { addElement, selectElements } = store;
    const { pasteCount } = store.clipboard;

    // Calculate position
    let x = 100;
    let y = 100;

    if (!inPlace) {
      x += PASTE_OFFSET_INCREMENT * (pasteCount + 1);
      y += PASTE_OFFSET_INCREMENT * (pasteCount + 1);
    }

    // Add as image element (using the image plugin's element type)
    const newId = addElement({
      type: 'image',
      data: {
        x,
        y,
        width: dimensions.width,
        height: dimensions.height,
        href: dataUrl,
        preserveAspectRatio: 'xMidYMid meet',
        opacity: 1,
      },
    });

    selectElements([newId]);

    store.updateClipboardState({
      pasteCount: pasteCount + 1,
      statusMessage: 'Pasted image',
    });

    logger.info('Pasted image', { width: dimensions.width, height: dimensions.height });
  } catch (error) {
    logger.error('Failed to paste image', error);
    store.updateClipboardState({ statusMessage: 'Failed to paste image' });
  }
}

/**
 * Convert SVG to PNG blob for clipboard
 */
async function svgToPngBlob(svgContent: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const scale = 2; // High DPI
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        },
        'image/png',
        1.0
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for PNG conversion'));
    };

    img.src = url;
  });
}

import type { CanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import { detectThemeColorMode } from '../../utils/colorModeSyncUtils';
import { processSvgFile } from '../../utils/importProcessingUtils';
import { addImportedElementsToCanvas, translateImportedElements } from '../../utils/importHelpers';
import { mergeImportedResources } from '../../utils/importContributionRegistry';
import {
  DEFAULT_INSERT_ICON_SIZE,
  getIconifySvgBounds,
  loadIconifySvg,
  prepareIconifySvgForImport,
  splitIconifyName,
} from './iconifyApi';

const resolveInsertColor = (state: CanvasStore): string => {
  const fillColor = state.style.fillColor;
  if (typeof fillColor === 'string' && fillColor !== 'none' && !fillColor.startsWith('url(')) {
    return fillColor;
  }

  const strokeColor = state.style.strokeColor;
  if (typeof strokeColor === 'string' && strokeColor !== 'none' && !strokeColor.startsWith('url(')) {
    return strokeColor;
  }

  return '#111827';
};

const resolveInsertTargetSize = (state: CanvasStore): number => {
  if (!state.settings.importResize) {
    return DEFAULT_INSERT_ICON_SIZE;
  }

  const width = Number.isFinite(state.settings.importResizeWidth)
    ? state.settings.importResizeWidth
    : DEFAULT_INSERT_ICON_SIZE;
  const height = Number.isFinite(state.settings.importResizeHeight)
    ? state.settings.importResizeHeight
    : DEFAULT_INSERT_ICON_SIZE;

  return Math.max(16, width, height);
};

const importPreparedIconifySvg = async (
  store: CanvasStore,
  iconId: string,
  rawSvg: string,
  targetMaxSize: number,
  point: Point,
): Promise<void> => {
  const preparedSvg = prepareIconifySvgForImport(rawSvg, {
    colorMode: detectThemeColorMode(),
    monochromeColor: resolveInsertColor(store),
    targetMaxSize,
  });
  const file = new File([preparedSvg], `${iconId.replace(':', '-')}.svg`, {
    type: 'image/svg+xml',
  });
  const processed = await processSvgFile(file, {
    resizeImport: false,
    resizeWidth: 0,
    resizeHeight: 0,
    applyUnion: false,
    // Iconify SVGs are already normalized for the current theme before import.
    skipDarkModeColorTransform: true,
  });

  if (!processed || processed.elements.length === 0) {
    throw new Error('Processed icon did not produce importable elements');
  }

  const boundsCenterX = processed.bounds.minX + processed.bounds.width / 2;
  const boundsCenterY = processed.bounds.minY + processed.bounds.height / 2;
  const translatedElements = translateImportedElements(
    processed.elements,
    point.x - boundsCenterX,
    point.y - boundsCenterY,
  );
  const maxZIndex = store.elements.length > 0
    ? Math.max(...store.elements.map((element) => element.zIndex))
    : -1;
  let groupCounter = 1;
  const {
    childIds,
    createdIds,
    sourceIdMap,
    hiddenElementIds,
  } = addImportedElementsToCanvas(
    translatedElements,
    store.addElement,
    store.updateElement,
    () => `Iconify Group ${groupCounter++}`,
    null,
    { value: maxZIndex + 1 },
  );

  mergeImportedResources(processed.pluginImports ?? {}, sourceIdMap, store);
  hiddenElementIds.forEach((id) => store.toggleElementVisibility(id));

  const selectionIds = childIds.length > 0 ? childIds : createdIds;
  if (selectionIds.length > 0) {
    store.selectElements(selectionIds);
  }

  store.setActivePlugin('select');
};

const fitBoundsToRect = (
  sourceBounds: { width: number; height: number },
  rect: { width: number; height: number },
): { width: number; height: number } => {
  const sourceWidth = Math.max(1, sourceBounds.width);
  const sourceHeight = Math.max(1, sourceBounds.height);
  const scale = Math.min(rect.width / sourceWidth, rect.height / sourceHeight);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  return {
    width: sourceWidth * safeScale,
    height: sourceHeight * safeScale,
  };
};

export const insertIconifyIconAtPoint = async (
  store: CanvasStore,
  iconId: string,
  point: Point,
): Promise<void> => {
  const split = splitIconifyName(iconId);
  if (!split) {
    throw new Error(`Invalid Iconify icon id: ${iconId}`);
  }

  const rawSvg = await loadIconifySvg(split.prefix, split.name);
  await importPreparedIconifySvg(
    store,
    iconId,
    rawSvg,
    resolveInsertTargetSize(store),
    point,
  );
};

export const insertIconifyIconAtRect = async (
  store: CanvasStore,
  iconId: string,
  rect: { x: number; y: number; width: number; height: number },
): Promise<void> => {
  const split = splitIconifyName(iconId);
  if (!split) {
    throw new Error(`Invalid Iconify icon id: ${iconId}`);
  }

  const rawSvg = await loadIconifySvg(split.prefix, split.name);
  const sourceBounds = getIconifySvgBounds(rawSvg);
  if (!sourceBounds) {
    throw new Error('Could not determine Iconify SVG bounds');
  }

  const fittedSize = fitBoundsToRect(sourceBounds, rect);
  await importPreparedIconifySvg(
    store,
    iconId,
    rawSvg,
    Math.max(fittedSize.width, fittedSize.height),
    {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    },
  );
};

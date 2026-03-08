import type { CanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import { detectThemeColorMode } from '../../utils/colorModeSyncUtils';
import { sanitizeSvgContent } from '../../utils/sanitizeSvgContent';
import { processSvgFile } from '../../utils/importProcessingUtils';
import { addImportedElementsToCanvas, translateImportedElements } from '../../utils/importHelpers';
import { mergeImportedResources } from '../../utils/importContributionRegistry';
import {
  buildIconSvgUrl,
  DEFAULT_INSERT_ICON_SIZE,
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

export const insertIconifyIconAtPoint = async (
  store: CanvasStore,
  iconId: string,
  point: Point,
): Promise<void> => {
  const split = splitIconifyName(iconId);
  if (!split) {
    throw new Error(`Invalid Iconify icon id: ${iconId}`);
  }

  const response = await fetch(buildIconSvgUrl(split.prefix, split.name));
  if (!response.ok) {
    throw new Error(`Icon request failed with ${response.status}`);
  }

  const rawSvg = await response.text();
  const preparedSvg = prepareIconifySvgForImport(rawSvg, {
    colorMode: detectThemeColorMode(),
    monochromeColor: resolveInsertColor(store),
    targetMaxSize: resolveInsertTargetSize(store),
  });
  const sanitizedSvg = sanitizeSvgContent(preparedSvg, { allowExternalUrls: false });
  const file = new File([sanitizedSvg], `${iconId.replace(':', '-')}.svg`, {
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

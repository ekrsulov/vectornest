import type { CanvasElement, PathData } from '../../types';
import { calculateBounds, type Bounds } from '../boundsUtils';
import type { AlignmentContext, ContainerContentPair } from './types';

/**
 * Get bounds and area for a single path element
 */
export function getElementBoundsAndArea(
  element: CanvasElement,
  zoom: number
): { bounds: Bounds; area: number } {
  const pathData = element.data as PathData;
  const bounds = calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, zoom);
  const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
  return { bounds, area };
}

/**
 * Identify which element is the container and which is the content
 * Container is the larger element (by area)
 */
export function identifyContainerAndContent(
  element1: CanvasElement,
  element2: CanvasElement,
  zoom = 1
): ContainerContentPair {
  const { area: area1 } = getElementBoundsAndArea(element1, zoom);
  const { area: area2 } = getElementBoundsAndArea(element2, zoom);

  return area1 > area2
    ? { container: element1, content: element2 }
    : { container: element2, content: element1 };
}

function isLightColor(color: string): boolean {
  if (color === 'none' || color === 'transparent') {
    return false;
  }

  const lightColorNames = [
    'white',
    'whitesmoke',
    'snow',
    'ivory',
    'floralwhite',
    'ghostwhite',
    'azure',
    'aliceblue',
    'mintcream',
    'honeydew',
  ];

  if (lightColorNames.includes(color.toLowerCase())) {
    return true;
  }

  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r + g + b) / 3 > 200;
  }

  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return (r + g + b) / 3 > 200;
  }

  return false;
}

/**
 * Prepare all the context needed for alignment computation
 * Extracts and organizes bounds, data, and visual properties
 */
export function prepareAlignmentContext(
  containerElement: CanvasElement,
  contentElement: CanvasElement,
  zoom = 1
): AlignmentContext {
  const containerData = containerElement.data as PathData;
  const contentData = contentElement.data as PathData;

  const containerBounds = calculateBounds(
    containerData.subPaths,
    containerData.strokeWidth || 0,
    zoom
  );

  const contentBounds = calculateBounds(
    contentData.subPaths,
    contentData.strokeWidth || 0,
    zoom
  );

  let containerFillColor: string;

  if (containerData.fillColor && containerData.fillColor !== 'none') {
    containerFillColor = containerData.fillColor;
  } else {
    const contentFillColor = contentData.fillColor || 'none';
    const contentStrokeColor = contentData.strokeColor || 'none';

    const hasLightFill = isLightColor(contentFillColor);
    const hasLightStroke = isLightColor(contentStrokeColor);

    containerFillColor = hasLightFill || hasLightStroke ? '#333333' : 'white';
  }

  return {
    containerElement,
    contentElement,
    containerBounds,
    contentBounds,
    containerData,
    contentData,
    containerFillColor,
  };
}

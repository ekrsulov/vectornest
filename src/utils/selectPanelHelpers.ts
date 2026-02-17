import type { CanvasElement, Command, PathData } from '../types';
import type { NativeShapeElement } from '../types/elements';
import { extractSubpaths } from './pathParserUtils';
import { measureSubpathBounds } from './measurementUtils';
import { getRoundedBbox } from './boundsComparators';
import { buildElementMap } from './elementMapUtils';
import { elementContributionRegistry } from './elementContributionRegistry';
import {
  IDENTITY_MATRIX,
  applyToPoint,
  createRotateMatrix,
  createScaleMatrix,
  createTranslateMatrix,
  multiplyMatrices,
  type Matrix,
} from './matrixUtils';

/**
 * Interface for thumbnail data used by panel items
 */
export interface ItemThumbnailData {
  commands: Command[];
  strokeWidth: number;
  bbox: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } } | null;
}

/**
 * Extract thumbnail commands and compute stroke-aware bounds for a panel item.
 * Consolidates the duplicate logic from SelectPanelItem and SelectPanelGroupItem.
 * 
 * @param itemType - Type of item ('element' or 'subpath')
 * @param pathData - Path data from the element
 * @param subpathIndex - Optional subpath index for subpath items
 * @returns Object containing commands, strokeWidth, and computed bbox
 */
export function getItemThumbnailData(
  itemType: 'element' | 'subpath',
  pathData: PathData,
  subpathIndex?: number
): ItemThumbnailData {
  let commands: Command[] = [];
  const strokeWidth = pathData.strokeWidth ?? 1;

  if (itemType === 'element') {
    // Full element: use all commands from all subpaths
    commands = pathData.subPaths.flat();
  } else if (itemType === 'subpath' && subpathIndex !== undefined) {
    // Single subpath: extract specific subpath commands
    const subpathData = extractSubpaths(pathData.subPaths.flat())[subpathIndex];
    if (subpathData) {
      commands = subpathData.commands;
    }
  }

  // Compute stroke-aware bounds
  const boundsResult = commands.length > 0
    ? measureSubpathBounds(commands, strokeWidth, 1)
    : null;
  const bbox = getRoundedBbox(boundsResult);

  return {
    commands,
    strokeWidth,
    bbox,
  };
}

export const buildNativeShapeMatrix = (data: NativeShapeElement['data']): Matrix => {
  if (data.transformMatrix) {
    return data.transformMatrix;
  }
  const cx = data.x + data.width / 2;
  const cy = data.y + data.height / 2;
  let m: Matrix = IDENTITY_MATRIX;
  const tx = data.transform?.translateX ?? 0;
  const ty = data.transform?.translateY ?? 0;
  const rot = data.transform?.rotation ?? 0;
  const sx = data.transform?.scaleX ?? 1;
  const sy = data.transform?.scaleY ?? 1;

  if (tx !== 0 || ty !== 0) {
    m = multiplyMatrices(createTranslateMatrix(tx, ty), m);
  }
  if (rot !== 0) {
    m = multiplyMatrices(createRotateMatrix(rot, cx, cy), m);
  }
  if (sx !== 1 || sy !== 1) {
    m = multiplyMatrices(createScaleMatrix(sx, sy, cx, cy), m);
  }
  return m;
};

export const buildNativeShapeThumbnailCommands = (data: NativeShapeElement['data']): Command[] => {
  const matrix = buildNativeShapeMatrix(data);
  const applyMatrix = (pt: { x: number; y: number }) => applyToPoint(matrix, pt);
  const closePoly = (pts: Array<{ x: number; y: number }>, close = true): Command[] => {
    if (!pts.length) return [];
    const mapped = pts.map(applyMatrix);
    const [first, ...rest] = mapped;
    const cmds: Command[] = [{ type: 'M', position: first }];
    rest.forEach((p) => cmds.push({ type: 'L', position: p }));
    if (close) cmds.push({ type: 'Z' });
    return cmds;
  };

  switch (data.kind) {
    case 'rect':
    case 'square': {
      const width = data.kind === 'square' ? Math.min(data.width, data.height) : data.width;
      const height = data.kind === 'square' ? Math.min(data.width, data.height) : data.height;
      const pts = [
        { x: data.x, y: data.y },
        { x: data.x + width, y: data.y },
        { x: data.x + width, y: data.y + height },
        { x: data.x, y: data.y + height },
      ];
      return closePoly(pts, true);
    }
    case 'line': {
      return [
        { type: 'M', position: applyMatrix({ x: data.x, y: data.y }) },
        { type: 'L', position: applyMatrix({ x: data.x + data.width, y: data.y + data.height }) },
      ];
    }
    case 'circle':
    case 'ellipse': {
      const steps = 24;
      const rx = data.width / 2;
      const ry = data.kind === 'circle' ? rx : data.height / 2;
      const cx = data.x + rx;
      const cy = data.y + ry;
      const pts = Array.from({ length: steps }, (_v, i) => {
        const angle = (Math.PI * 2 * i) / steps;
        return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
      });
      return closePoly(pts, true);
    }
    case 'polygon':
    case 'polyline': {
      const pts = (data.points ?? []).map((p) => ({ x: p.x, y: p.y }));
      return closePoly(pts, data.kind === 'polygon');
    }
    default:
      return [];
  }
};

/**
 * Build thumbnail commands for a group by walking its children (including nested groups).
 * Falls back to element bounds for non-path items.
 */
export function getGroupThumbnailCommands(childIds: string[] | undefined, elements: CanvasElement[]): Command[] {
  if (!childIds?.length) return [];

  const commands: Command[] = [];
  const elementMap = buildElementMap(elements);

  const addRectFromBounds = (bounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
    commands.push(
      { type: 'M', position: { x: bounds.minX, y: bounds.minY } },
      { type: 'L', position: { x: bounds.maxX, y: bounds.minY } },
      { type: 'L', position: { x: bounds.maxX, y: bounds.maxY } },
      { type: 'L', position: { x: bounds.minX, y: bounds.maxY } },
      { type: 'Z' }
    );
  };

  const addImageAsRect = (child: CanvasElement) => {
    const data = child.data as {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      transformMatrix?: Matrix;
      transform?: { translateX?: number; translateY?: number; rotation?: number; scaleX?: number; scaleY?: number };
    };

    if (typeof data.x !== 'number' || typeof data.y !== 'number' || typeof data.width !== 'number' || typeof data.height !== 'number') {
      return false;
    }

    const baseCorners = [
      { x: data.x, y: data.y },
      { x: data.x + data.width, y: data.y },
      { x: data.x + data.width, y: data.y + data.height },
      { x: data.x, y: data.y + data.height },
    ];

    let matrix = data.transformMatrix as Matrix | undefined;
    if (!matrix) {
      matrix = IDENTITY_MATRIX;
      const cx = data.x + data.width / 2;
      const cy = data.y + data.height / 2;
      const sx = data.transform?.scaleX ?? 1;
      const sy = data.transform?.scaleY ?? 1;
      const rot = data.transform?.rotation ?? 0;
      const tx = data.transform?.translateX ?? 0;
      const ty = data.transform?.translateY ?? 0;

      matrix = multiplyMatrices(matrix, createTranslateMatrix(tx, ty));
      if (sx !== 1 || sy !== 1) {
        matrix = multiplyMatrices(createScaleMatrix(sx, sy, cx, cy), matrix);
      }
      if (rot !== 0) {
        matrix = multiplyMatrices(createRotateMatrix(rot, cx, cy), matrix);
      }
    }

    const transformedCorners = baseCorners.map((pt) => applyToPoint(matrix!, pt));
    commands.push(
      { type: 'M', position: transformedCorners[0] },
      { type: 'L', position: transformedCorners[1] },
      { type: 'L', position: transformedCorners[2] },
      { type: 'L', position: transformedCorners[3] },
      { type: 'Z' },
    );
    return true;
  };

  const processChild = (childId: string) => {
    const child = elementMap.get(childId);
    if (!child) return;

    if (child.type === 'path') {
      const pathData = child.data as PathData;
      commands.push(...pathData.subPaths.flat());
      return;
    }

    if (child.type === 'group') {
      (child.data.childIds as string[] | undefined)?.forEach(processChild);
      return;
    }

    if (child.type === 'nativeShape') {
      const shapeCommands = buildNativeShapeThumbnailCommands(child.data as NativeShapeElement['data']);
      commands.push(...shapeCommands);
      return;
    }

    if (child.type === 'image') {
      if (addImageAsRect(child)) return;
    }

    const bounds = elementContributionRegistry.getBounds(child, {
      viewport: { zoom: 1, panX: 0, panY: 0 },
      elementMap,
    });
    if (bounds) {
      addRectFromBounds(bounds);
    }
  };

  childIds.forEach(processChild);
  return commands;
}

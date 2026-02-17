/**
 * Pencil Plugin Actions
 * 
 * Contains the business logic for pencil operations that were previously
 * coupled to the canvas store.
 */

import type { Point, PathData } from '../../types';
import type { StoreApi } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import { simplifyPathFromPoints } from './utils';
import { getDefaultStrokeColorFromSettings } from '../../utils/defaultColors';

type PencilStore = CanvasStore & Required<Pick<CanvasStore, 'pencil' | 'style'>>;

/**
 * Start a new path or add a subpath to an existing pencil path
 */
export function startPath(
  point: Point,
  getState: StoreApi<CanvasStore>['getState']
): void {
  const state = getState() as PencilStore;
  if (!state.pencil || !state.style) return;

  // Read style properties from centralized StyleSlice
  const { strokeWidth, strokeColor, strokeOpacity, strokeLinecap, strokeLinejoin, fillRule, strokeDasharray } = state.style;
  // Read pencil-specific setting
  const { reusePath } = state.pencil;
  const defaultStrokeColor = getDefaultStrokeColorFromSettings();

  // For pencil paths, if strokeColor is 'none', use the default stroke color instead
  const effectiveStrokeColor = strokeColor === 'none' ? defaultStrokeColor : strokeColor;

  // Check if we should reuse an existing pencil path
  const lastElement = state.elements[state.elements.length - 1];
  const hasExistingPencilPath = lastElement?.type === 'path' &&
    (lastElement.data as PathData).isPencilPath === true;

  if (reusePath && hasExistingPencilPath) {
    // Reuse existing path - add the starting point as a new subpath
    const pathData = lastElement.data as PathData;
    state.updateElement(lastElement.id, {
      data: {
        ...pathData,
        subPaths: [...pathData.subPaths, [{ type: 'M', position: point }]]
      },
    });
  } else {
    // Create new path
    state.addElement({
      type: 'path',
      data: {
        subPaths: [[{ type: 'M', position: point }]],
        strokeWidth,
        strokeColor: effectiveStrokeColor,
        strokeOpacity,
        fillColor: 'none',  // Always no fill for pencil strokes
        fillOpacity: 1,     // Always 100% fill opacity for pencil strokes
        strokeLinecap: strokeLinecap || 'round',
        strokeLinejoin: strokeLinejoin || 'round',
        fillRule: fillRule || 'nonzero',
        strokeDasharray: strokeDasharray || 'none',
        isPencilPath: true, // Mark this as a pencil-created path
      },
    });
  }
}

/**
 * Add a point to the current pencil path
 */
export function addPointToPath(
  point: Point,
  getState: StoreApi<CanvasStore>['getState']
): void {
  const state = getState() as PencilStore;
  if (!state.pencil) return;

  // Find the last pencil path element
  const pencilPathElement = [...state.elements].reverse().find(
    el => el.type === 'path' && (el.data as PathData).isPencilPath === true
  );

  if (pencilPathElement) {
    const pathData = pencilPathElement.data as PathData;

    // Parse the current path to get the last point
    const commands = pathData.subPaths.flat();
    if (commands.length > 0) {
      const lastCommand = commands[commands.length - 1];
      if (lastCommand.type !== 'Z') {
        let lastPoint: Point;
        if (lastCommand.type === 'M' || lastCommand.type === 'L') {
          lastPoint = lastCommand.position;
        } else if (lastCommand.type === 'C') {
          lastPoint = lastCommand.position;
        } else {
          lastPoint = { x: 0, y: 0 }; // fallback
        }

        // Check minimum step distance
        const minStep = 1.25;
        const distance = Math.sqrt((point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2);
        if (distance < minStep) {
          return; // Don't add point if too close
        }
      }
    }

    // Update subPaths by adding L command to the last subpath
    const lastSubpathIndex = pathData.subPaths.length - 1;
    const updatedSubPaths = [...pathData.subPaths];
    updatedSubPaths[lastSubpathIndex] = [...updatedSubPaths[lastSubpathIndex], { type: 'L', position: point }];

    state.updateElement(pencilPathElement.id, {
      data: {
        ...pathData,
        subPaths: updatedSubPaths
      },
    });
  }
}

export function finalizePath(
  points: Point[],
  getState: StoreApi<CanvasStore>['getState']
): void {
  const state = getState() as PencilStore;
  if (!state.pencil) return;

  const tolerance = state.pencil.simplificationTolerance ?? 0;
  if (tolerance <= 0) {
    return;
  }

  const pencilPathElement = [...state.elements].reverse().find(
    el => el.type === 'path' && (el.data as PathData).isPencilPath === true
  );

  if (!pencilPathElement) {
    return;
  }

  const pathData = pencilPathElement.data as PathData;
  if (pathData.subPaths.length === 0 || points.length < 2) {
    return;
  }

  const simplifiedPath = simplifyPathFromPoints(points, pathData, tolerance);
  if (!simplifiedPath.subPaths.length) {
    return;
  }

  const updatedSubPaths = [...pathData.subPaths];
  updatedSubPaths[updatedSubPaths.length - 1] = simplifiedPath.subPaths[0];

  state.updateElement(pencilPathElement.id, {
    data: {
      ...pathData,
      subPaths: updatedSubPaths,
      isPencilPath: true,
    },
  });
}

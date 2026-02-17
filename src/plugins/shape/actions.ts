/**
 * Shape Plugin Actions
 * 
 * Contains the business logic for shape operations that were previously
 * coupled to the canvas store.
 */

import type { Point, Command } from '../../types';
import type { StoreApi } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { ShapePluginSlice } from './slice';
import type { StyleSlice } from '../../store/slices/features/styleSlice';

type ShapeStore = CanvasStore & ShapePluginSlice & StyleSlice;
import {
  createSquareCommands,
  createRectangleCommands,
  createCircleCommands,
  createTriangleCommands,
  createLineCommands,
  createDiamondCommands,
  createHeartCommands
} from '../../utils/ShapeFactory';
import { extractSubpaths } from '../../utils/pathParserUtils';

/**
 * Create a shape based on start and end points
 */
export function createShape(
  startPoint: Point,
  endPoint: Point,
  getState: StoreApi<CanvasStore>['getState']
): void {
  const state = getState() as ShapeStore;
  if (!state.shape || !state.style) return;

  const shapeState = state.shape;
  const styleState = state.style;

  // Read style properties from centralized StyleSlice
  const { strokeWidth, strokeColor, strokeOpacity, fillColor, fillOpacity } = styleState;
  const selectedShape = shapeState.selectedShape;

  // Calculate shape dimensions
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);
  const centerX = (startPoint.x + endPoint.x) / 2;
  const centerY = (startPoint.y + endPoint.y) / 2;

  let commands: Command[] = [];

  switch (selectedShape) {
    case 'square': {
      // Create a square using path commands
      const halfSize = Math.min(width, height) / 2;
      commands = createSquareCommands(centerX, centerY, halfSize);
      break;
    }

    case 'rectangle': {
      // Create a rectangle using path commands
      commands = createRectangleCommands(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      break;
    }

    case 'circle': {
      // Create a circle using C commands (Bézier curves)
      const radius = Math.min(width, height) / 2;
      commands = createCircleCommands(centerX, centerY, radius);
      break;
    }

    case 'triangle': {
      // Create a triangle using path commands
      commands = createTriangleCommands(centerX, startPoint.y, endPoint.x, endPoint.y, startPoint.x);
      break;
    }

    case 'line': {
      // Create a line using path commands
      commands = createLineCommands(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      break;
    }

    case 'diamond': {
      // Create a diamond using path commands
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      commands = createDiamondCommands(centerX, centerY, halfWidth, halfHeight);
      break;
    }

    case 'heart': {
      // Create a heart using Bézier curves
      commands = createHeartCommands(centerX, centerY, width, height);
      break;
    }

    default: {
      // Default to square if unknown shape
      const defaultHalfSize = Math.min(width, height) / 2;
      commands = createSquareCommands(centerX, centerY, defaultHalfSize);
      break;
    }
  }

  // Extract subpaths directly from generated commands
  const parsedSubPaths = extractSubpaths(commands);

  state.addElement({
    type: 'path',
    data: {
      subPaths: parsedSubPaths.map(sp => sp.commands),
      strokeWidth,
      strokeColor,
      strokeOpacity,
      fillColor,
      fillOpacity,
      strokeLinecap: styleState.strokeLinecap || 'round',
      strokeLinejoin: styleState.strokeLinejoin || 'round',
      fillRule: styleState.fillRule || 'nonzero',
      strokeDasharray: styleState.strokeDasharray || 'none',
    },
  });

  // Auto-switch to select mode after creating shape (unless keepShapeMode is enabled)
  if (!shapeState.keepShapeMode) {
    state.setActivePlugin('select');
  }
}

/**
 * Shared element types used by both core and plugins.
 * These types are defined here to avoid circular dependencies between core and plugin code.
 */

import type { CanvasElementBase, PartialElementTransform, PresentationAttributes } from './';
import type { FillPropertiesOptional, StrokePropertiesOptional } from './style';

type ShapeKind = 'rect' | 'square' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'polyline';

/**
 * Native shape element type (used by nativeShapes plugin).
 * Defined here to allow core utilities like selectPanelHelpers to work with plugin elements
 * without direct import from the plugin.
 */
export type NativeShapeData =
  StrokePropertiesOptional &
  FillPropertiesOptional &
  PresentationAttributes & {
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
  points?: { x: number; y: number }[];
  // Number of points used when creating polygon/polyline templates (3..8)
  pointsCount?: number;
  sourceId?: string;
  transform?: PartialElementTransform;
};

export type NativeShapeElement = CanvasElementBase<'nativeShape', NativeShapeData>;

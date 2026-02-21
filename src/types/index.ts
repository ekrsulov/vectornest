import type { FillProperties, StrokeProperties } from './style';

export interface Point {
  x: number;
  y: number;
}

/**
 * Canonical element transform with translate, rotate, and scale.
 * All fields are required — use `PartialTransform` when fields may be omitted.
 */
export interface ElementTransform {
  translateX: number;
  translateY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/** Transform where every field is optional (e.g. NativeShapeData). */
export type PartialElementTransform = Partial<ElementTransform>;

/**
 * Canonical definition for application-level settings.
 * Used in BaseSlice, CanvasLayerContext (plugins.ts), and CanvasLayerProps (ui-contributions.ts).
 */
export interface AppSettings {
  keyboardMovementPrecision: number;
  showRenderCountBadges: boolean;
  showMinimap: boolean;
  showTooltips: boolean;
  showLeftSidebar: boolean;
  defaultStrokeColor: string;
  scaleStrokeWithZoom: boolean;
  exportPadding: number;
  importResize: boolean;
  importResizeWidth: number;
  importResizeHeight: number;
  importApplyUnion: boolean;
  importAddFrame: boolean;
}

// Control point alignment types (calculated on-demand)
export type ControlPointType = 'independent' | 'aligned' | 'mirrored';

export interface ControlPointInfo {
  commandIndex: number;
  pointIndex: number;
  anchor: Point;
  isControl: boolean; // Made required to consolidate ControlPoint definitions
  associatedCommandIndex?: number; // Added to consolidate ControlPoint definitions
  associatedPointIndex?: number; // Added to consolidate ControlPoint definitions
}

// Control point combining position and info
export interface ControlPoint extends Point, ControlPointInfo { }

// Extended control point info with alignment data (calculated on-demand)
export interface ControlPointAlignmentInfo {
  type: ControlPointType;
  pairedCommandIndex?: number;
  pairedPointIndex?: number;
  anchor: Point;
}

// Path command types
export type Command =
  | { type: 'M' | 'L'; position: Point }
  | { type: 'C'; controlPoint1: ControlPoint; controlPoint2: ControlPoint; position: Point }
  | { type: 'Z' };

export type SubPath = Command[];

/** @deprecated Import from '../constants' instead. Re-exported for backward compatibility. */
export { PATH_DECIMAL_PRECISION } from '../constants';

/**
 * Shared SVG presentation attributes used across multiple element data types.
 */
export interface PresentationAttributes {
  visibility?: 'visible' | 'hidden' | 'collapse';
  display?: 'inline' | 'block' | 'none';
  vectorEffect?: 'none' | 'non-scaling-stroke';
  shapeRendering?: 'auto' | 'optimizeSpeed' | 'crispEdges' | 'geometricPrecision';
  mixBlendMode?: string;
  isolation?: 'auto' | 'isolate';
  filterId?: string;
  clipPathId?: string;
  clipPathTemplateId?: string;
  maskId?: string;
  opacity?: number;
  transformMatrix?: [number, number, number, number, number, number];
  markerStart?: string;
  markerMid?: string;
  markerEnd?: string;
  /** ID of the source element this element was derived from (e.g., via convert-to-path). */
  sourceId?: string;
  /** Whether this element was defined inside an SVG <defs> block. */
  isDefinition?: boolean;
}

export interface PathData extends StrokeProperties, FillProperties, PresentationAttributes {
  subPaths: SubPath[]; // Structured representation of SVG path commands
  /** Optional human-readable name (set by Naming Manager or user) */
  name?: string;
  isPencilPath?: boolean; // Indicates if this path was created with the pencil tool
  textPath?: {
    text: string;
    richText?: string;
    spans?: Array<{
      text: string;
      line: number;
      fontWeight?: string;
      fontStyle?: 'normal' | 'italic';
      textDecoration?: 'none' | 'underline' | 'line-through';
      fillColor?: string;
      dx?: string;
    }>;
    fontSize: number;
    fontFamily: string;
    fontWeight?: string;
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline' | 'line-through';
    letterSpacing?: number;
    textAnchor?: 'start' | 'middle' | 'end';
    startOffset?: number | string; // percentage along path (number) or raw string value
    method?: 'align' | 'stretch';
    spacing?: 'auto' | 'exact';
    lengthAdjust?: 'spacing' | 'spacingAndGlyphs';
    textLength?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    dominantBaseline?: 'alphabetic' | 'middle' | 'hanging' | 'ideographic';
    filterId?: string;
    maskId?: string;
    opacity?: number;
    transformMatrix?: [number, number, number, number, number, number];
    anchorGroupSourceIds?: string[];
  };
  transform?: ElementTransform;
  isTextPathRef?: boolean;
  /** Extensible metadata bag for plugin-defined properties. Prefer this over arbitrary top-level keys. */
  metadata?: Record<string, unknown>;
}

export interface GroupData extends PresentationAttributes {
  childIds: string[];
  name: string;
  isLocked: boolean;
  isHidden: boolean;
  isExpanded: boolean;
  transform: ElementTransform;
  /** Extensible metadata bag for plugin-defined properties. Prefer this over arbitrary top-level keys. */
  metadata?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CanvasElementBase<TType extends ElementType = ElementType, TData = any> {
  id: string;
  type: TType;
  zIndex: number;
  parentId: string | null;
  data: TData;
}

export interface PathElement extends CanvasElementBase<'path', PathData> {
  type: 'path';
}

export interface GroupElement extends CanvasElementBase<'group', GroupData> {
  type: 'group';
}

export type ElementType = string;
export type CustomElementType = string;

export type CanvasElement = PathElement | GroupElement | CanvasElementBase;
export type PluginElement = Exclude<CanvasElement, PathElement | GroupElement>;
export type CanvasElementInput = Omit<CanvasElement, 'id' | 'zIndex' | 'parentId'> & {
  parentId?: string | null;
};

export const isPathElement = (element: CanvasElement): element is PathElement => element.type === 'path';
export const isGroupElement = (element: CanvasElement): element is GroupElement => element.type === 'group';

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

// Re-export selection types for convenience
export type { SelectedCommand, PointUpdate, SelectedSubpath } from './selection';

// Re-export animation types for convenience (shared with animationSystem plugin)
export type { SVGAnimation, AnimationState, AnimationType, DefTargetType, AnimationTargetPath } from './animations';

// Re-export element types for convenience (shared with nativeShapes plugin)
export type { NativeShapeData, NativeShapeElement } from './elements';

// Re-export UI contribution types for convenience
export type {
  UIPlacement,
  UIConditionContext,
  BaseUIContribution,
  SidebarPanelContribution,
  UnifiedCanvasLayerContribution,
  CanvasOverlayContribution,
  ToolbarButtonContribution,
  ProviderContribution,
  UIContribution,
} from './ui-contributions';

export {
  isSidebarPanelContribution,
  isCanvasLayerContribution,
  isCanvasOverlayContribution,
  isToolbarButtonContribution,
  isProviderContribution,
  whenActivePlugin,
  whenNotInSpecialPanelMode,
  allConditions,
  anyCondition,
  notCondition,
} from './ui-contributions';

export type {
  StrokeLinecap,
  StrokeLinejoin,
  FillRule,
  StrokeProperties,
  FillProperties,
  StrokePropertiesOptional,
  FillPropertiesOptional,
  CoreStyleProperties,
  GlobalStyleProperties,
  CopiedStyleProperties,
} from './style';

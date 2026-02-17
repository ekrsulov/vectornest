/**
 * Animation Gizmo System - Core Types
 * 
 * This module defines the type system for the animation gizmo infrastructure.
 * Gizmos are visual controls that allow direct manipulation of animation properties
 * on the canvas, providing an intuitive way to edit SMIL animations.
 */

import type { ReactNode, ComponentType } from 'react';
import type { Point, CanvasElement } from '../../../types';
import type { Bounds } from '../../../utils/boundsUtils';
import type { SVGAnimation } from '../types';

// =============================================================================
// Animation Categories (from the 50 animations spec)
// =============================================================================

/**
 * Categories of animation as defined in the feature specification.
 * Each category groups related animation types with similar gizmo behaviors.
 */
export type AnimationCategory =
  | 'transform'         // I. Spatial transformations (translate, rotate, scale, skew)
  | 'vector'            // II. Advanced vector animation (motion path, morphing, stroke draw)
  | 'style'             // III. Styles and attributes (stroke width, color, viewBox)
  | 'clip-mask'         // IV. Masks and clipping (clipPath, mask)
  | 'gradient'          // V. Gradients and patterns
  | 'gradient-pattern'  // V. Alternative name for gradients and patterns
  | 'filter'            // VI. Filters and symbols (blur, symbol instances, text-on-path)
  | 'hierarchy'         // VII. Hierarchy and choreography (groups, stagger, pivot)
  | 'interactive'       // VIII. Interactivity and logic (events, triggers)
  | 'typography'        // IX. Kinetic typography
  | 'fx'                // X. Special effects and time
  | 'scene';            // XI. Scene and meta-animations

/**
 * SMIL element type that the gizmo generates
 */
export type SMILTarget =
  | 'animateTransform'
  | 'animate'
  | 'animateMotion'
  | 'set'
  | 'compound'; // Multiple SMIL elements

// =============================================================================
// Gizmo Handle Types
// =============================================================================

/**
 * Type of interactive handle within a gizmo
 */
export type GizmoHandleType =
  | 'point'     // Draggable point (pivot, position)
  | 'arc'       // Circular arc for rotation
  | 'line'      // Draggable line segment
  | 'slider'    // Linear slider control
  | 'dial'      // Rotary dial control
  | 'box'       // Resizable bounding box
  | 'path'      // Editable path (for motion path)
  | 'gradient'  // Gradient control line
  | 'custom'    // Custom render
  // Extended types used in gizmo implementations
  | 'position'  // Position handle
  | 'rotation'  // Rotation handle
  | 'scale'     // Scale handle
  | 'tangent'   // Tangent/bezier handle
  | 'timing'    // Timing/keyframe handle
  | 'value'     // Generic value handle
  | 'origin';   // Transform origin handle

/**
 * Constraint axis for handle dragging
 */
export type DragAxis = 'x' | 'y' | 'free' | 'circular';

/**
 * Constraints for handle movement
 */
export interface GizmoHandleConstraints {
  /** Axis constraint for movement */
  axis?: DragAxis;
  /** Minimum position */
  min?: Point;
  /** Maximum position */
  max?: Point;
  /** Snap increment (degrees for circular, pixels for linear) */
  snap?: number | ((context: GizmoInteractionContext) => number);
  /** Radius for circular constraints */
  radius?: number;
  /** Center point for circular constraints */
  center?: Point;
}

/**
 * Definition of an interactive control within a gizmo
 */
export interface GizmoHandle {
  /** Unique identifier within the gizmo */
  id: string;
  /** Type of handle (determines base behavior) */
  type: GizmoHandleType;
  /** Position relative to target element (can be dynamic) */
  position?: Point | ((context: GizmoContext) => Point);
  /** Dynamic position getter (alternative to position) */
  getPosition?: (context: GizmoContext) => Point;
  /** Cursor to show on hover */
  cursor?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Optional text label to render on top of the handle */
  label?: string | ((context: GizmoContext) => string);
  /** Movement constraints */
  constraints?: GizmoHandleConstraints;
  /** Whether this handle is currently visible */
  visible?: boolean | ((context: GizmoContext) => boolean);
  /** Callback when dragging starts */
  onDragStart?: (context: GizmoInteractionContext) => void;
  /** Callback during drag */
  onDrag: (delta: Point, context: GizmoInteractionContext) => void;
  /** Callback when drag ends */
  onDragEnd?: (context: GizmoInteractionContext) => void;
  /** Callback on click (for toggles) */
  onClick?: (context: GizmoInteractionContext) => void;
}

// =============================================================================
// Gizmo Visual Types
// =============================================================================

/**
 * Visual representation of the gizmo
 */
export interface GizmoVisual {
  /** Render function for the gizmo visuals */
  render: (context: GizmoRenderContext) => ReactNode;
  /** Z-index for layering (higher = on top) */
  zIndex?: number;
}

// =============================================================================
// Gizmo State Types
// =============================================================================

/**
 * Interaction state of a gizmo
 */
export interface GizmoInteractionState {
  /** Currently active handle ID (if any) */
  activeHandle: string | null;
  /** Whether currently dragging */
  isDragging: boolean;
  /** Drag start point in canvas coordinates */
  dragStart: Point | null;
  /** Whether gizmo is hovered */
  isHovered: boolean;
  /** Hovered handle ID */
  hoveredHandle: string | null;
}

/**
 * Internal state of an active gizmo instance
 */
export interface GizmoState {
  /** ID of the gizmo definition */
  gizmoId: string;
  /** ID of the associated animation */
  animationId: string;
  /** ID of the target element */
  elementId: string;
  /** Whether this gizmo is currently focused */
  isFocused?: boolean;
  /** Gizmo-specific properties (varies by gizmo type) */
  props: Record<string, unknown>;
  /** Current interaction state */
  interaction: GizmoInteractionState;
}

// =============================================================================
// Context Types
// =============================================================================

/**
 * Base context available to all gizmo operations
 */
export interface GizmoContext {
  /** Current gizmo state */
  state: GizmoState;
  /** Associated animation */
  animation: SVGAnimation;
  /** Target element */
  element: CanvasElement;
  /** Element bounds in canvas coordinates */
  elementBounds: Bounds;
  /** Element center point */
  elementCenter: Point;
  /** Current viewport */
  viewport: { zoom: number; panX: number; panY: number };
  /** Current color mode */
  colorMode: 'light' | 'dark';
  /** Decimal precision for numeric values */
  precision: number;
}

/**
 * Handles can be static or generated from the current gizmo context.
 * This enables gizmos with dynamic handle counts (e.g. path editing).
 */
export type GizmoHandles = GizmoHandle[] | ((context: GizmoContext) => GizmoHandle[]);

/**
 * Context for rendering gizmo visuals
 */
export interface GizmoRenderContext extends GizmoContext {
  /** Current simulation time in seconds */
  currentTime: number;
  /** Total animation duration in seconds */
  duration: number;
  /** Whether animation is currently playing */
  isPlaying: boolean;
  /** Progress through animation (0-1) */
  progress: number;
}

/**
 * Context for handle interactions
 */
export interface GizmoInteractionContext extends GizmoRenderContext {
  /** Drag start point in canvas coordinates */
  dragStart: Point;
  /** Current point in canvas coordinates */
  currentPoint: Point;
  /** Delta from drag start */
  delta: Point;
  /** Keyboard modifiers */
  modifiers: {
    shift: boolean;
    alt: boolean;
    meta: boolean;
    ctrl: boolean;
  };
  /** Update gizmo state props */
  updateState: (updates: Partial<GizmoState['props']>) => void;
  /** Update the associated animation */
  updateAnimation: (updates: Partial<SVGAnimation>) => void;
  /** Commit changes to history (call on drag end) */
  commitChanges: () => void;
}

// =============================================================================
// Gizmo Config Panel Types
// =============================================================================

/**
 * Props for gizmo configuration panel
 */
export interface GizmoConfigPanelProps {
  /** Current gizmo state */
  state: GizmoState;
  /** Associated animation */
  animation: SVGAnimation;
  /** Update state handler */
  onStateChange: (updates: Partial<GizmoState['props']>) => void;
  /** Update animation handler */
  onAnimationChange: (updates: Partial<SVGAnimation>) => void;
}

// =============================================================================
// Gizmo Definition
// =============================================================================

/**
 * Metadata for gizmo display
 */
export interface GizmoMetadata {
  /** Display name */
  name: string;
  /** Description for tooltips */
  description: string;
  /** Icon name (lucide icon) */
  icon?: string;
  /** Keyboard shortcut */
  keyboardShortcut?: string;
}

/**
 * Complete definition of an animation gizmo.
 * Gizmos are registered with the GizmoRegistry and matched to animations
 * based on their `appliesTo` or `canHandle` function.
 */
export interface AnimationGizmoDefinition {
  /** Unique identifier (e.g., 'translate', 'rotate', 'motion-path') */
  id: string;
  /** Category per specification */
  category: AnimationCategory;
  /** Priority for sorting (higher = shown first) */
  priority?: number;
  
  // Legacy fields (for backward compatibility)
  /** Human-readable label (use metadata.name instead) */
  label?: string;
  /** Description for tooltips (use metadata.description instead) */
  description?: string;
  
  /** Metadata for display */
  metadata?: GizmoMetadata;
  
  /** SMIL element type this gizmo generates */
  smilTarget?: SMILTarget;
  /** SVG attributes this gizmo modifies */
  targetAttributes?: string[];
  
  /**
   * Determines if this gizmo applies to a given animation.
   * The first gizmo that returns true for an animation will be used.
   */
  appliesTo?: (animation: SVGAnimation, element: CanvasElement) => boolean;
  
  /**
   * Alternative to appliesTo - determines if this gizmo can handle an animation.
   */
  canHandle?: (animation: SVGAnimation) => boolean;
  
  /** Interactive handles for this gizmo */
  handles: GizmoHandles;
  
  /** Visual representation (legacy style) */
  visual?: GizmoVisual;
  
  /** Direct render function (alternative to visual.render) */
  render?: (context: GizmoRenderContext) => ReactNode;
  
  /** Optional configuration panel component */
  configPanel?: ComponentType<GizmoConfigPanelProps>;
  
  /**
   * Creates initial gizmo state from an existing animation.
   * Called when an animation is selected for gizmo editing.
   */
  fromAnimation: (animation: SVGAnimation, element: CanvasElement) => GizmoState;
  
  /**
   * Generates animation updates from gizmo state.
   * Called when gizmo state changes to sync with animation.
   */
  toAnimation: (state: GizmoState, existing?: SVGAnimation) => Partial<SVGAnimation>;
}

// =============================================================================
// Registry Types
// =============================================================================

/**
 * Filter options for querying gizmos
 */
export interface GizmoQueryOptions {
  /** Filter by category */
  category?: AnimationCategory;
  /** Filter by SMIL target */
  smilTarget?: SMILTarget;
  /** Filter by attribute */
  attribute?: string;
}

/**
 * Listener callback for registry changes
 */
export type GizmoRegistryListener = () => void;

// =============================================================================
// Simulation Types
// =============================================================================

/**
 * Quality mode for simulation/preview
 */
export type SimulationQuality = 'editing' | 'preview' | 'export';

/**
 * Quality settings per mode
 */
export interface QualitySettings {
  mode: SimulationQuality;
  filterQuality: 'low' | 'medium' | 'high';
  updateRate: number; // Hz
  disableFilters?: boolean;
}

/**
 * Calculated animation state for an element at a specific time
 */
export interface ElementAnimationState {
  elementId: string;
  time: number;
  
  /** Transform state */
  transform?: {
    translateX: number;
    translateY: number;
    rotate: number;
    rotateCx?: number;
    rotateCy?: number;
    scaleX: number;
    scaleY: number;
    skewX: number;
    skewY: number;
  };
  
  /** Motion path state */
  motionPath?: {
    position: Point;
    angle: number;
  };
  
  /** Style attributes */
  style?: {
    opacity?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    strokeDashoffset?: number;
  };
  
  /** Morphed path data */
  pathData?: string;
  
  /** Generic attribute values */
  attributes?: Record<string, string | number>;
}

// =============================================================================
// SMIL Compiler Types
// =============================================================================

/**
 * Options for SMIL compilation
 */
export interface SMILCompileOptions {
  /** Optimize redundant keyTimes/values */
  optimize?: boolean;
  /** Decimal precision for numeric values */
  precision?: number;
  /** Include descriptive comments */
  includeComments?: boolean;
  /** Compatibility mode */
  compatibility?: 'standard' | 'webkit' | 'all';
}

/**
 * Result of SMIL compilation
 */
export interface SMILCompileResult {
  /** Generated SVG elements as XML strings */
  elements: string[];
  /** Warnings during compilation */
  warnings: string[];
  /** Elements that require defs section */
  defs: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a default GizmoInteractionState
 */
export function createDefaultInteraction(): GizmoInteractionState {
  return {
    activeHandle: null,
    isDragging: false,
    dragStart: null,
    isHovered: false,
    hoveredHandle: null,
  };
}

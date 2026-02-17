/**
 * Shared animation types used by both core and animationSystem plugin.
 * These types are defined here to avoid circular dependencies between core and plugin code.
 */

export type AnimationType = 'animate' | 'animateTransform' | 'animateMotion' | 'set' | 'custom';

/**
 * Type of definition that can contain animations
 */
export type DefTargetType = 'gradient' | 'pattern' | 'clipPath' | 'filter' | 'mask' | 'marker' | 'symbol';

/**
 * Represents a hierarchical animation target path for transitive animations.
 * For example, an animation on a gradient stop that is used by a circle element
 * would have: element (circle) → def (gradient) → subTarget (stop index)
 */
export interface AnimationTargetPath {
  /** The canvas element that uses the def (for preview purposes) */
  previewElementId?: string;
  /** The type of def being animated (gradient, pattern, clipPath, filter) */
  defType?: DefTargetType;
  /** The def element ID (gradient ID, pattern ID, etc.) */
  defId?: string;
  /** For gradient stops, the stop index */
  stopIndex?: number;
  /** For filters, which filter primitive */
  filterPrimitiveIndex?: number;
}

export interface SVGAnimation {
  id: string;
  type: AnimationType;
  targetElementId: string;
  /**
   * Element ID to use for preview when the animation is on a def (gradient, pattern, etc.)
   * This is the element that uses the def, so the animation effect can be visualized.
   */
  previewElementId?: string;
  clipPathTargetId?: string;
  /** Target gradient definition ID for animations on gradient elements (stops, transforms) */
  gradientTargetId?: string;
  /** Target pattern definition ID for animations on pattern elements */
  patternTargetId?: string;
  /** For pattern animations, identifies which child element (0, 1, 2...) */
  patternChildIndex?: number;
  /** Target filter definition ID for animations on filter primitives */
  filterTargetId?: string;
  /** Target mask definition ID for animations on mask contents */
  maskTargetId?: string;
  /** For mask animations, identifies which child element (0, 1, 2...) */
  maskChildIndex?: number;
  /** Target marker definition ID for animations on markers */
  markerTargetId?: string;
  /** For marker animations, identifies which child element (0, 1, 2...) */
  markerChildIndex?: number;
  /** Target clipPath definition ID for animations on clipPath contents */
  clipPathChildIndex?: number;
  /** Target symbol definition ID for animations on symbol children */
  symbolTargetId?: string;
  /** For symbol animations, identifies which child element (0, 1, 2...) */
  symbolChildIndex?: number;
  /** For gradient stop animations, identifies which stop (0, 1, 2...) or stop ID */
  stopIndex?: number;
  /** For filter animations, identifies which filter primitive is being animated */
  filterPrimitiveIndex?: number;
  attributeName?: string;
  from?: string | number;
  to?: string | number;
  values?: string;
  dur?: string;
  begin?: string;
  end?: string;
  fill?: 'freeze' | 'remove';
  repeatCount?: number | 'indefinite';
  repeatDur?: string;
  calcMode?: 'linear' | 'discrete' | 'paced' | 'spline';
  keyTimes?: string;
  keySplines?: string;
  // Transform props
  transformType?: 'translate' | 'scale' | 'rotate' | 'skewX' | 'skewY';
  additive?: 'replace' | 'sum';
  accumulate?: 'none' | 'sum';
  // Motion props
  path?: string;
  mpath?: string;
  rotate?: number | 'auto' | 'auto-reverse';
  keyPoints?: string;
  // Extended props
  easing?: string;
  attrType?: string;
  targetId?: string;
}

/**
 * Shared animation state interface used by core canvas and animation system.
 * This allows the core to sync SMIL timeline without knowing about plugin internals.
 */
export interface AnimationState {
  isPlaying: boolean;
  hasPlayed: boolean;
  currentTime: number;
  startTime: number | null;
  playbackRate: number;
  restartKey: number;
  chainDelays: Map<string, number>; // ms offsets keyed by animation id
  isWorkspaceOpen: boolean;
  /** When true, shows the canvas preview overlay for full-canvas animation preview */
  isCanvasPreviewMode: boolean;
}

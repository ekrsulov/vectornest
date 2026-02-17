import type { StateCreator } from 'zustand';
import type { TransformDeltaEntry } from '../../utils/animationTransformDelta';

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

export interface AnimationEvent {
  id: string;
  type: 'start' | 'end' | 'repeat' | 'sync';
  sourceAnimationId: string;
  timestamp: number;
  handled?: boolean;
}

// Draft animation used in editors and previews where an id may not yet exist
export type DraftAnimation = Omit<SVGAnimation, 'id'> & { id?: string };

export interface AnimationChainEntry {
  animationId: string;
  delay: number; // seconds
  trigger: 'start' | 'end' | 'repeat';
  dependsOn?: string;
}

export interface AnimationChain {
  id: string;
  name?: string;
  animations: AnimationChainEntry[];
}

export interface AnimationSyncState {
  chains: AnimationChain[];
  events: AnimationEvent[];
}

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

export interface AnimationPluginSlice {
  animations: SVGAnimation[];
  animationState: AnimationState;
  animationSync: AnimationSyncState;
  timelineLabelWidth: number;
  applyAnimationTransformDelta: (deltas: TransformDeltaEntry[]) => void;
  addAnimation: (animation: Omit<SVGAnimation, 'id'> & Partial<Pick<SVGAnimation, 'id'>>) => void;
  updateAnimation: (id: string, updates: Partial<SVGAnimation>) => void;
  removeAnimation: (id: string) => void;
  clearAnimations: () => void;
  createFadeAnimation: (targetId: string, dur?: string, from?: string | number, to?: string | number) => void;
  createRotateAnimation: (targetId: string, dur?: string, degrees?: string | number) => void;
  createMoveAnimation: (targetId: string, dur?: string, fromX?: number, fromY?: number, toX?: number, toY?: number) => void;
  createScaleAnimation: (targetId: string, dur?: string, fromScale?: number, toScale?: number) => void;
  createPathDrawAnimation: (targetId: string, dur?: string) => void;
  createSetAnimation: (targetId: string, attributeName: string, to: string | number, begin?: string, end?: string) => void;
  createAttributeAnimation: (targetId: string, attributeName: string, dur?: string, from?: string | number, to?: string | number, repeatCount?: number | 'indefinite') => void;
  createFillColorAnimation: (targetId: string, dur?: string) => void;
  createStrokeColorAnimation: (targetId: string, dur?: string) => void;
  createStrokeWidthAnimation: (targetId: string, dur?: string, fromWidth?: number, toWidth?: number) => void;
  createPositionAnimation: (targetId: string, dur?: string, fromX?: number, fromY?: number, toX?: number, toY?: number) => void;
  createSizeAnimation: (targetId: string, dur?: string, fromWidth?: number, fromHeight?: number, toWidth?: number, toHeight?: number) => void;
  createFontSizeAnimation: (targetId: string, dur?: string, fromSize?: number, toSize?: number) => void;
  createFontWeightAnimation: (targetId: string, dur?: string, fromWeight?: string, toWeight?: string) => void;
  createLetterSpacingAnimation: (targetId: string, dur?: string, from?: number, to?: number) => void;
  createCircleAnimation: (targetId: string, dur?: string, fromRadius?: number, toRadius?: number) => void;
  createLineAnimation: (targetId: string, dur?: string, fromCoords?: { x1: number; y1: number; x2: number; y2: number }, toCoords?: { x1: number; y1: number; x2: number; y2: number }) => void;
  createPathDataAnimation: (targetId: string, dur?: string, fromD?: string, toD?: string) => void;
  createTextPositionAnimation: (targetId: string, dur?: string, fromX?: number, fromY?: number, toX?: number, toY?: number) => void;
  createFilterBlurAnimation: (targetId: string, dur?: string, fromStdDev?: number, toStdDev?: number) => void;
  createFilterOffsetAnimation: (targetId: string, dur?: string, fromDx?: number, fromDy?: number, toDx?: number, toDy?: number) => void;
  createFilterColorMatrixAnimation: (targetId: string, dur?: string, fromValues?: string, toValues?: string) => void;
  createFilterFloodAnimation: (targetId: string, dur?: string, fromColor?: string, toColor?: string) => void;
  createViewBoxAnimation: (dur?: string, fromViewBox?: string, toViewBox?: string) => void;
  createGradientStopAnimation: (stopId: string, dur?: string, fromColor?: string, toColor?: string) => void;
  createGradientPositionAnimation: (gradientId: string, dur?: string, attribute?: string, fromValue?: string, toValue?: string) => void;
  createLinearGradientAnimation: (gradientId: string, dur?: string, from?: { x1?: number; y1?: number; x2?: number; y2?: number }, to?: { x1?: number; y1?: number; x2?: number; y2?: number }) => void;
  createRadialGradientAnimation: (gradientId: string, dur?: string, from?: { cx?: number; cy?: number; r?: number }, to?: { cx?: number; cy?: number; r?: number }) => void;
  createGradientStopOffsetAnimation: (stopId: string, dur?: string, fromOffset?: number, toOffset?: number) => void;
  createPatternAnimation: (patternId: string, dur?: string, fromSize?: { width?: number; height?: number }, toSize?: { width?: number; height?: number }) => void;
  createPatternTransformAnimation: (patternId: string, dur?: string, fromTransform?: string, toTransform?: string) => void;
  createAnimateMotionWithMPath: (targetId: string, pathId: string, dur?: string, rotate?: 'auto' | 'auto-reverse' | number) => void;
  updateAnimationMPath: (animationId: string, pathId: string) => void;
  playAnimations: () => void;
  pauseAnimations: () => void;
  stopAnimations: () => void;
  setAnimationTime: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  calculateChainDelays: () => Map<string, number>;
  setAnimationDelay: (animationId: string, delayMs: number) => void;
  processAnimationEvents: () => void;
  createAnimationChain: (name: string, entries: AnimationChainEntry[]) => void;
  updateAnimationChain: (id: string, updates: Partial<Omit<AnimationChain, 'id' | 'animations'>>) => void;
  updateChainAnimationDelay: (chainId: string, animationId: string, delay: number) => void;
  updateChainAnimationTrigger: (chainId: string, animationId: string, trigger: 'start' | 'end' | 'repeat') => void;
  removeAnimationChain: (id: string) => void;
  setAnimationWorkspaceOpen: (isOpen: boolean) => void;
  setTimelineLabelWidth: (width: number) => void;
  /** Toggle canvas preview overlay mode */
  setCanvasPreviewMode: (isActive: boolean) => void;
  /** Start canvas preview playback */
  playCanvasPreview: () => void;
  /** Pause canvas preview playback */
  pauseCanvasPreview: () => void;
  /** Stop canvas preview and reset */
  stopCanvasPreview: () => void;
}

export type AnimationSliceCreator = StateCreator<
  AnimationPluginSlice,
  [],
  [],
  AnimationPluginSlice
>;

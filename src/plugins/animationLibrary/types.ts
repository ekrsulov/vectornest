import type { SVGAnimation } from '../animationSystem/types';

export type AnimationTargetType = 'any' | 'text' | 'path' | 'shape';

/**
 * ClipPath animation configuration for typewriter-style reveal effects.
 * Creates a clipPath with a rect that animates to reveal content.
 */
export interface ClipPathAnimationConfig {
  /** Base element tag for the clipPath content (e.g., 'rect') */
  baseElementTag: string;
  /** Static attributes for the base element */
  baseElementAttrs: Record<string, string>;
  /** Animation to apply to the clipPath element */
  animation: Omit<SVGAnimation, 'id' | 'targetElementId'>;
  /** Whether the clipPath should be sized to element bounds */
  sizeToElement?: boolean;
}

export interface AnimationPreset {
  id: string;
  name: string;
  description?: string;
  targetType: AnimationTargetType;
  /** The animations that make up this preset */
  animations: Omit<SVGAnimation, 'id' | 'targetElementId'>[];
  /** Whether this is a built-in preset that cannot be edited */
  preset?: boolean;
  /** SVG content for preview thumbnail */
  previewSvg?: string;
  /** 
   * If true, scale animations will be centered by adding a compensating translate animation.
   * The translate values are computed dynamically based on the element's bounding box center.
   */
  centeredScale?: boolean;
  /**
   * ClipPath animation configuration for reveal effects.
   * When set, a clipPath will be created and animated to reveal the element.
   */
  clipPathAnimation?: ClipPathAnimationConfig;
  /**
   * If true, the preview SVG colors (fill/stroke) will not be normalized to theme colors.
   * Use this for color animations where the original colors must be preserved.
   */
  preserveColors?: boolean;
}

export interface AnimationLibrarySlice {
  animationPresets: AnimationPreset[];
  addAnimationPreset: (preset: Omit<AnimationPreset, 'id'>) => void;
  updateAnimationPreset: (id: string, updates: Partial<AnimationPreset>) => void;
  removeAnimationPreset: (id: string) => void;
  applyPresetToSelection: (presetId: string) => void;
  clearAnimationsFromSelection: () => void;
  selectedFromSearch: string | null;
  selectFromSearch: (id: string | null) => void;
}

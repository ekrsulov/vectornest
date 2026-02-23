/**
 * Animation Manager Plugin — Type Definitions
 *
 * Types for the unified animation management panel that provides
 * selection-centric animation discovery, editing, and preset application.
 */

import type { SVGAnimation, DefTargetType } from '../animationSystem/types';

// ─── Animation Discovery ────────────────────────────────────────────────────

/**
 * A group of animations sharing the same relationship to a selected element.
 * Either "direct" (targeting the element itself) or "indirect" (targeting a def
 * referenced by the element, such as a gradient, filter, pattern, etc.)
 */
export interface DiscoveredAnimationGroup {
  /** Relationship type: 'direct' means animation targets the element itself */
  groupType: 'direct' | DefTargetType;
  /** Human-readable label, e.g., "Direct", "Gradient: sunset-grad" */
  groupLabel: string;
  /** ID of the referenced def (undefined for direct animations) */
  defId?: string;
  /** Animations in this group */
  animations: SVGAnimation[];
}

/**
 * All discovered animations affecting a single canvas element,
 * including both direct and transitive (via defs) animations.
 */
export interface DiscoveredElementAnimations {
  /** The element ID */
  elementId: string;
  /** Display name for the element */
  elementName: string;
  /** Element type (path, group, etc.) */
  elementType: string;
  /** Groups of animations organized by relationship */
  groups: DiscoveredAnimationGroup[];
  /** Total animation count across all groups */
  totalCount: number;
}

// ─── Preset Catalog ─────────────────────────────────────────────────────────

/** Unified preset entry merging Library and Editor presets */
export interface UnifiedPreset {
  /** Unique preset identifier */
  id: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Source system: 'library' (multi-animation with preview) or 'editor' (single-animation) */
  source: 'library' | 'editor';
  /** Category tag for filtering */
  category: string;
  /** Target element type filter */
  targetType: 'any' | 'text' | 'path' | 'shape';
  /** Optional SVG preview markup */
  previewSvg?: string;
  /** Original preset ID for application */
  originalId: string;
}

// ─── Editor State ───────────────────────────────────────────────────────────

/**
 * Parsed keyframe data from an animation's values/keyTimes/keySplines strings.
 */
export interface ParsedKeyframe {
  /** 0-1 normalized time position */
  time: number;
  /** The value at this keyframe */
  value: string;
  /** Cubic bezier control points for easing TO the next keyframe [x1, y1, x2, y2] */
  easing?: [number, number, number, number];
}

// ─── Plugin Slice State ─────────────────────────────────────────────────────

/** Editor mode for Zone 2 */
export type EditorMode = 'idle' | 'editing' | 'creating';

/** Preset catalog category tags */
export type PresetCategory =
  | 'all'
  | 'entrance'
  | 'exit'
  | 'loop'
  | 'transform'
  | 'style'
  | 'path'
  | 'filter'
  | 'text'
  | 'advanced';

export interface AnimationManagerState extends Record<string, unknown> {
  /** Whether the animation manager panel is open */
  isOpen: boolean;

  /** Currently selected animation ID in the map (Zone 1) */
  selectedAnimationId: string | null;

  /** Expanded group keys in the animation map */
  expandedGroups: string[];

  /** Editor mode */
  editorMode: EditorMode;

  /** Preset catalog search query */
  catalogSearchQuery: string;

  /** Active filter tags in the catalog */
  catalogActiveTags: PresetCategory[];

  /** User-favorited preset IDs */
  catalogFavorites: string[];

  /** Recently applied preset IDs (most recent first, capped at 10) */
  catalogRecents: string[];

  /** Auto-play animation on edit toggle */
  autoPlayOnEdit: boolean;

  /** Default duration for new animations (seconds) */
  defaultDuration: number;

  /** Zoom level for the mini timeline (1 = default) */
  miniTimelineZoom: number;

  /** Animation IDs that are temporarily visually disabled */
  disabledAnimationIds: string[];
}

export interface AnimationManagerSlice {
  animationManager: AnimationManagerState;
  updateAnimationManagerState: (updates: Partial<AnimationManagerState>) => void;
}

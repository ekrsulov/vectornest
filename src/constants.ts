/**
 * Core application constants.
 * These constants define default values that are used throughout the application.
 */

// ============================================================================
// Mode/Plugin Constants
// ============================================================================

/**
 * The default mode/plugin that the application starts with and returns to.
 * This is the 'select' tool which allows selecting and manipulating elements.
 */
export const DEFAULT_MODE = 'select';

/**
 * The initial tool activated when the canvas is empty.
 */
export const DEFAULT_TOOL = 'pencil';

/**
 * The default selection strategy used when no specific strategy is set.
 * Rectangle selection creates a rectangular marquee for selecting elements.
 */
export const DEFAULT_SELECTION_STRATEGY = 'rectangle';

// ============================================================================
// Viewport Constants
// ============================================================================

/**
 * Minimum zoom level (10% of original size)
 */
export const MIN_ZOOM = 0.1;

/**
 * Maximum zoom level (10000% of original size)
 */
export const MAX_ZOOM = 100;

// ============================================================================
// History/Undo Constants
// ============================================================================

/**
 * Maximum number of undo/redo states to keep in history
 */
export const UNDO_HISTORY_LIMIT = 50;

/**
 * Debounce delay (ms) for history state changes to prevent excessive entries
 * during rapid events like drawing or moving
 */
export const HISTORY_DEBOUNCE_MS = 100;

// ============================================================================
// Precision Constants
// ============================================================================

/**
 * Decimal precision used for path coordinates and viewport calculations.
 */
export const PATH_DECIMAL_PRECISION = 4;

// ============================================================================
// UI Constants
// ============================================================================

/**
 * Default height for the select panel in pixels
 */
export const DEFAULT_SELECT_PANEL_HEIGHT = 140;

/**
 * Default width for the sidebar in pixels
 */
export const DEFAULT_SIDEBAR_WIDTH = 250;

// ============================================================================
// Animation & Performance Constants
// ============================================================================

/**
 * Target frame rate for animations and throttled updates (~60fps)
 */
export const ANIMATION_FRAME_MS = 16;

/**
 * Minimum pixel threshold before considering a drag operation started.
 * Prevents accidental drags from small mouse movements.
 */
export const DRAG_THRESHOLD_PX = 3;

/**
 * Debounce delay for localStorage writes to prevent excessive disk operations
 */
export const LOCAL_STORAGE_DEBOUNCE_MS = 100;

/**
 * Default translation offset when duplicating elements (in pixels)
 */
export const DUPLICATE_OFFSET_PX = 20;

/**
 * Milliseconds window for recognizing a double-tap gesture.
 */
export const DOUBLE_TAP_TIME_THRESHOLD_MS = 300;

/**
 * Maximum pointer travel (px) between taps to still count as double-tap.
 */
export const DOUBLE_TAP_DISTANCE_THRESHOLD_PX = 30;

/**
 * Shared epsilon used when comparing nearby path points/handles.
 */
export const PATH_JOIN_TOLERANCE = 0.001;

/**
 * Sampling and Newton refinement defaults for cubic bezier closest-point solving.
 */
export const BEZIER_CLOSEST_POINT_SAMPLES = 50;
export const BEZIER_NEWTON_ITERATIONS = 5;
export const BEZIER_NEWTON_EPSILON = 0.0001;

/**
 * Default CSS pixel density used for unit conversion.
 */
export const DEFAULT_DPI = 96;

/**
 * Upper bound for cached geometry/text measurement entries.
 */
export const MEASUREMENT_CACHE_MAX_SIZE = 2000;

// ============================================================================
// Feedback Overlay Constants
// ============================================================================

/**
 * Feedback overlay positioning and sizing constants
 */
export const FEEDBACK_OVERLAY = {
  /** Y offset from bottom of canvas */
  Y_OFFSET: 33,
  /** Height of feedback block */
  BLOCK_HEIGHT: 24,
  /** Font size for feedback text */
  FONT_SIZE: 12,
  /** Border radius for feedback blocks */
  BORDER_RADIUS: 4,
  /** Vertical offset between stacked feedback blocks */
  STACK_OFFSET: 28,
  /** Width for rotation feedback (default) */
  ROTATION_WIDTH_DEFAULT: 55,
  /** Width for rotation feedback (with shift) */
  ROTATION_WIDTH_SHIFT: 75,
  /** Width for resize feedback (default) */
  RESIZE_WIDTH_DEFAULT: 85,
  /** Width for resize feedback (with shift) */
  RESIZE_WIDTH_SHIFT: 95,
  /** Width for shape feedback (default) */
  SHAPE_WIDTH_DEFAULT: 75,
  /** Width for shape feedback (with shift) */
  SHAPE_WIDTH_SHIFT: 85,
  /** Width for point position feedback */
  POINT_WIDTH: 75,
  /** Minimum width for custom feedback */
  CUSTOM_MIN_WIDTH: 60,
  /** Character width multiplier for custom feedback */
  CUSTOM_CHAR_WIDTH: 8,
} as const;

// ============================================================================
// Snap Points Constants
// ============================================================================

/**
 * Radius (in screen pixels) around the cursor within which snap points are visible.
 * Snap points outside this radius will be hidden to reduce visual clutter.
 * This value is scaled by the current zoom level.
 */
export const SNAP_POINTS_VISIBILITY_RADIUS = 100;

// ============================================================================
// iOS Edge Guard Constants
// ============================================================================

/**
 * iOS edge guard dimensions
 */
export const IOS_EDGE_GUARD = {
  /** Width of the edge guard in pixels */
  WIDTH: 20,
  /** Z-index for edge guard overlay */
  Z_INDEX: 9999,
} as const;

// ============================================================================
// Guidelines Performance Constants
// ============================================================================

/**
 * Velocity threshold (in canvas units per frame) above which guidelines
 * calculation and display are skipped during element drag.
 * This improves performance when moving elements quickly, especially groups.
 * Lower values = skip guidelines sooner (more aggressive optimization).
 * Higher values = show guidelines at higher speeds (less optimization).
 */
export const GUIDELINES_VELOCITY_THRESHOLD = 10;

/**
 * Distance snap multiple for guidelines (in canvas units).
 * When distance guidelines are enabled, elements will snap to distances
 * that are multiples of this value (e.g., 10, 20, 30, etc.).
 * Set to 0 to disable distance multiple snapping.
 */
export const GUIDELINES_DISTANCE_SNAP_MULTIPLE = 100;

// ============================================================================
// UI Style Constants
// ============================================================================

/**
 * Style to disable tap highlight color on touch devices
 */
export const NO_TAP_HIGHLIGHT = { WebkitTapHighlightColor: 'transparent' };

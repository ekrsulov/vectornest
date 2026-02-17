/**
 * Shape Plugin Configuration
 * 
 * Configuration constants for the shape creation tool
 */

/**
 * Minimum movement threshold (in pixels) required to create a shape.
 * If the distance between pointerDown and pointerUp is less than this value,
 * the shape creation will be cancelled.
 * 
 * This prevents creating tiny, unusable shapes from accidental clicks.
 */
export const MIN_SHAPE_CREATION_DISTANCE = 5;

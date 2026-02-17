import type { Point } from '../../types';
import { MIN_SHAPE_CREATION_DISTANCE } from './config';

export interface ShapeFeedback {
  width: number;
  height: number;
  visible: boolean;
  isShiftPressed: boolean;
  isMultipleOf10: boolean;
}

export interface PointPositionFeedback {
  x: number;
  y: number;
  visible: boolean;
}

export interface ShapeCreationCallbacks {
  createShape: (shapeStart: Point, shapeEnd: Point) => void;
  getSelectedShape: () => string;
}

export class ShapeCreationController {
  private callbacks: ShapeCreationCallbacks;

  constructor(callbacks: ShapeCreationCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Check if the movement between two points is sufficient to create a shape
   * Returns true if the distance is greater than the minimum threshold
   */
  private isMovementSufficient(start: Point, end: Point): boolean {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance >= MIN_SHAPE_CREATION_DISTANCE;
  }

  /**
   * Calculate constrained endpoint for line when shift is pressed
   * Snaps to horizontal, vertical, or 45-degree diagonal lines
   */
  calculateConstrainedLineEnd(shapeStart: Point, shapeEnd: Point): Point {
    const dx = shapeEnd.x - shapeStart.x;
    const dy = shapeEnd.y - shapeStart.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Determine which constraint to apply based on angle
    // If more horizontal than diagonal (absDx > absDy * 1.5), snap to horizontal
    // If more vertical than diagonal (absDy > absDx * 1.5), snap to vertical
    // Otherwise, snap to 45-degree diagonal
    
    if (absDx > absDy * 1.5) {
      // Snap to horizontal
      return { x: shapeEnd.x, y: shapeStart.y };
    } else if (absDy > absDx * 1.5) {
      // Snap to vertical
      return { x: shapeStart.x, y: shapeEnd.y };
    } else {
      // Snap to 45-degree diagonal
      const distance = Math.max(absDx, absDy);
      const signX = dx >= 0 ? 1 : -1;
      const signY = dy >= 0 ? 1 : -1;
      return {
        x: shapeStart.x + distance * signX,
        y: shapeStart.y + distance * signY,
      };
    }
  }

  /**
   * Calculate shape feedback based on start and end points
   */
  calculateShapeFeedback(
    shapeStart: Point,
    shapeEnd: Point,
    shiftPressed: boolean
  ): ShapeFeedback {
    // Calculate dimensions
    const rawWidth = Math.abs(shapeEnd.x - shapeStart.x);
    const rawHeight = Math.abs(shapeEnd.y - shapeStart.y);

    // Apply sticky creation (10-pixel increments) when Shift is pressed
    let adjustedWidth = rawWidth;
    let adjustedHeight = rawHeight;

    if (shiftPressed) {
      // Round to nearest 10-pixel increment
      adjustedWidth = Math.round(rawWidth / 10) * 10;
      adjustedHeight = Math.round(rawHeight / 10) * 10;
    }

    // Check if adjusted dimensions are multiples of 10
    const isMultipleOf10 = (Math.abs(adjustedWidth) % 10 === 0) && (Math.abs(adjustedHeight) % 10 === 0);

    // Calculate real dimensions based on shape type
    const selectedShape = this.callbacks.getSelectedShape();
    let realWidth = adjustedWidth;
    let realHeight = adjustedHeight;

    if (selectedShape === 'square') {
      // Square always has equal sides
      const sideLength = Math.min(adjustedWidth, adjustedHeight);
      realWidth = sideLength;
      realHeight = sideLength;
    } else if (selectedShape === 'circle') {
      // Circle always has equal width and height (diameter)
      const diameter = Math.min(adjustedWidth, adjustedHeight);
      realWidth = diameter;
      realHeight = diameter;
    }
    // For rectangle, realWidth and realHeight are already correct

    return {
      width: Math.round(realWidth),
      height: Math.round(realHeight),
      visible: true,
      isShiftPressed: shiftPressed,
      isMultipleOf10,
    };
  }

  /**
   * Complete shape creation
   * Only creates a shape if the movement is sufficient (above minimum threshold)
   * @returns true if the shape was created, false if it was cancelled
   */
  completeShapeCreation(shapeStart: Point, shapeEnd: Point): boolean {
    // Check if the movement is sufficient to create a shape
    if (!this.isMovementSufficient(shapeStart, shapeEnd)) {
      // Movement is too small, cancel shape creation
      return false;
    }

    // Movement is sufficient, create the shape
    this.callbacks.createShape(shapeStart, shapeEnd);
    return true;
  }

  /**
   * Create point position feedback
   */
  createPointPositionFeedback(x: number, y: number, visible: boolean): PointPositionFeedback {
    return {
      x: Math.round(x),
      y: Math.round(y),
      visible,
    };
  }
}

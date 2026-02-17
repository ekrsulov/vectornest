import type { Point } from '../types';

export interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  center: Point;
}

class SimpleTransformManager {
  // Helper method to calculate corner scale with proportional scaling
  private calculateCornerScale(
    scaleX: number,
    scaleY: number
  ): { scaleX: number; scaleY: number } {
    const scale = Math.min(Math.abs(scaleX), Math.abs(scaleY));
    return {
      scaleX: scaleX < 0 ? -scale : scale,
      scaleY: scaleY < 0 ? -scale : scale
    };
  }

  // Calculate scale factors based on handle movement - more natural approach
  calculateScale(
    handleId: string,
    currentPoint: Point,
    dragStart: Point,
    bounds: TransformBounds
  ): { scaleX: number; scaleY: number; originX: number; originY: number } {
    const deltaX = currentPoint.x - dragStart.x;
    const deltaY = currentPoint.y - dragStart.y;

    // Guard against zero-size bounds to prevent NaN from division
    const safeWidth = bounds.width || 1;
    const safeHeight = bounds.height || 1;

    // Configuration for corner handles
    const cornerConfigs = {
      'corner-tl': { signX: -1, signY: -1, originXOffset: bounds.width, originYOffset: bounds.height },
      'corner-tr': { signX: 1, signY: -1, originXOffset: 0, originYOffset: bounds.height },
      'corner-bl': { signX: -1, signY: 1, originXOffset: bounds.width, originYOffset: 0 },
      'corner-br': { signX: 1, signY: 1, originXOffset: 0, originYOffset: 0 }
    };

    let scaleX = 1;
    let scaleY = 1;
    let originX = bounds.x;
    let originY = bounds.y;

    // Calculate scale based on handle type
    if (handleId in cornerConfigs) {
      // Corner handles with proportional scaling
      const config = cornerConfigs[handleId as keyof typeof cornerConfigs];
      const rawScaleX = (safeWidth + config.signX * deltaX) / safeWidth;
      const rawScaleY = (safeHeight + config.signY * deltaY) / safeHeight;

      const proportionalScale = this.calculateCornerScale(rawScaleX, rawScaleY);
      scaleX = proportionalScale.scaleX;
      scaleY = proportionalScale.scaleY;

      originX = bounds.x + config.originXOffset;
      originY = bounds.y + config.originYOffset;
    } else {
      // Edge handles - non-proportional scaling
      switch (handleId) {
        case 'midpoint-t': // Top edge
          scaleX = 1; // No horizontal scaling
          scaleY = (safeHeight - deltaY) / safeHeight;
          originX = bounds.x + bounds.width / 2;
          originY = bounds.y + bounds.height;
          break;

        case 'midpoint-b': // Bottom edge
          scaleX = 1; // No horizontal scaling
          scaleY = (safeHeight + deltaY) / safeHeight;
          originX = bounds.x + bounds.width / 2;
          originY = bounds.y;
          break;

        case 'midpoint-l': // Left edge
          scaleX = (safeWidth - deltaX) / safeWidth;
          scaleY = 1; // No vertical scaling
          originX = bounds.x + bounds.width;
          originY = bounds.y + bounds.height / 2;
          break;

        case 'midpoint-r': // Right edge
          scaleX = (safeWidth + deltaX) / safeWidth;
          scaleY = 1; // No vertical scaling
          originX = bounds.x;
          originY = bounds.y + bounds.height / 2;
          break;
      }
    }

    // Apply reasonable scale limits to prevent extreme transformations
    const minScale = 0.05; // Allow more shrinking than before
    const maxScale = 10.0; // Allow more expansion than before

    if (Math.abs(scaleX) < minScale) {
      scaleX = scaleX < 0 ? -minScale : minScale;
    } else if (Math.abs(scaleX) > maxScale) {
      scaleX = scaleX < 0 ? -maxScale : maxScale;
    }

    if (Math.abs(scaleY) < minScale) {
      scaleY = scaleY < 0 ? -minScale : minScale;
    } else if (Math.abs(scaleY) > maxScale) {
      scaleY = scaleY < 0 ? -maxScale : maxScale;
    }

    return { scaleX, scaleY, originX, originY };
  }

  // Calculate rotation angle - simpler approach
  calculateRotation(
    currentPoint: Point,
    dragStart: Point,
    bounds: TransformBounds,
    centerOverride?: Point
  ): { angle: number; centerX: number; centerY: number } {
    const center = centerOverride ?? bounds.center;

    // Vector from center to initial point
    const initialVector = {
      x: dragStart.x - center.x,
      y: dragStart.y - center.y
    };

    // Vector from center to current point
    const currentVector = {
      x: currentPoint.x - center.x,
      y: currentPoint.y - center.y
    };

    // Calculate angle between vectors (in radians)
    const initialAngle = Math.atan2(initialVector.y, initialVector.x);
    const currentAngle = Math.atan2(currentVector.y, currentVector.x);
    const rotationAngle = currentAngle - initialAngle;

    // Convert to degrees
    const angleDegrees = rotationAngle * 180 / Math.PI;

    return {
      angle: angleDegrees,
      centerX: center.x,
      centerY: center.y
    };
  }
}

// Export a singleton instance
export const transformManager = new SimpleTransformManager();

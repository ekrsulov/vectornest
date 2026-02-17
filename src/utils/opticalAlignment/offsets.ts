import type { Command } from '../../types';
import { translateCommands } from '../transformationUtils';
import {
  PROTECTION_PADDING_BOTTOM_PERCENT,
  PROTECTION_PADDING_LEFT_PERCENT,
  PROTECTION_PADDING_RIGHT_PERCENT,
  PROTECTION_PADDING_TOP_PERCENT,
} from '../visualCenterUtils';
import { debugGroup, debugLog } from '../debugUtils';
import type { Bounds } from '../boundsUtils';

/**
 * Apply translation offset to path subpaths
 * Delegates to shared translateCommands utility for consistency.
 */
export function translateSubPaths(
  subPaths: Command[][],
  offset: { x: number; y: number }
): Command[][] {
  return subPaths.map((subPath) => translateCommands(subPath, offset.x, offset.y));
}

/**
 * Calculate mathematical alignment offset between container and content
 */
export function calculateMathematicalOffset(
  containerBounds: Bounds,
  contentBounds: Bounds
): { x: number; y: number } {
  const containerMathCenter = {
    x: (containerBounds.minX + containerBounds.maxX) / 2,
    y: (containerBounds.minY + containerBounds.maxY) / 2,
  };

  const contentMathCenter = {
    x: (contentBounds.minX + contentBounds.maxX) / 2,
    y: (contentBounds.minY + contentBounds.maxY) / 2,
  };

  return {
    x: containerMathCenter.x - contentMathCenter.x,
    y: containerMathCenter.y - contentMathCenter.y,
  };
}

/**
 * Apply protection padding to offset.
 * This ensures the content doesn't get too close to the container edges.
 */
export function applyProtectionPadding(
  offset: { x: number; y: number },
  contentBounds: { minX: number; minY: number; maxX: number; maxY: number },
  containerBounds: { minX: number; minY: number; maxX: number; maxY: number }
): { x: number; y: number } {
  const containerWidth = containerBounds.maxX - containerBounds.minX;
  const containerHeight = containerBounds.maxY - containerBounds.minY;

  const paddingLeft = (PROTECTION_PADDING_LEFT_PERCENT / 100) * containerWidth;
  const paddingRight = (PROTECTION_PADDING_RIGHT_PERCENT / 100) * containerWidth;
  const paddingTop = (PROTECTION_PADDING_TOP_PERCENT / 100) * containerHeight;
  const paddingBottom = (PROTECTION_PADDING_BOTTOM_PERCENT / 100) * containerHeight;

  const newContentMinX = contentBounds.minX + offset.x;
  const newContentMaxX = contentBounds.maxX + offset.x;
  const newContentMinY = contentBounds.minY + offset.y;
  const newContentMaxY = contentBounds.maxY + offset.y;

  const minAllowedX = containerBounds.minX + paddingLeft;
  const maxAllowedX = containerBounds.maxX - paddingRight;
  const minAllowedY = containerBounds.minY + paddingTop;
  const maxAllowedY = containerBounds.maxY - paddingBottom;

  let adjustedOffsetX = offset.x;
  let adjustedOffsetY = offset.y;

  if (newContentMinX < minAllowedX) {
    adjustedOffsetX = minAllowedX - contentBounds.minX;
  } else if (newContentMaxX > maxAllowedX) {
    adjustedOffsetX = maxAllowedX - contentBounds.maxX;
  }

  if (newContentMinY < minAllowedY) {
    adjustedOffsetY = minAllowedY - contentBounds.minY;
  } else if (newContentMaxY > maxAllowedY) {
    adjustedOffsetY = maxAllowedY - contentBounds.maxY;
  }

  if (adjustedOffsetX !== offset.x || adjustedOffsetY !== offset.y) {
    debugGroup('[Protection Padding] Offset adjusted to respect padding limits', () => {
      debugLog('[Protection Padding] Original offset:', offset);
      debugLog('[Protection Padding] Adjusted offset:', { x: adjustedOffsetX, y: adjustedOffsetY });
      debugLog('[Protection Padding] Padding (%):', {
        top: PROTECTION_PADDING_TOP_PERCENT,
        bottom: PROTECTION_PADDING_BOTTOM_PERCENT,
        left: PROTECTION_PADDING_LEFT_PERCENT,
        right: PROTECTION_PADDING_RIGHT_PERCENT,
      });
      debugLog('[Protection Padding] Padding (px):', {
        top: paddingTop.toFixed(2),
        bottom: paddingBottom.toFixed(2),
        left: paddingLeft.toFixed(2),
        right: paddingRight.toFixed(2),
      });
    });
  }

  return {
    x: adjustedOffsetX,
    y: adjustedOffsetY,
  };
}

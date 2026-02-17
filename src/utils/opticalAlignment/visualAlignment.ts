import { calculateVisualCenter, pathToRGBMatrix } from '../visualCenterUtils';
import { commandsToString } from '../pathParserUtils';
import { debugGroup, debugLog } from '../debugUtils';
import type { AlignmentContext, VisualAlignmentResult } from './types';

// Thresholds for detecting problematic shapes
// Aspect ratio beyond which a shape is considered "elongated" (e.g., 1, 7, I)
const ELONGATED_ASPECT_RATIO_THRESHOLD = 2.0;

/**
 * Detect if a shape is "problematic" for optical alignment and adjust the offset.
 */
function attenuateOffsetForProblematicShapes(
  rawOffset: { x: number; y: number },
  contentWidth: number,
  contentHeight: number,
  visualCenterNormalized: { x: number; y: number }
): { x: number; y: number } {
  const aspectRatio = Math.max(contentWidth, contentHeight) / Math.min(contentWidth, contentHeight);

  const isElongated = aspectRatio > ELONGATED_ASPECT_RATIO_THRESHOLD;
  const isTallNarrow = isElongated && contentHeight > contentWidth;
  const isWideShort = isElongated && contentWidth > contentHeight;

  if (!isElongated) {
    return rawOffset;
  }

  const visualDeviationX = visualCenterNormalized.x - 0.5;
  const visualDeviationY = visualCenterNormalized.y - 0.5;

  const mathOffset = {
    x: rawOffset.x + visualDeviationX * contentWidth,
    y: rawOffset.y + visualDeviationY * contentHeight,
  };

  let finalOffset = { ...rawOffset };

  if (isTallNarrow) {
    const visualAdjustmentX = -visualDeviationX * contentHeight;

    finalOffset = {
      x: mathOffset.x + visualAdjustmentX,
      y: rawOffset.y,
    };
  } else if (isWideShort) {
    const visualAdjustmentY = -visualDeviationY * contentWidth;

    finalOffset = {
      x: rawOffset.x,
      y: mathOffset.y + visualAdjustmentY,
    };
  }

  debugGroup('[Optical Alignment] Adjustment for elongated shape', () => {
    debugLog('[Optical Alignment] Aspect ratio:', aspectRatio.toFixed(2));
    debugLog('[Optical Alignment] Shape type:', isTallNarrow ? 'tall-narrow' : 'wide-short');
    debugLog('[Optical Alignment] Visual center:', {
      x: `${(visualCenterNormalized.x * 100).toFixed(1)}%`,
      y: `${(visualCenterNormalized.y * 100).toFixed(1)}%`,
    });
    debugLog('[Optical Alignment] Visual deviation:', {
      x: `${(visualDeviationX * 100).toFixed(1)}%`,
      y: `${(visualDeviationY * 100).toFixed(1)}%`,
    });
    debugLog('[Optical Alignment] Content dimensions:', {
      width: contentWidth.toFixed(1),
      height: contentHeight.toFixed(1),
    });
    debugLog('[Optical Alignment] Raw offset:', rawOffset);
    debugLog('[Optical Alignment] Math offset:', mathOffset);
    debugLog('[Optical Alignment] Final offset:', finalOffset);
  });

  return finalOffset;
}

/**
 * Compute visual alignment between container and content
 * Returns visual center, mathematical center, and offset needed for alignment
 */
export async function computeVisualAlignment(
  context: AlignmentContext
): Promise<VisualAlignmentResult> {
  const { containerBounds, contentBounds, contentData, containerFillColor } = context;

  const contentPath = commandsToString(contentData.subPaths.flat());

  const containerWidth = containerBounds.maxX - containerBounds.minX;
  const containerHeight = containerBounds.maxY - containerBounds.minY;

  const fillColor = contentData.fillColor || 'black';
  const fillOpacity = contentData.fillOpacity ?? 1;
  const strokeColor = contentData.strokeColor || 'none';
  const strokeWidth = contentData.strokeWidth || 0;
  const strokeOpacity = contentData.strokeOpacity ?? 1;
  const strokeLinecap = contentData.strokeLinecap || 'butt';
  const strokeLinejoin = contentData.strokeLinejoin || 'miter';
  const strokeDasharray = contentData.strokeDasharray || '';

  const { rgbMatrix, bgColor } = await pathToRGBMatrix(
    contentPath,
    containerWidth,
    containerHeight,
    fillColor,
    fillOpacity,
    strokeColor,
    strokeWidth,
    strokeOpacity,
    strokeLinecap,
    strokeLinejoin,
    strokeDasharray,
    false,
    containerFillColor,
    420
  );

  const visualCenter = calculateVisualCenter(rgbMatrix, bgColor);

  const containerMathCenter = {
    x: (containerBounds.minX + containerBounds.maxX) / 2,
    y: (containerBounds.minY + containerBounds.maxY) / 2,
  };

  const contentMathCenter = {
    x: (contentBounds.minX + contentBounds.maxX) / 2,
    y: (contentBounds.minY + contentBounds.maxY) / 2,
  };

  const contentWidth = contentBounds.maxX - contentBounds.minX;
  const contentHeight = contentBounds.maxY - contentBounds.minY;

  const visualCenterActual = {
    x: contentBounds.minX + visualCenter.x * contentWidth,
    y: contentBounds.minY + visualCenter.y * contentHeight,
  };

  const rawOffset = {
    x: containerMathCenter.x - visualCenterActual.x,
    y: containerMathCenter.y - visualCenterActual.y,
  };

  const offset = attenuateOffsetForProblematicShapes(
    rawOffset,
    contentWidth,
    contentHeight,
    visualCenter
  );

  return {
    visualCenter: visualCenterActual,
    mathematicalCenter: contentMathCenter,
    offset,
  };
}

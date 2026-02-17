import { calculateMathematicalOffset } from './offsets';
import { computeVisualAlignment } from './visualAlignment';
import type { AlignmentStrategy } from './types';

/**
 * Mathematical alignment strategy - uses geometric centers.
 */
export const mathematicalAlignmentStrategy: AlignmentStrategy = (context) => {
  return calculateMathematicalOffset(context.containerBounds, context.contentBounds);
};

/**
 * Visual alignment strategy - uses visual centers computed from image analysis.
 */
export const visualAlignmentStrategy: AlignmentStrategy = async (context) => {
  const { offset } = await computeVisualAlignment(context);
  return offset;
};

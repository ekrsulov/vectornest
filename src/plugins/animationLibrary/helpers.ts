import type { CanvasElement } from '../../types';
import { generateShortId } from '../../utils/idGenerator';

/**
 * Generate a unique preset ID
 */
export const makePresetId = () => generateShortId('preset');

/**
 * Check if an element is a text element
 */
export const isTextElement = (el: CanvasElement): boolean => {
  return el.type === 'nativeText';
};

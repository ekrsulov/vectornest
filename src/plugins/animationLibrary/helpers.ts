import type { CanvasElement } from '../../types';

/**
 * Generate a unique preset ID
 */
export const makePresetId = () => `preset-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

/**
 * Check if an element is a text element
 */
export const isTextElement = (el: CanvasElement): boolean => {
  return el.type === 'nativeText';
};

import { canvasStoreApi } from '../store/canvasStore';

export const DEFAULT_STROKE_COLOR_LIGHT = '#000000';
export const DEFAULT_STROKE_COLOR_DARK = '#ffffff';

export function getDefaultStrokeColorFromSettings(): string {
  return canvasStoreApi.getState().settings?.defaultStrokeColor ?? DEFAULT_STROKE_COLOR_LIGHT;
}

import { useCanvasStore } from '../store/canvasStore';
import { measurePath } from '../utils/measurementUtils';

// Extend window interface for testing
declare global {
  interface Window {
    useCanvasStore?: typeof useCanvasStore;
    measurePath?: typeof measurePath;
  }
}

/**
 * Exposes global test helpers for Playwright and other testing frameworks.
 * Only loaded when NODE_ENV === 'test' to avoid production dependencies.
 */
export const exposeTestGlobals = () => {
  window.useCanvasStore = useCanvasStore;
  window.measurePath = measurePath;
};
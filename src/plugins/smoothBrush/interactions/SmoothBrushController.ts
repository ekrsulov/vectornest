import type { Point } from '../../../types';

export interface SmoothBrushCallbacks {
  activateSmoothBrush: () => void;
  deactivateSmoothBrush: () => void;
  updateSmoothBrushCursor: (x: number, y: number) => void;
  applySmoothBrush: (x: number, y: number) => void;
  isSmoothBrushActive: () => boolean;
}

export class SmoothBrushController {
  private callbacks: SmoothBrushCallbacks;

  constructor(callbacks: SmoothBrushCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Activate smooth brush
   */
  activate(): void {
    this.callbacks.activateSmoothBrush();
  }

  /**
   * Deactivate smooth brush
   */
  deactivate(): void {
    this.callbacks.deactivateSmoothBrush();
  }

  /**
   * Update cursor position
   */
  updateCursor(position: Point): void {
    if (this.callbacks.isSmoothBrushActive()) {
      this.callbacks.updateSmoothBrushCursor(position.x, position.y);
    }
  }

  /**
   * Apply brush at position
   */
  apply(position: Point): void {
    if (this.callbacks.isSmoothBrushActive()) {
      this.callbacks.applySmoothBrush(position.x, position.y);
    }
  }

  /**
   * Check if smooth brush is active
   */
  isActive(): boolean {
    return this.callbacks.isSmoothBrushActive();
  }
}
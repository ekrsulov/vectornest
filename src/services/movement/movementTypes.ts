import type { StoreApi } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { Matrix } from '../../utils/matrixUtils';

export type MovementSetState = StoreApi<CanvasStore>['setState'];
export type MovementGetState = StoreApi<CanvasStore>['getState'];

export type AnimationTransformDelta = (entries: Array<{
  elementId: string;
  from: Matrix;
  to: Matrix;
}>) => void;

export interface MoveSelectedElementsParams {
  deltaX: number;
  deltaY: number;
  precisionOverride?: number;
  setState: MovementSetState;
  getState: MovementGetState;
}

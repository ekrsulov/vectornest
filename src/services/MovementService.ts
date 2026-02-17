import type { CanvasStore } from '../store/canvasStore';
import {
  moveSelectionInGroupEditor,
  moveSelectionNormally,
} from './movement/movementStrategies';
import type {
  AnimationTransformDelta,
  MoveSelectedElementsParams,
} from './movement/movementTypes';

export type {
  MovementGetState,
  MovementSetState,
} from './movement/movementTypes';

export const moveSelectedElementsWithService = ({
  deltaX,
  deltaY,
  precisionOverride,
  setState,
  getState,
}: MoveSelectedElementsParams): void => {
  const state = getState();
  const selectedIds = state.selectedIds;
  if (selectedIds.length === 0) {
    return;
  }

  const applyAnimationTransformDelta = (state as CanvasStore & {
    applyAnimationTransformDelta?: AnimationTransformDelta;
  }).applyAnimationTransformDelta;

  const precision = precisionOverride ?? state.settings.keyboardMovementPrecision;

  const isGroupEditing = Boolean(
    state.groupEditor.isEditing &&
      state.groupEditor.activeGroupId &&
      state.groupEditor.localTransforms
  );

  if (isGroupEditing) {
    moveSelectionInGroupEditor(
      state,
      selectedIds,
      deltaX,
      deltaY,
      precision,
      setState,
      getState,
      applyAnimationTransformDelta
    );
    return;
  }

  moveSelectionNormally(
    state,
    selectedIds,
    deltaX,
    deltaY,
    precision,
    setState,
    getState,
    applyAnimationTransformDelta
  );
};

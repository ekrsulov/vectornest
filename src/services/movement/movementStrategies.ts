import type { CanvasElement, GroupElement, PathData } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { createTranslateMatrix, multiplyMatrices } from '../../utils/matrixUtils';
import { definitionTranslationRegistry } from '../../utils/definitionTranslationRegistry';
import {
  applyAnimationDelta,
  moveGroupByLocalDelta,
  resolveLocalDelta,
} from './movementTransformHelpers';
import {
  collectGroupsToMove,
  collectMovedGroupSourceIds,
  collectMovedSubtreeIds,
  collectRootGroups,
} from './movementSelectionGraph';
import type { AnimationTransformDelta, MovementGetState, MovementSetState } from './movementTypes';

export const moveSelectionInGroupEditor = (
  state: CanvasStore,
  selectedIds: string[],
  deltaX: number,
  deltaY: number,
  precision: number,
  setState: MovementSetState,
  getState: MovementGetState,
  applyAnimationTransformDelta?: AnimationTransformDelta
): void => {
  const activeGroupId = state.groupEditor.activeGroupId;
  const allowedIds = new Set<string>();

  if (activeGroupId) {
    allowedIds.add(activeGroupId);
    const descendants = state.getGroupDescendants?.(activeGroupId) ?? [];
    descendants.forEach((id) => allowedIds.add(id));
  }

  const filteredSelectedIds = activeGroupId
    ? selectedIds.filter((id) => allowedIds.has(id))
    : selectedIds;

  if (filteredSelectedIds.length === 0) {
    return;
  }

  const localSelectedSet = new Set(filteredSelectedIds);
  const movedElementIds = new Set<string>();
  const movedGroupIds = new Set<string>();

  setState((currentState) => ({
    elements: currentState.elements.map((element) => {
      if (!localSelectedSet.has(element.id)) {
        return element;
      }

      const localDelta = resolveLocalDelta(deltaX, deltaY, element, currentState.elements);

      if (element.type === 'group') {
        movedElementIds.add(element.id);
        movedGroupIds.add(element.id);
        return moveGroupByLocalDelta(element as GroupElement, localDelta);
      }

      const translated = elementContributionRegistry.translateElement(
        element,
        localDelta.x,
        localDelta.y,
        precision
      );

      if (translated) {
        movedElementIds.add(element.id);
        return translated;
      }

      return element;
    }),
  }));

  applyAnimationDelta(applyAnimationTransformDelta, movedElementIds, deltaX, deltaY);

  if (movedElementIds.size > 0) {
    definitionTranslationRegistry.notifyElementsMoved(
      {
        movedElementIds,
        movedGroupIds,
        deltaX,
        deltaY,
      },
      getState(),
      (updater) => setState(updater)
    );
  }

  pluginManager.executeLifecycleAction('onElementsMoved');
};

/** Cached element map to avoid O(n) rebuild on every pointermove during drag */
let _cachedElements: CanvasElement[] | null = null;
let _cachedElementMap: Map<string, CanvasElement> | null = null;

function getElementMap(elements: CanvasElement[]): Map<string, CanvasElement> {
  if (_cachedElements === elements && _cachedElementMap) {
    return _cachedElementMap;
  }
  const map = new Map<string, CanvasElement>();
  for (const element of elements) {
    map.set(element.id, element);
  }
  _cachedElements = elements;
  _cachedElementMap = map;
  return map;
}

export const moveSelectionNormally = (
  state: CanvasStore,
  selectedIds: string[],
  deltaX: number,
  deltaY: number,
  precision: number,
  setState: MovementSetState,
  getState: MovementGetState,
  applyAnimationTransformDelta?: AnimationTransformDelta
): void => {
  const elementMap = getElementMap(state.elements);

  const selectedSet = new Set(selectedIds);
  const groupsToMoveIds = collectGroupsToMove(selectedIds, elementMap);
  const rootGroupIds = collectRootGroups(groupsToMoveIds, elementMap);
  const movedSubtreeIds = collectMovedSubtreeIds(rootGroupIds, state);
  const movedGroupSourceIds = collectMovedGroupSourceIds(rootGroupIds, elementMap);

  const movedElementIds = new Set<string>();
  const movedGroupIds = new Set<string>();

  setState((currentState) => ({
    elements: currentState.elements.map((element) => {
      if (element.type === 'group' && rootGroupIds.has(element.id)) {
        movedGroupIds.add(element.id);
        const localDelta = resolveLocalDelta(deltaX, deltaY, element, currentState.elements);
        return moveGroupByLocalDelta(element as GroupElement, localDelta);
      }

      if (movedSubtreeIds.has(element.id)) {
        return element;
      }

      if (movedGroupSourceIds.size > 0 && element.type === 'path' && !selectedSet.has(element.id)) {
        const pathData = element.data as PathData;
        const textPath = pathData.textPath;
        if (
          textPath?.transformMatrix &&
          textPath.anchorGroupSourceIds &&
          textPath.anchorGroupSourceIds.some((id) => movedGroupSourceIds.has(id))
        ) {
          return {
            ...element,
            data: {
              ...pathData,
              textPath: {
                ...textPath,
                transformMatrix: multiplyMatrices(
                  createTranslateMatrix(deltaX, deltaY),
                  textPath.transformMatrix
                ),
              },
            },
          };
        }
      }

      const shouldMove = selectedSet.has(element.id) && !movedElementIds.has(element.id);
      if (!shouldMove) {
        return element;
      }

      movedElementIds.add(element.id);
      const translated = elementContributionRegistry.translateElement(
        element,
        deltaX,
        deltaY,
        precision
      );

      return translated ?? element;
    }),
  }));

  applyAnimationDelta(applyAnimationTransformDelta, movedElementIds, deltaX, deltaY);

  if (movedElementIds.size > 0) {
    definitionTranslationRegistry.notifyElementsMoved(
      {
        movedElementIds,
        movedGroupIds,
        deltaX,
        deltaY,
      },
      getState(),
      (updater) => setState(updater)
    );
  }

  pluginManager.executeLifecycleAction('onElementsMoved');
};

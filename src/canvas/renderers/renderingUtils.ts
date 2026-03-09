import { isGroupElement } from '../../types';
import type { CanvasRenderContext } from './CanvasRendererRegistry';

/**
 * Compare two viewport objects for equality.
 * Shared by PathElementRenderer and GroupElementRenderer for memo comparison.
 */
export const areViewportsEqual = (
    previous: CanvasRenderContext['viewport'],
    next: CanvasRenderContext['viewport']
): boolean =>
    previous.zoom === next.zoom &&
    previous.panX === next.panX &&
    previous.panY === next.panY;

type GroupRenderComparisonContext = Pick<
    CanvasRenderContext,
    'elementMap' | 'isElementHidden' | 'isElementSelected' | 'isElementLocked'
>;

const hasSameElementInteractionState = (
    previous: GroupRenderComparisonContext,
    next: GroupRenderComparisonContext,
    elementId: string
): boolean => {
    const wasHidden = previous.isElementHidden?.(elementId) ?? false;
    const isHidden = next.isElementHidden?.(elementId) ?? false;
    if (wasHidden !== isHidden) {
        return false;
    }

    const wasSelected = previous.isElementSelected?.(elementId) ?? false;
    const isSelected = next.isElementSelected?.(elementId) ?? false;
    if (wasSelected !== isSelected) {
        return false;
    }

    const wasLocked = previous.isElementLocked?.(elementId) ?? false;
    const isLocked = next.isElementLocked?.(elementId) ?? false;
    return wasLocked === isLocked;
};

const compareGroupSubtree = (
    previous: GroupRenderComparisonContext,
    next: GroupRenderComparisonContext,
    groupId: string,
    visited: Set<string>
): boolean => {
    if (visited.has(groupId)) {
        return true;
    }
    visited.add(groupId);

    const previousGroup = previous.elementMap.get(groupId);
    const nextGroup = next.elementMap.get(groupId);

    if (!isGroupElement(previousGroup) || !isGroupElement(nextGroup)) {
        return previousGroup === nextGroup &&
            hasSameElementInteractionState(previous, next, groupId);
    }

    if (previousGroup !== nextGroup) {
        return false;
    }

    if (!hasSameElementInteractionState(previous, next, groupId)) {
        return false;
    }

    if ((previous.isElementHidden?.(groupId) ?? false) && (next.isElementHidden?.(groupId) ?? false)) {
        return true;
    }

    const previousChildIds = Array.isArray(previousGroup.data.childIds) ? previousGroup.data.childIds : [];
    const nextChildIds = Array.isArray(nextGroup.data.childIds) ? nextGroup.data.childIds : [];

    if (previousChildIds.length !== nextChildIds.length) {
        return false;
    }

    for (let index = 0; index < nextChildIds.length; index += 1) {
        const previousChildId = previousChildIds[index];
        const nextChildId = nextChildIds[index];
        if (previousChildId !== nextChildId) {
            return false;
        }

        const previousChild = previous.elementMap.get(nextChildId);
        const nextChild = next.elementMap.get(nextChildId);

        if (previousChild !== nextChild) {
            return false;
        }

        if (!hasSameElementInteractionState(previous, next, nextChildId)) {
            return false;
        }

        if (isGroupElement(previousChild) && isGroupElement(nextChild)) {
            if (!compareGroupSubtree(previous, next, nextChildId, visited)) {
                return false;
            }
        }
    }

    return true;
};

export const haveSameGroupSubtree = (
    previous: GroupRenderComparisonContext,
    next: GroupRenderComparisonContext,
    groupId: string
): boolean => compareGroupSubtree(previous, next, groupId, new Set<string>());

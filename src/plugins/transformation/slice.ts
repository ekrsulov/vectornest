import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import { accumulateBounds } from '../../utils/measurementUtils';
import { transformCommands, calculateScaledStrokeWidth } from '../../utils/sharedTransformUtils';
import { applyDistortTransform, applySkewXTransform, applySkewYTransform } from '../../utils/advancedTransformUtils';
import { getGroupBounds } from '../../canvas/geometry/CanvasGeometryService';
import { buildElementMap } from '../../utils';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { getAllElementsShareSameParentGroup } from '../basePluginDefinitions';
import type { GroupElement, PathData, CanvasElement, Point } from '../../types';
import type { Bounds } from '../../utils/boundsUtils';
import { computeTransformDeltas } from '../../utils/animationTransformDelta';

type FullStore = CanvasStore & TransformationPluginSlice;

const computeAffineFromRect = (
  bounds: Bounds,
  corners: { tl: Point; tr: Point; bl: Point }
): [number, number, number, number, number, number] => {
  // Map source rectangle (tl -> tr -> bl) to target corners (tl,tr,bl)
  // Solve for affine transform using three point pairs
  const src = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.minX, y: bounds.maxY },
  ];
  const dst = [corners.tl, corners.tr, corners.bl];

  const x1 = src[0].x; const y1 = src[0].y;
  const x2 = src[1].x; const y2 = src[1].y;
  const x3 = src[2].x; const y3 = src[2].y;

  const u1 = dst[0].x; const v1 = dst[0].y;
  const u2 = dst[1].x; const v2 = dst[1].y;
  const u3 = dst[2].x; const v3 = dst[2].y;

  const det = x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2) || 1;

  const a = (u1 * (y2 - y3) + u2 * (y3 - y1) + u3 * (y1 - y2)) / det;
  const b = (v1 * (y2 - y3) + v2 * (y3 - y1) + v3 * (y1 - y2)) / det;
  const c = (u1 * (x3 - x2) + u2 * (x1 - x3) + u3 * (x2 - x1)) / det;
  const d = (v1 * (x3 - x2) + v2 * (x1 - x3) + v3 * (x2 - x1)) / det;
  const e = (u1 * (x2 * y3 - x3 * y2) + u2 * (x3 * y1 - x1 * y3) + u3 * (x1 * y2 - x2 * y1)) / det;
  const f = (v1 * (x2 * y3 - x3 * y2) + v2 * (x3 * y1 - x1 * y3) + v3 * (x1 * y2 - x2 * y1)) / det;

  return [a, b, c, d, e, f];
};

// Import transformation types
export interface TransformState {
  isTransforming: boolean;
  transformStart: Point | null;
  transformElementId: string | null;
  transformHandler: string | null;
  originalBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  transformedBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  initialTransform: { scaleX: number; scaleY: number; rotation: number; translateX: number; translateY: number } | null;
  originalElementData: CanvasElement['data'];
  rotationCenter?: Point | null;
  originalElementsData?: Map<string, CanvasElement>;
  animationTargetIds?: Set<string> | null;
  elementsBeforeTransform?: CanvasElement[] | null;
}

export interface TransformFeedback {
  rotation: { degrees: number; visible: boolean; isShiftPressed: boolean; isMultipleOf15: boolean };
  resize: { deltaX: number; deltaY: number; visible: boolean; isShiftPressed: boolean; isMultipleOf10: boolean };
  shape: { width: number; height: number; visible: boolean; isShiftPressed: boolean; isMultipleOf10: boolean };
  pointPosition: { x: number; y: number; visible: boolean };
  customFeedback?: { message: string; visible: boolean };
}

export interface AdvancedTransformState {
  isTransforming: boolean;
  transformType: 'distort' | 'skew' | null;
  handler: string | null;
  startPoint: Point | null;
  originalBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  corners: { tl: Point; tr: Point; bl: Point; br: Point } | null;
  skewAxis: 'x' | 'y' | null;
  originalElements: Map<string, CanvasElement> | null;
  animationTargetIds?: Set<string> | null;
  elementsBeforeTransform?: CanvasElement[] | null;
}

/**
 * Helper function to transform all descendants of a group recursively
 */
function transformGroupDescendants(
  group: GroupElement,
  elementMap: Map<string, CanvasElement>,
  updateElement: (id: string, updates: Partial<CanvasElement>) => void,
  transform: {
    scaleX: number;
    scaleY: number;
    originX: number;
    originY: number;
    rotation: number;
    rotationCenterX: number;
    rotationCenterY: number;
  },
  visited: Set<string> = new Set()
): void {
  if (visited.has(group.id)) return;
  visited.add(group.id);

  group.data.childIds.forEach((childId) => {
    const child = elementMap.get(childId);
    if (!child) return;

    if (child.type === 'group') {
      // Recursively transform nested groups
      transformGroupDescendants(child as GroupElement, elementMap, updateElement, transform, visited);
    } else if (child.type === 'path') {
      // Transform path element
      const pathData = child.data as PathData;

      const newSubPaths = pathData.subPaths.map((subPath) =>
        transformCommands(subPath, transform)
      );

      const newStrokeWidth = calculateScaledStrokeWidth(
        pathData.strokeWidth,
        transform.scaleX,
        transform.scaleY
      );

      updateElement(child.id, {
        data: {
          ...pathData,
        subPaths: newSubPaths,
        strokeWidth: newStrokeWidth
      }
    });
    } else {
      let updated = elementContributionRegistry.scaleElement(child, transform.scaleX, transform.scaleY, transform.originX, transform.originY, 3) ?? child;
      updated = elementContributionRegistry.rotateElement(updated, transform.rotation, transform.rotationCenterX, transform.rotationCenterY, 3) ?? updated;
      updateElement(updated.id, { data: updated.data });
    }
  });

  visited.delete(group.id);
}

const collectTransformTargetIds = (state: CanvasStore, selectedIds: string[]): Set<string> => {
  const ids = new Set<string>();

  selectedIds.forEach((id) => {
    ids.add(id);
    const descendants = state.getGroupDescendants ? state.getGroupDescendants(id) : [];
    descendants.forEach((childId) => ids.add(childId));
  });

  return ids;
};

export interface TransformationPluginSlice {
  // State
  transformation: {
    isTransforming: boolean;
    activeHandler: string | null;
    showCoordinates: boolean;
    showRulers: boolean;
    maintainAspectRatio: boolean;
    advancedMode: boolean;
    rotationPivot: Point | null;
    rotationPivotTarget: string | null;
  };

  // Runtime transformation state (updated by hooks)
  transformState?: TransformState;
  transformFeedback?: TransformFeedback;
  advancedTransformState?: AdvancedTransformState;

  // Transformation handlers (set by hooks, used by Canvas and event handlers)
  transformationHandlers?: {
    startTransformation: (elementId: string, handler: string, point: Point) => void;
    updateTransformation: (point: Point, isShiftPressed: boolean) => void;
    endTransformation: () => void;
    startAdvancedTransformation: (handler: string, point: Point, isModifierPressed: boolean) => void;
    updateAdvancedTransformation: (point: Point) => void;
    endAdvancedTransformation: () => void;
  };

  // Actions to update runtime state and handlers
  setTransformState: (state: TransformState) => void;
  setTransformFeedback: (feedback: TransformFeedback) => void;
  setAdvancedTransformState: (state: AdvancedTransformState) => void;
  setTransformationHandlers: (handlers: TransformationPluginSlice['transformationHandlers']) => void;

  // Existing actions
  updateTransformationState: (state: Partial<TransformationPluginSlice['transformation']>) => void;
  getTransformationBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  isWorkingWithSubpaths: () => boolean;
  applyResizeTransform: (width: number, height: number) => void;
  applyRotationTransform: (degrees: number) => void;
  applyAdvancedDistortTransform: (newCorners: { tl: Point; tr: Point; bl: Point; br: Point }, shouldUpdateAnimations?: boolean) => void;
  applyAdvancedSkewTransform: (axis: 'x' | 'y', angle: number, shouldUpdateAnimations?: boolean) => void;
}

export const createTransformationPluginSlice: StateCreator<
  TransformationPluginSlice,
  [],
  [],
  TransformationPluginSlice
> = (set, get) => {
  return {
    // Initial state
    transformation: {
      isTransforming: false,
      activeHandler: null,
      showCoordinates: false,
      showRulers: false,
      maintainAspectRatio: true,
      advancedMode: false,
      rotationPivot: null,
      rotationPivotTarget: null,
    },

    // Runtime state (initially undefined, set by hooks)
    transformState: undefined,
    transformFeedback: undefined,
    advancedTransformState: undefined,
    transformationHandlers: undefined,

    // Actions to update runtime state and handlers
    setTransformState: (state) => {
      set({ transformState: state });
    },

    setTransformFeedback: (feedback) => {
      set({ transformFeedback: feedback });
    },

    setAdvancedTransformState: (state) => {
      set({ advancedTransformState: state });
    },

    setTransformationHandlers: (handlers) => {
      set({ transformationHandlers: handlers });
    },

    // Actions
    updateTransformationState: (state) => {
      set((current) => ({
        transformation: { ...current.transformation, ...state },
      }));
    },

    // Check if transformation should work with subpaths instead of full elements
    isWorkingWithSubpaths: () => {
      const state = get() as FullStore;
      return (state.selectedSubpaths?.length ?? 0) > 0;
    },

    // Get bounds for transformation - either from selected subpaths or selected elements
    getTransformationBounds: () => {
      const state = get() as FullStore;
      const isSubpathMode = state.isWorkingWithSubpaths?.() ?? false;

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Calculate bounds for selected subpaths
        const subpathCommandsToMeasure: import('../../types').Command[][] = [];
        let strokeWidth = 1; // Default stroke width

        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            if (subpathIndex < pathData.subPaths.length) {
              subpathCommandsToMeasure.push(pathData.subPaths[subpathIndex]);
              strokeWidth = pathData.strokeWidth; // Use stroke width from the path
            }
          }
        });

        if (subpathCommandsToMeasure.length === 0) return null;

        return accumulateBounds(subpathCommandsToMeasure, strokeWidth, state.viewport.zoom);
      } else {
        // Calculate bounds for selected elements (paths and groups)
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let hasBounds = false;

        // Create element map for group bounds calculation
        const elementMap = buildElementMap(state.elements);

        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (!element) return;

          let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

          if (element.type === 'path') {
            // For paths, accumulate bounds from subpaths
            const pathData = element.data as import('../../types').PathData;
            bounds = accumulateBounds(pathData.subPaths, pathData.strokeWidth, state.viewport.zoom);
          } else if (element.type === 'group') {
            // For groups, use getGroupBounds
            bounds = getGroupBounds(element as GroupElement, elementMap, state.viewport);
          } else {
            bounds = elementContributionRegistry.getBounds(element, {
              viewport: state.viewport,
              elementMap,
            });
          }

          if (bounds) {
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
            hasBounds = true;
          }
        });

        if (!hasBounds) return null;

        return { minX, minY, maxX, maxY };
      }
    },

    // Apply resize transformation to selected elements or subpaths
    applyResizeTransform: (width: number, height: number) => {
      const state = get() as FullStore;
      const isSubpathMode = state.isWorkingWithSubpaths?.() ?? false;
      const bounds = state.getTransformationBounds?.();

      if (!bounds) return;

      const animationUpdater = state.applyAnimationTransformDelta;
      const shouldUpdateAnimations = !!animationUpdater && !isSubpathMode;
      const animationTargets = shouldUpdateAnimations ? collectTransformTargetIds(state, state.selectedIds) : null;
      const elementsBefore = shouldUpdateAnimations ? state.elements : null;

      const currentWidth = bounds.maxX - bounds.minX;
      const currentHeight = bounds.maxY - bounds.minY;

      if (currentWidth === 0 || currentHeight === 0) return;

      const scaleX = width / currentWidth;
      const scaleY = height / currentHeight;

      const originX = (bounds.minX + bounds.maxX) / 2;
      const originY = (bounds.minY + bounds.maxY) / 2;

      const transform = {
        scaleX,
        scaleY,
        originX,
        originY,
        rotation: 0,
        rotationCenterX: originX,
        rotationCenterY: originY
      };

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply transformation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];

            newSubPaths[subpathIndex] = transformCommands(newSubPaths[subpathIndex], transform);

            state.updateElement(elementId, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          }
        });
      } else {
        // Apply transformation to selected elements (paths and groups)
        const elementMap = buildElementMap(state.elements);

        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (!element) return;

          if (element.type === 'group') {
            // Transform all descendants of the group
            transformGroupDescendants(element as GroupElement, elementMap, state.updateElement, transform);
          } else if (element.type === 'path') {
            // Transform path element
            const pathData = element.data as import('../../types').PathData;

            const newSubPaths = pathData.subPaths.map((subPath) =>
              transformCommands(subPath, transform)
            );

            const newStrokeWidth = calculateScaledStrokeWidth(pathData.strokeWidth, scaleX, scaleY);

            state.updateElement(id, {
              data: {
                ...pathData,
                subPaths: newSubPaths,
                strokeWidth: newStrokeWidth
              }
            });
          } else {
            const scaled = elementContributionRegistry.scaleElement(element, scaleX, scaleY, originX, originY, 3);
            if (scaled) {
              state.updateElement(id, { data: scaled.data });
            }
          }
        });
      }

      if (shouldUpdateAnimations && animationTargets && elementsBefore) {
        const elementsAfter = (get() as FullStore).elements;
        const deltaEntries = computeTransformDeltas(animationTargets, elementsBefore, elementsAfter);
        if (deltaEntries.length && animationUpdater) {
          animationUpdater(deltaEntries);
        }
      }
    },

    // Apply rotation transformation to selected elements or subpaths
    applyRotationTransform: (degrees: number) => {
      const state = get() as FullStore;
      const isSubpathMode = state.isWorkingWithSubpaths?.() ?? false;
      const bounds = state.getTransformationBounds?.();

      if (!bounds) return;

      const animationUpdater = state.applyAnimationTransformDelta;
      const shouldUpdateAnimations = !!animationUpdater && !isSubpathMode;
      const animationTargets = shouldUpdateAnimations ? collectTransformTargetIds(state, state.selectedIds) : null;
      const elementsBefore = shouldUpdateAnimations ? state.elements : null;

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      let rotationCenterX = centerX;
      let rotationCenterY = centerY;
      let elementMap: Map<string, CanvasElement> | null = null;

      if (!isSubpathMode) {
        elementMap = buildElementMap(state.elements);
        const transformationState = state.transformation;
        const rotationPivotTarget = transformationState?.rotationPivotTarget ?? null;
        let target: string | null = null;

        if (state.selectedIds.length === 1) {
          const selectedElement = elementMap.get(state.selectedIds[0]);
          if (selectedElement?.type === 'group') {
            target = `group:${selectedElement.id}`;
          } else {
            target = `element:${state.selectedIds[0]}`;
          }
        } else if (state.selectedIds.length > 1) {
          const sharedParentGroupId = getAllElementsShareSameParentGroup(state.selectedIds, elementMap);
          target = sharedParentGroupId ? `group:${sharedParentGroupId}` : 'selection-bbox';
        }

        if (rotationPivotTarget && rotationPivotTarget === target) {
          const pivot = transformationState?.rotationPivot;
          if (pivot) {
            rotationCenterX = pivot.x;
            rotationCenterY = pivot.y;
          }
        }
      }

      const transform = {
        scaleX: 1,
        scaleY: 1,
        originX: rotationCenterX,
        originY: rotationCenterY,
        rotation: degrees,
        rotationCenterX: rotationCenterX,
        rotationCenterY: rotationCenterY
      };

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply rotation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];

            newSubPaths[subpathIndex] = transformCommands(newSubPaths[subpathIndex], transform);

            state.updateElement(elementId, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          }
        });
      } else {
        // Apply rotation to selected elements (paths and groups)
        const resolvedElementMap = elementMap ?? buildElementMap(state.elements);

        state.selectedIds.forEach((id) => {
          const element = resolvedElementMap.get(id);
          if (!element) return;

          if (element.type === 'group') {
            // Transform all descendants of the group (rotation only, no scaling)
            const rotationTransform = {
              ...transform,
              scaleX: 1,
              scaleY: 1
            };
            transformGroupDescendants(element as GroupElement, resolvedElementMap, state.updateElement, rotationTransform);
          } else if (element.type === 'path') {
            // Transform path element
            const pathData = element.data as import('../../types').PathData;

            const newSubPaths = pathData.subPaths.map((subPath) =>
              transformCommands(subPath, transform)
            );

            state.updateElement(id, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          } else {
            const rotated = elementContributionRegistry.rotateElement(element, degrees, rotationCenterX, rotationCenterY, 3);
            if (rotated) {
              state.updateElement(id, { data: rotated.data });
            }
          }
        });
      }

      if (shouldUpdateAnimations && animationTargets && elementsBefore) {
        const elementsAfter = (get() as FullStore).elements;
        const deltaEntries = computeTransformDeltas(animationTargets, elementsBefore, elementsAfter);
        if (deltaEntries.length && animationUpdater) {
          animationUpdater(deltaEntries);
        }
      }
    },

    // Apply advanced distort transformation (free-form corner movement)
    applyAdvancedDistortTransform: (newCorners: { tl: Point; tr: Point; bl: Point; br: Point }, shouldUpdateAnimations = true) => {
      const state = get() as FullStore;
      const isSubpathMode = state.isWorkingWithSubpaths?.() ?? false;
      const bounds = state.getTransformationBounds?.();

      if (!bounds) return;
      const animationUpdater = state.applyAnimationTransformDelta;
      const allowAnimationUpdate = shouldUpdateAnimations && !!animationUpdater && !isSubpathMode;
      const animationTargets = allowAnimationUpdate ? collectTransformTargetIds(state, state.selectedIds) : null;
      const elementsBefore = allowAnimationUpdate ? state.elements : null;
      const selectionWidth = bounds.maxX - bounds.minX || 1;
      const selectionHeight = bounds.maxY - bounds.minY || 1;

      const interpolate = (p1: Point, p2: Point, t: number): Point => ({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
      });

      const mapPointToWarp = (pt: Point): Point => {
        const u = (pt.x - bounds.minX) / selectionWidth;
        const v = (pt.y - bounds.minY) / selectionHeight;
        const top = interpolate(newCorners.tl, newCorners.tr, u);
        const bottom = interpolate(newCorners.bl, newCorners.br, u);
        return interpolate(top, bottom, v);
      };

      const getTargetCornersForElement = (elementBounds: Bounds) => ({
        tl: mapPointToWarp({ x: elementBounds.minX, y: elementBounds.minY }),
        tr: mapPointToWarp({ x: elementBounds.maxX, y: elementBounds.minY }),
        bl: mapPointToWarp({ x: elementBounds.minX, y: elementBounds.maxY }),
      });

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply transformation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];

            newSubPaths[subpathIndex] = applyDistortTransform(newSubPaths[subpathIndex], bounds, newCorners);

            state.updateElement(elementId, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          }
        });
      } else {
        // Apply transformation to selected elements (paths and groups)
        const elementMap = buildElementMap(state.elements);

        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (!element) return;

          if (element.type === 'group') {
            // For groups, transform all descendants
            const group = element as GroupElement;
            const visited = new Set<string>();

            const transformDescendantsDistort = (grp: GroupElement) => {
              if (visited.has(grp.id)) return;
              visited.add(grp.id);

              grp.data.childIds.forEach((childId) => {
                const child = elementMap.get(childId);
                if (!child) return;

                if (child.type === 'group') {
                  transformDescendantsDistort(child as GroupElement);
                } else if (child.type === 'path') {
                  const pathData = child.data as PathData;
                  const newSubPaths = pathData.subPaths.map((subPath) =>
                    applyDistortTransform(subPath, bounds, newCorners)
                  );

                  state.updateElement(child.id, {
                    data: {
                      ...pathData,
                      subPaths: newSubPaths
                    }
                  });
                } else {
                  const childBounds = elementContributionRegistry.getBounds(child, {
                    viewport: state.viewport,
                    elementMap,
                  });
                  if (childBounds) {
                    const targetCorners = getTargetCornersForElement(childBounds as Bounds);
                    const matrix = computeAffineFromRect(childBounds as Bounds, targetCorners);
                    const transformed = elementContributionRegistry.applyAffineTransform(child, matrix, 3);
                    if (transformed) {
                      state.updateElement(child.id, { data: transformed.data });
                    }
                  }
                }
              });
            };

            transformDescendantsDistort(group);
          } else if (element.type === 'path') {
            // Transform path element
            const pathData = element.data as import('../../types').PathData;

            const newSubPaths = pathData.subPaths.map((subPath) =>
              applyDistortTransform(subPath, bounds, newCorners)
            );

            state.updateElement(id, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          } else {
            const elementBounds = elementContributionRegistry.getBounds(element, {
              viewport: state.viewport,
              elementMap,
            });
            if (elementBounds) {
              const targetCorners = getTargetCornersForElement(elementBounds as Bounds);
              const matrix = computeAffineFromRect(elementBounds as Bounds, targetCorners);
              const transformed = elementContributionRegistry.applyAffineTransform(element, matrix, 3);
              if (transformed) {
                state.updateElement(id, { data: transformed.data });
              }
            }
          }
        });
      }

      if (allowAnimationUpdate && animationTargets && elementsBefore) {
        const elementsAfter = (get() as FullStore).elements;
        const deltaEntries = computeTransformDeltas(animationTargets, elementsBefore, elementsAfter);
        if (deltaEntries.length && animationUpdater) {
          animationUpdater(deltaEntries);
        }
      }
    },

    // Apply advanced skew transformation
    applyAdvancedSkewTransform: (axis: 'x' | 'y', angle: number, shouldUpdateAnimations = true) => {
      const state = get() as FullStore;
      const isSubpathMode = state.isWorkingWithSubpaths?.() ?? false;
      const bounds = state.getTransformationBounds?.();

      if (!bounds) return;

      const animationUpdater = state.applyAnimationTransformDelta;
      const allowAnimationUpdate = shouldUpdateAnimations && !!animationUpdater && !isSubpathMode;
      const animationTargets = allowAnimationUpdate ? collectTransformTargetIds(state, state.selectedIds) : null;
      const elementsBefore = allowAnimationUpdate ? state.elements : null;

      const originX = (bounds.minX + bounds.maxX) / 2;
      const originY = (bounds.minY + bounds.maxY) / 2;

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply transformation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];

            newSubPaths[subpathIndex] = axis === 'x'
              ? applySkewXTransform(newSubPaths[subpathIndex], angle, originY)
              : applySkewYTransform(newSubPaths[subpathIndex], angle, originX);

            state.updateElement(elementId, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          }
        });
      } else {
        // Apply transformation to selected elements (paths and groups)
        const elementMap = buildElementMap(state.elements);

        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (!element) return;

          if (element.type === 'group') {
            // For groups, transform all descendants
            const group = element as GroupElement;
            const visited = new Set<string>();

            const transformDescendantsSkew = (grp: GroupElement) => {
              if (visited.has(grp.id)) return;
              visited.add(grp.id);

              grp.data.childIds.forEach((childId) => {
                const child = elementMap.get(childId);
                if (!child) return;

                if (child.type === 'group') {
                  transformDescendantsSkew(child as GroupElement);
                } else if (child.type === 'path') {
                  const pathData = child.data as PathData;
                  const newSubPaths = pathData.subPaths.map((subPath) =>
                    axis === 'x'
                      ? applySkewXTransform(subPath, angle, originY)
                      : applySkewYTransform(subPath, angle, originX)
                  );

                  state.updateElement(child.id, {
                    data: {
                      ...pathData,
                      subPaths: newSubPaths
                    }
                  });
                } else {
                  const childBounds = elementContributionRegistry.getBounds(child, {
                    viewport: state.viewport,
                    elementMap,
                  });
                  if (childBounds) {
                    const skewedCorners =
                      axis === 'x'
                        ? {
                            tl: { x: childBounds.minX + Math.tan((angle * Math.PI) / 180) * (childBounds.minY - originY), y: childBounds.minY },
                            tr: { x: childBounds.maxX + Math.tan((angle * Math.PI) / 180) * (childBounds.minY - originY), y: childBounds.minY },
                            bl: { x: childBounds.minX + Math.tan((angle * Math.PI) / 180) * (childBounds.maxY - originY), y: childBounds.maxY },
                          }
                        : {
                            tl: { x: childBounds.minX, y: childBounds.minY + Math.tan((angle * Math.PI) / 180) * (childBounds.minX - originX) },
                            tr: { x: childBounds.maxX, y: childBounds.minY + Math.tan((angle * Math.PI) / 180) * (childBounds.maxX - originX) },
                            bl: { x: childBounds.minX, y: childBounds.maxY + Math.tan((angle * Math.PI) / 180) * (childBounds.minX - originX) },
                          };
                    const matrix = computeAffineFromRect(childBounds as Bounds, skewedCorners);
                    const transformed = elementContributionRegistry.applyAffineTransform(child, matrix, 3);
                    if (transformed) {
                      state.updateElement(child.id, { data: transformed.data });
                    }
                  }
                }
              });
            };

            transformDescendantsSkew(group);
          } else if (element.type === 'path') {
            // Transform path element
            const pathData = element.data as import('../../types').PathData;

            const newSubPaths = pathData.subPaths.map((subPath) =>
              axis === 'x'
                ? applySkewXTransform(subPath, angle, originY)
                : applySkewYTransform(subPath, angle, originX)
            );

            state.updateElement(id, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          } else {
            const elementBounds = elementContributionRegistry.getBounds(element, {
              viewport: state.viewport,
              elementMap,
            });
            if (elementBounds) {
              const skewedCorners =
                axis === 'x'
                  ? {
                      tl: { x: elementBounds.minX + Math.tan((angle * Math.PI) / 180) * (elementBounds.minY - originY), y: elementBounds.minY },
                      tr: { x: elementBounds.maxX + Math.tan((angle * Math.PI) / 180) * (elementBounds.minY - originY), y: elementBounds.minY },
                      bl: { x: elementBounds.minX + Math.tan((angle * Math.PI) / 180) * (elementBounds.maxY - originY), y: elementBounds.maxY },
                    }
                  : {
                      tl: { x: elementBounds.minX, y: elementBounds.minY + Math.tan((angle * Math.PI) / 180) * (elementBounds.minX - originX) },
                      tr: { x: elementBounds.maxX, y: elementBounds.minY + Math.tan((angle * Math.PI) / 180) * (elementBounds.maxX - originX) },
                      bl: { x: elementBounds.minX, y: elementBounds.maxY + Math.tan((angle * Math.PI) / 180) * (elementBounds.minX - originX) },
                    };

              const matrix = computeAffineFromRect(elementBounds as Bounds, skewedCorners);
              const transformed = elementContributionRegistry.applyAffineTransform(element, matrix, 3);
              if (transformed) {
                state.updateElement(id, { data: transformed.data });
              }
            }
          }
        });
      }

      if (allowAnimationUpdate && animationTargets && elementsBefore) {
        const elementsAfter = (get() as FullStore).elements;
        const deltaEntries = computeTransformDeltas(animationTargets, elementsBefore, elementsAfter);
        if (deltaEntries.length && animationUpdater) {
          animationUpdater(deltaEntries);
        }
      }
    }
  };
};

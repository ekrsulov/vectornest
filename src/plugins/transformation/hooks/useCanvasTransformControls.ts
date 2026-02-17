import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../../store/canvasStore';
import { createListenerContext, installGlobalPluginListeners } from '../../../utils/pluginListeners';
import type { CanvasStore } from '../../../store/canvasStore';
import { TransformController, type TransformState, type TransformFeedback } from '../TransformController';
import { computeTransformDeltas } from '../../../utils/animationTransformDelta';
import { measurePath, measureSubpathBounds } from '../../../utils/measurementUtils';
import { getGroupBounds } from '../../../canvas/geometry/CanvasGeometryService';
import { calculateScaledStrokeWidth, transformCommands } from '../../../utils/sharedTransformUtils';
import { buildElementMap } from '../../../utils';
import { elementContributionRegistry } from '../../../utils/elementContributionRegistry';
import { getAllElementsShareSameParentGroup } from '../../basePluginDefinitions';
import { getParentCumulativeTransformMatrix } from '../../../utils/elementTransformUtils';
import { applyToPoint, inverseMatrix } from '../../../utils/matrixUtils';
import type { Point, PathData, CanvasElement, GroupElement } from '../../../types';
import type { TransformationPluginSlice } from '../slice';
import type { GuidelinesPluginSlice } from '../../guidelines/slice';

type TransformationStore = CanvasStore & TransformationPluginSlice;
type GuidelinesStore = CanvasStore & GuidelinesPluginSlice;

export const useCanvasTransformControls = () => {
  const [transformState, setTransformState] = useState<TransformState>({
    isTransforming: false,
    transformStart: null,
    transformElementId: null,
    transformHandler: null,
    originalBounds: null,
    transformedBounds: null,
    initialTransform: null,
    originalElementData: {} as NonNullable<CanvasElement['data']>,
    rotationCenter: null,
    animationTargetIds: null,
    elementsBeforeTransform: null,
  });

  // Use ref to avoid recreating callbacks when transformState changes
  const transformStateRef = useRef(transformState);
  useEffect(() => {
    transformStateRef.current = transformState;
  }, [transformState]);

  const [feedback, setFeedback] = useState<TransformFeedback>({
    rotation: { degrees: 0, visible: false, isShiftPressed: false, isMultipleOf15: false },
    resize: { deltaX: 0, deltaY: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
    shape: { width: 0, height: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
    pointPosition: { x: 0, y: 0, visible: false }
  });

  // Sync local state to store so Canvas.tsx can read it
  const setTransformStateInStore = useCanvasStore(state =>
    (state as unknown as TransformationStore).setTransformState
  );
  const setTransformFeedbackInStore = useCanvasStore(state =>
    (state as unknown as TransformationStore).setTransformFeedback
  );
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const elements = useCanvasStore(state => state.elements);
  const updateTransformationState = useCanvasStore(state =>
    (state as unknown as TransformationStore).updateTransformationState
  );
  const rotationPivotTarget = useCanvasStore(state =>
    (state as unknown as TransformationStore).transformation?.rotationPivotTarget
  );

  useEffect(() => {
    setTransformStateInStore?.(transformState);
  }, [transformState, setTransformStateInStore]);

  useEffect(() => {
    setTransformFeedbackInStore?.(feedback);
  }, [feedback, setTransformFeedbackInStore]);

  useEffect(() => {
    if (!updateTransformationState) return;

    const hasSubpathSelection = (selectedSubpaths?.length ?? 0) > 0;
    const elementMap = buildElementMap(elements);
    let target: string | null = null;

    if (!hasSubpathSelection) {
      if (selectedIds.length === 1) {
        const selectedElement = elementMap.get(selectedIds[0]);
        if (selectedElement?.type === 'group') {
          target = `group:${selectedElement.id}`;
        } else {
          target = `element:${selectedIds[0]}`;
        }
      } else if (selectedIds.length > 1) {
        const sharedParentGroupId = getAllElementsShareSameParentGroup(selectedIds, elementMap);
        target = sharedParentGroupId ? `group:${sharedParentGroupId}` : 'selection-bbox';
      }
    }

    if (target !== rotationPivotTarget) {
      updateTransformationState({
        rotationPivot: null,
        rotationPivotTarget: target,
      });
    }
  }, [
    selectedIds,
    selectedSubpaths,
    elements,
    updateTransformationState,
    rotationPivotTarget,
  ]);

  const transformController = useMemo(() => new TransformController(), []);

  const previousFeedbackRef = useRef<TransformFeedback | null>(null);

  const getRotationCenter = useCallback((
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    targetId: string | null
  ) => {
    const transformationState = (useCanvasStore.getState() as unknown as TransformationStore).transformation;
    const pivot = transformationState && transformationState.rotationPivotTarget === targetId
      ? transformationState.rotationPivot
      : null;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    return pivot ?? { x: centerX, y: centerY };
  }, []);

  // Helper function to calculate transform origin based on handler and bounds
  const calculateTransformOrigin = useCallback((
    handler: string,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    rotationCenter?: Point | null
  ): { originX: number; originY: number } => {
    let originX = bounds.minX;
    let originY = bounds.minY;

    // For corner handles, origin is the opposite corner
    if (handler === 'corner-tl') {
      originX = bounds.maxX;
      originY = bounds.maxY;
    } else if (handler === 'corner-tr') {
      originX = bounds.minX;
      originY = bounds.maxY;
    } else if (handler === 'corner-bl') {
      originX = bounds.maxX;
      originY = bounds.minY;
    } else if (handler === 'corner-br') {
      originX = bounds.minX;
      originY = bounds.minY;
    } else if (handler === 'midpoint-t') {
      originX = (bounds.minX + bounds.maxX) / 2;
      originY = bounds.maxY;
    } else if (handler === 'midpoint-b') {
      originX = (bounds.minX + bounds.maxX) / 2;
      originY = bounds.minY;
    } else if (handler === 'midpoint-l') {
      originX = bounds.maxX;
      originY = (bounds.minY + bounds.maxY) / 2;
    } else if (handler === 'midpoint-r') {
      originX = bounds.minX;
      originY = (bounds.minY + bounds.maxY) / 2;
    } else {
      // For rotation or other handlers, use center
      const defaultCenterX = (bounds.minX + bounds.maxX) / 2;
      const defaultCenterY = (bounds.minY + bounds.maxY) / 2;
      if (handler.startsWith('rotate-') && rotationCenter) {
        originX = rotationCenter.x;
        originY = rotationCenter.y;
      } else {
        originX = defaultCenterX;
        originY = defaultCenterY;
      }
    }

    return { originX, originY };
  }, []);

  const toLocalOrigin = useCallback((
    element: CanvasElement,
    originX: number,
    originY: number,
    elementsForMatrix: CanvasElement[]
  ): { originX: number; originY: number } => {
    const parentMatrix = getParentCumulativeTransformMatrix(element, elementsForMatrix);
    const invParent = inverseMatrix(parentMatrix);
    if (!invParent) {
      return { originX, originY };
    }
    const local = applyToPoint(invParent, { x: originX, y: originY });
    return { originX: local.x, originY: local.y };
  }, []);

  const collectAnimationTargetIds = useCallback((state: CanvasStore): Set<string> => {
    const ids = new Set<string>();
    state.selectedIds.forEach((id) => {
      ids.add(id);
      const descendants = state.getGroupDescendants ? state.getGroupDescendants(id) : [];
      descendants.forEach((childId) => ids.add(childId));
    });
    return ids;
  }, []);

  const captureAnimationSyncState = useCallback((): {
    animationTargetIds: Set<string> | null;
    elementsBeforeTransform: CanvasElement[] | null;
  } => {
    const state = useCanvasStore.getState() as TransformationStore & {
      applyAnimationTransformDelta?: (entries: ReturnType<typeof computeTransformDeltas>) => void;
      isWorkingWithSubpaths?: () => boolean;
      getGroupDescendants?: (groupId: string) => string[];
    };

    const hasAnimationUpdater = typeof state.applyAnimationTransformDelta === 'function';
    const isSubpathMode = state.isWorkingWithSubpaths?.() ?? false;

    if (!hasAnimationUpdater || isSubpathMode) {
      return { animationTargetIds: null, elementsBeforeTransform: null };
    }

    return {
      animationTargetIds: collectAnimationTargetIds(state),
      elementsBeforeTransform: JSON.parse(JSON.stringify(state.elements)),
    };
  }, [collectAnimationTargetIds]);

  const startTransformation = useCallback((elementId: string, handler: string, point: Point) => {
    const { elements, selectedIds, viewport } = useCanvasStore.getState();
    const elementMap = buildElementMap(elements);
    const isRotateHandler = handler.startsWith('rotate-');

    // Handle different types of transformations

    // Case 1: Subpath transformation
    if (elementId.startsWith('subpath:')) {
      const parts = elementId.split(':');
      const realElementId = parts[1];
      const subpathIndex = parseInt(parts[2]);

      const element = elements.find(el => el.id === realElementId);
      if (!element) return;

      const subpathBounds = measureSubpathBounds(
        (element.data as PathData).subPaths[subpathIndex],
        (element.data as PathData).strokeWidth ?? 1,
        1 // zoom
      );

      if (subpathBounds) {
        const newState = transformController.initializeTransform(element, elementId, handler, point, subpathBounds);
        setTransformState((prev: TransformState) => ({ ...prev, ...newState }));
      }
      return;
    }

    const { animationTargetIds, elementsBeforeTransform } = captureAnimationSyncState();

    // Case 2: Group transformation
    if (elementId.startsWith('group:')) {
      const realGroupId = elementId.substring(6); // Remove 'group:' prefix
      const element = elementMap.get(realGroupId);

      if (!element || element.type !== 'group') {
        return;
      }

      const bounds = getGroupBounds(element as GroupElement, elementMap, viewport);
      if (bounds) {
        // Create a pseudo-element for transformation tracking with a rectangular path based on bounds
        const rectPath: import('../../../types').Command[] = [
          { type: 'M', position: { x: bounds.minX, y: bounds.minY } },
          { type: 'L', position: { x: bounds.maxX, y: bounds.minY } },
          { type: 'L', position: { x: bounds.maxX, y: bounds.maxY } },
          { type: 'L', position: { x: bounds.minX, y: bounds.maxY } },
          { type: 'Z' }
        ];

        const pseudoElement: CanvasElement = {
          id: elementId,
          type: 'path',
          parentId: null,
          data: {
            subPaths: [rectPath],
            strokeWidth: 0,
            strokeColor: '#000000',
            strokeOpacity: 1,
            fillColor: 'none',
            fillOpacity: 1,
            transform: {
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              translateX: 0,
              translateY: 0
            }
          } as PathData,
          zIndex: 0
        };

        // Store original state of all descendant elements
        const originalElementsData = new Map<string, CanvasElement>();
        originalElementsData.set(realGroupId, JSON.parse(JSON.stringify(element as CanvasElement)));
        const collectDescendants = (groupEl: GroupElement) => {
          const childIds = (groupEl.data as { childIds: string[] }).childIds;
          childIds.forEach((childId) => {
            const child = elementMap.get(childId);
            if (child) {
              originalElementsData.set(childId, JSON.parse(JSON.stringify(child)));
              if (child.type === 'group') {
                collectDescendants(child as GroupElement);
              }
            }
          });
        };
        collectDescendants(element as GroupElement);

        const rotationCenter = isRotateHandler ? getRotationCenter(bounds, elementId) : null;
        const newState = transformController.initializeTransform(
          pseudoElement,
          elementId,
          handler,
          point,
          bounds,
          rotationCenter
        );
        setTransformState((prev: TransformState) => ({
          ...prev,
          ...newState,
          originalElementsData,
          animationTargetIds,
          elementsBeforeTransform
        }));
      }
      return;
    }

    // Case 3: Multi-selection bbox transformation
    if (elementId === 'selection-bbox') {
      // Store all selected element IDs in the transform state
      // We'll handle this specially during transformation
      // For now, calculate combined bounds
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      selectedIds.forEach((id) => {
        const element = elementMap.get(id);
        if (!element) return;

        let bounds = null;
        if (element.type === 'group') {
          bounds = getGroupBounds(element as GroupElement, elementMap, viewport);
        } else if (element.type === 'path') {
          const pathData = element.data as PathData;
          bounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
        } else {
          bounds = elementContributionRegistry.getBounds(element, { viewport, elementMap });
        }

        if (bounds && isFinite(bounds.minX)) {
          minX = Math.min(minX, bounds.minX);
          minY = Math.min(minY, bounds.minY);
          maxX = Math.max(maxX, bounds.maxX);
          maxY = Math.max(maxY, bounds.maxY);
        }
      });

      if (isFinite(minX)) {
        // Create a pseudo-element for transformation tracking with a rectangular path based on bounds
        const rectPath: import('../../../types').Command[] = [
          { type: 'M', position: { x: minX, y: minY } },
          { type: 'L', position: { x: maxX, y: minY } },
          { type: 'L', position: { x: maxX, y: maxY } },
          { type: 'L', position: { x: minX, y: maxY } },
          { type: 'Z' }
        ];

        const pseudoElement: CanvasElement = {
          id: 'selection-bbox',
          type: 'path',
          parentId: null,
          data: {
            subPaths: [rectPath],
            strokeWidth: 0,
            strokeColor: '#000000',
            strokeOpacity: 1,
            fillColor: 'none',
            fillOpacity: 1,
            transform: {
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              translateX: 0,
              translateY: 0
            }
          } as PathData,
          zIndex: 0
        };

        // Store original state of all selected elements (and descendants of any selected groups)
        const originalElementsData = new Map<string, CanvasElement>();
        const visited = new Set<string>();

        const collectElementWithDescendants = (id: string) => {
          if (visited.has(id)) return;
          visited.add(id);
          const el = elementMap.get(id);
          if (!el) return;
          originalElementsData.set(id, JSON.parse(JSON.stringify(el)));

          if (el.type === 'group') {
            const childIds = (el.data as { childIds: string[] }).childIds ?? [];
            childIds.forEach(collectElementWithDescendants);
          }
        };

        selectedIds.forEach((id) => collectElementWithDescendants(id));

        const rotationCenter = isRotateHandler ? getRotationCenter({ minX, minY, maxX, maxY }, 'selection-bbox') : null;
        const newState = transformController.initializeTransform(
          pseudoElement,
          elementId,
          handler,
          point,
          { minX, minY, maxX, maxY },
          rotationCenter
        );
        setTransformState((prev: TransformState) => ({
          ...prev,
          ...newState,
          originalElementsData,
          animationTargetIds,
          elementsBeforeTransform
        }));
      }
      return;
    }

    // Case 3: Single element (group or path)
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    let bounds;
    if (element.type === 'group') {
      bounds = getGroupBounds(element as GroupElement, elementMap, viewport);
    } else if (element.type === 'path') {
      bounds = measurePath((element.data as PathData).subPaths, (element.data as PathData).strokeWidth ?? 1, 1);
    } else {
      bounds = elementContributionRegistry.getBounds(element, {
        viewport,
        elementMap,
      });
    }

    if (bounds) {
      const rotationCenter = isRotateHandler ? getRotationCenter(bounds, `element:${elementId}`) : null;
      const newState = transformController.initializeTransform(
        element,
        elementId,
        handler,
        point,
        bounds,
        rotationCenter
      );
      setTransformState((prev: TransformState) => ({
        ...prev,
        ...newState,
        animationTargetIds,
        elementsBeforeTransform
      }));
    }
  }, [transformController, getRotationCenter, captureAnimationSyncState]);

  // Helper function to scale group descendants
  const scaleGroupDescendants = useCallback((
    groupId: string,
    scaleX: number,
    scaleY: number,
    originX: number,
    originY: number,
    _rotation: number
  ) => {
    const { elements, updateElement } = useCanvasStore.getState();
    const elementMap = buildElementMap(elements);
    const group = elementMap.get(groupId);

    if (!group || group.type !== 'group') return;

    // Get original elements data from transform state
    const originalElementsData = transformStateRef.current.originalElementsData;
    const hasLocalTransform = (el: CanvasElement): boolean => {
      const data = el.data as { transformMatrix?: unknown; transform?: unknown };
      return Boolean(data?.transformMatrix || data?.transform);
    };

    // Collect all descendant IDs
    const descendants = new Set<string>();
    const queue = [...(group.data as { childIds: string[] }).childIds];

    while (queue.length > 0) {
      const childId = queue.shift();
      if (!childId) continue;

      descendants.add(childId);
      const child = elementMap.get(childId);
      if (child && child.type === 'group' && !hasLocalTransform(child)) {
        queue.push(...(child.data as { childIds: string[] }).childIds);
      }
    }

    // Scale all descendants
    descendants.forEach((descendantId) => {
      const element = elementMap.get(descendantId);
      if (!element) return;

      const localOrigin = toLocalOrigin(element, originX, originY, elements);

      if (element.type === 'group' && hasLocalTransform(element)) {
        const originalElement = originalElementsData?.get(descendantId) ?? element;
        const baseElement: CanvasElement = { ...element, data: originalElement.data };
        const scaled = elementContributionRegistry.scaleElement(
          baseElement,
          scaleX,
          scaleY,
          localOrigin.originX,
          localOrigin.originY,
          3
        ) ?? baseElement;
        const rotated = elementContributionRegistry.rotateElement(
          scaled,
          _rotation,
          localOrigin.originX,
          localOrigin.originY,
          3
        ) ?? scaled;
        updateElement(descendantId, { ...element, data: rotated.data });
        return;
      }

      if (element.type === 'path') {
        // Use original path data if available, otherwise use current
        const originalElement = originalElementsData?.get(descendantId);
        const originalPathData = (originalElement?.data as PathData) || (element.data as PathData);

        // Apply both scale and rotation using local origin
        const transformedSubPaths = originalPathData.subPaths.map((subPath) =>
          transformCommands(subPath, {
            scaleX,
            scaleY,
            originX: localOrigin.originX,
            originY: localOrigin.originY,
            rotation: _rotation,
            rotationCenterX: localOrigin.originX,
            rotationCenterY: localOrigin.originY
          })
        );

        const transformedData: PathData = {
          ...originalPathData,
          subPaths: transformedSubPaths,
          strokeWidth: calculateScaledStrokeWidth(originalPathData.strokeWidth, scaleX, scaleY),
          transform: undefined,
          transformMatrix: undefined,
        };

        updateElement(descendantId, { ...element, data: transformedData });
      } else {
        const originalElement = originalElementsData?.get(descendantId) ?? element;
        const baseElement: CanvasElement = { ...element, data: originalElement.data };
        const scaled = elementContributionRegistry.scaleElement(
          baseElement,
          scaleX,
          scaleY,
          localOrigin.originX,
          localOrigin.originY,
          3
        ) ?? baseElement;
        const rotated = elementContributionRegistry.rotateElement(
          scaled,
          _rotation,
          localOrigin.originX,
          localOrigin.originY,
          3
        ) ?? scaled;
        updateElement(descendantId, { ...element, data: rotated.data });
      }
    });
  }, [toLocalOrigin]);

  // Helper function to update guidelines during transformation
  const updateGuidelinesDuringTransform = useCallback((
    elementId: string,
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ) => {
    const guidelinesSlice = useCanvasStore.getState() as unknown as GuidelinesStore;
    if (!guidelinesSlice.guidelines?.enabled) return;

    const projectedBounds = {
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
    };

    // Find and update alignment guidelines
    const alignmentMatches = guidelinesSlice.findAlignmentGuidelines?.(elementId, projectedBounds) ?? [];

    // Find size matches if enabled
    const sizeMatches = guidelinesSlice.guidelines?.sizeMatchingEnabled && guidelinesSlice.findSizeMatches
      ? guidelinesSlice.findSizeMatches(elementId, projectedBounds)
      : [];

    // Update the guidelines state
    if (guidelinesSlice.updateGuidelinesState) {
      guidelinesSlice.updateGuidelinesState({
        currentMatches: alignmentMatches,
        currentSizeMatches: sizeMatches,
      });
    }
  }, []);

  const updateTransformation = useCallback((point: Point, isShiftPressed: boolean) => {
    performance.mark('updateTransformation-start');
    const currentState = transformStateRef.current;
    if (!currentState.isTransforming || !currentState.transformElementId) {
      performance.mark('updateTransformation-end');
      performance.measure('updateTransformation', 'updateTransformation-start', 'updateTransformation-end');
      return;
    }

    const { elements, updateElement, selectedIds } = useCanvasStore.getState();
    const elementMap = buildElementMap(elements);
    const hasLocalTransform = (el: CanvasElement): boolean => {
      const data = el.data as { transformMatrix?: unknown; transform?: unknown };
      return Boolean(data?.transformMatrix || data?.transform);
    };

    const applyTransformToTargets = (
      targetIds: string[],
      scaleX: number,
      scaleY: number,
      rotation: number,
      originX: number,
      originY: number
    ) => {
      targetIds.forEach((id) => {
        const element = elementMap.get(id);
        if (!element) {
          return;
        }

        const originalElement = currentState.originalElementsData?.get(id);
        const localOrigin = toLocalOrigin(element, originX, originY, elements);

        if (element.type === 'group') {
          if (hasLocalTransform(element)) {
            const baseElement: CanvasElement = { ...element, data: originalElement?.data ?? element.data };
            const scaled = elementContributionRegistry.scaleElement(
              baseElement,
              scaleX,
              scaleY,
              localOrigin.originX,
              localOrigin.originY,
              3
            ) ?? baseElement;
            const rotated = elementContributionRegistry.rotateElement(
              scaled,
              rotation,
              localOrigin.originX,
              localOrigin.originY,
              3
            ) ?? scaled;
            updateElement(id, { ...element, data: rotated.data });
            return;
          }
          scaleGroupDescendants(id, scaleX, scaleY, originX, originY, rotation);
          return;
        }

        if (element.type === 'path') {
          if (hasLocalTransform(element)) {
            const baseElement: CanvasElement = { ...element, data: originalElement?.data ?? element.data };
            const scaled = elementContributionRegistry.scaleElement(
              baseElement,
              scaleX,
              scaleY,
              localOrigin.originX,
              localOrigin.originY,
              3
            ) ?? baseElement;
            const rotated = elementContributionRegistry.rotateElement(
              scaled,
              rotation,
              localOrigin.originX,
              localOrigin.originY,
              3
            ) ?? scaled;
            updateElement(id, { ...element, data: rotated.data });
            return;
          }

          const originalPathData = (originalElement?.data as PathData) || (element.data as PathData);

          const transformedSubPaths = originalPathData.subPaths.map((subPath) =>
            transformCommands(subPath, {
              scaleX,
              scaleY,
              originX: localOrigin.originX,
              originY: localOrigin.originY,
              rotation,
              rotationCenterX: localOrigin.originX,
              rotationCenterY: localOrigin.originY
            })
          );

          const transformedData: PathData = {
            ...originalPathData,
            subPaths: transformedSubPaths,
            strokeWidth: calculateScaledStrokeWidth(originalPathData.strokeWidth, scaleX, scaleY),
            transform: undefined,
            transformMatrix: undefined,
          };

          updateElement(id, { data: transformedData });
          return;
        }

        const baseElement: CanvasElement = { ...element, data: originalElement?.data ?? element.data };
        const scaled = elementContributionRegistry.scaleElement(
          baseElement,
          scaleX,
          scaleY,
          localOrigin.originX,
          localOrigin.originY,
          3
        ) ?? baseElement;
        const rotated = elementContributionRegistry.rotateElement(
          scaled,
          rotation,
          localOrigin.originX,
          localOrigin.originY,
          3
        ) ?? scaled;
        updateElement(id, { ...element, data: rotated.data });
      });
    };

    // Handle multi-selection bbox transformation
    if (currentState.transformElementId === 'selection-bbox') {
      // Calculate transformation parameters
      const result = transformController.calculateTransformUpdate(point, currentState, elements, isShiftPressed);

      // Check if feedback changed
      const feedbackChanged = !previousFeedbackRef.current ||
        result.feedback.rotation.degrees !== previousFeedbackRef.current.rotation.degrees ||
        result.feedback.rotation.visible !== previousFeedbackRef.current.rotation.visible ||
        result.feedback.resize.deltaX !== previousFeedbackRef.current.resize.deltaX ||
        result.feedback.resize.deltaY !== previousFeedbackRef.current.resize.deltaY ||
        result.feedback.resize.visible !== previousFeedbackRef.current.resize.visible ||
        result.feedback.shape.width !== previousFeedbackRef.current.shape.width ||
        result.feedback.shape.height !== previousFeedbackRef.current.shape.height ||
        result.feedback.shape.visible !== previousFeedbackRef.current.shape.visible ||
        result.feedback.pointPosition.x !== previousFeedbackRef.current.pointPosition.x ||
        result.feedback.pointPosition.y !== previousFeedbackRef.current.pointPosition.y ||
        result.feedback.pointPosition.visible !== previousFeedbackRef.current.pointPosition.visible;

      if (feedbackChanged) {
        setFeedback(result.feedback);
        previousFeedbackRef.current = result.feedback;
      }

      if (!result.updatedElement || !currentState.originalBounds) {
        performance.mark('updateTransformation-end');
        performance.measure('updateTransformation', 'updateTransformation-start', 'updateTransformation-end');
        return;
      }

      // Get transform from the result element's data
      const transformData = (result.updatedElement.data as PathData).transform;
      if (!transformData) {
        performance.mark('updateTransformation-end');
        performance.measure('updateTransformation', 'updateTransformation-start', 'updateTransformation-end');
        return;
      }

      const scaleX = transformData.scaleX;
      const scaleY = transformData.scaleY;
      const rotation = transformData.rotation;

      // Calculate the transform origin based on the handler being used
      const rotationCenter = getRotationCenter(currentState.originalBounds, 'selection-bbox');
      const { originX, originY } = calculateTransformOrigin(
        currentState.transformHandler || '',
        currentState.originalBounds,
        rotationCenter
      );

      // Apply transformation to all selected elements
      applyTransformToTargets(selectedIds, scaleX, scaleY, rotation, originX, originY);

      // Update guidelines with transformed selection bounds
      if (currentState.originalBounds) {
        const ob = currentState.originalBounds as { minX: number; minY: number; maxX: number; maxY: number };
        const transformedBounds = {
          minX: ob.minX * scaleX + originX * (1 - scaleX),
          minY: ob.minY * scaleY + originY * (1 - scaleY),
          maxX: ob.maxX * scaleX + originX * (1 - scaleX),
          maxY: ob.maxY * scaleY + originY * (1 - scaleY),
        };
        // Update guidelines with transformed selection bounds (rotation info removed)
        updateGuidelinesDuringTransform('selection-bbox', transformedBounds);
        performance.mark('updateTransformation-end');
        performance.measure('updateTransformation', 'updateTransformation-start', 'updateTransformation-end');
        return;
      }
    }

    if (currentState.transformElementId.startsWith('group:')) {
      const realGroupId = currentState.transformElementId.substring(6);
      const element = elements.find(el => el.id === realGroupId);

      if (element && element.type === 'group') {
        const result = transformController.calculateTransformUpdate(point, currentState, elements, isShiftPressed);

        // Check if feedback changed
        const feedbackChanged = !previousFeedbackRef.current ||
          result.feedback.rotation.degrees !== previousFeedbackRef.current.rotation.degrees ||
          result.feedback.rotation.visible !== previousFeedbackRef.current.rotation.visible ||
          result.feedback.resize.deltaX !== previousFeedbackRef.current.resize.deltaX ||
          result.feedback.resize.deltaY !== previousFeedbackRef.current.resize.deltaY ||
          result.feedback.resize.visible !== previousFeedbackRef.current.resize.visible ||
          result.feedback.shape.width !== previousFeedbackRef.current.shape.width ||
          result.feedback.shape.height !== previousFeedbackRef.current.shape.height ||
          result.feedback.shape.visible !== previousFeedbackRef.current.shape.visible ||
          result.feedback.pointPosition.x !== previousFeedbackRef.current.pointPosition.x ||
          result.feedback.pointPosition.y !== previousFeedbackRef.current.pointPosition.y ||
          result.feedback.pointPosition.visible !== previousFeedbackRef.current.pointPosition.visible;

        if (feedbackChanged) {
          setFeedback(result.feedback);
          previousFeedbackRef.current = result.feedback;
        }

        if (!result.updatedElement || !currentState.originalBounds) {
          return;
        }

        const transformData = (result.updatedElement.data as PathData).transform;
        if (!transformData) {
          return;
        }

        const scaleX = transformData.scaleX;
        const scaleY = transformData.scaleY;
        const rotation = transformData.rotation;

        // Calculate the transform origin based on the handler being used
        const rotationCenter = getRotationCenter(currentState.originalBounds, currentState.transformElementId);
        const { originX, originY } = calculateTransformOrigin(
          currentState.transformHandler || '',
          currentState.originalBounds,
          rotationCenter
        );

        // Scale all descendants of the group using their original state
        applyTransformToTargets([realGroupId], scaleX, scaleY, rotation, originX, originY);

        // Update guidelines with transformed group bounds
        if (currentState.originalBounds) {
          const ob = currentState.originalBounds as { minX: number; minY: number; maxX: number; maxY: number };
          const transformedBounds = {
            minX: ob.minX * scaleX + originX * (1 - scaleX),
            minY: ob.minY * scaleY + originY * (1 - scaleY),
            maxX: ob.maxX * scaleX + originX * (1 - scaleX),
            maxY: ob.maxY * scaleY + originY * (1 - scaleY),
          };
          updateGuidelinesDuringTransform(realGroupId, transformedBounds);
        }
        return;
      }
    }

    // Handle regular path transformation (existing behavior)
    const result = transformController.calculateTransformUpdate(point, currentState, elements, isShiftPressed);

    if (result.updatedElement) {
      // Paths materialize transforms into their geometry, so strip any transform props
      // before persisting to avoid double-applying transforms in overlays/selection feedback.
      const updatedElement = result.updatedElement.type === 'path'
        ? {
            ...result.updatedElement,
            data: {
              ...(result.updatedElement.data as PathData),
              transform: undefined,
              transformMatrix: undefined,
            },
          }
        : result.updatedElement;

      updateElement(updatedElement.id, updatedElement);

      // Update guidelines during resize (for visual feedback)
      if (updatedElement.type === 'path') {
        const pathData = updatedElement.data as PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
        if (bounds) {
          updateGuidelinesDuringTransform(updatedElement.id, bounds);
        }
      }
    }

    // Check if feedback changed
    const feedbackChanged = !previousFeedbackRef.current ||
      result.feedback.rotation.degrees !== previousFeedbackRef.current.rotation.degrees ||
      result.feedback.rotation.visible !== previousFeedbackRef.current.rotation.visible ||
      result.feedback.resize.deltaX !== previousFeedbackRef.current.resize.deltaX ||
      result.feedback.resize.deltaY !== previousFeedbackRef.current.resize.deltaY ||
      result.feedback.resize.visible !== previousFeedbackRef.current.resize.visible ||
      result.feedback.shape.width !== previousFeedbackRef.current.shape.width ||
      result.feedback.shape.height !== previousFeedbackRef.current.shape.height ||
      result.feedback.shape.visible !== previousFeedbackRef.current.shape.visible ||
      result.feedback.pointPosition.x !== previousFeedbackRef.current.pointPosition.x ||
      result.feedback.pointPosition.y !== previousFeedbackRef.current.pointPosition.y ||
      result.feedback.pointPosition.visible !== previousFeedbackRef.current.pointPosition.visible;

    if (feedbackChanged) {
      setFeedback(result.feedback);
      previousFeedbackRef.current = result.feedback;
    }
    performance.mark('updateTransformation-end');
    performance.measure('updateTransformation', 'updateTransformation-start', 'updateTransformation-end');
  }, [
    transformController,
    calculateTransformOrigin,
    scaleGroupDescendants,
    updateGuidelinesDuringTransform,
    getRotationCenter,
    toLocalOrigin,
  ]);

  const endTransformation = useCallback(() => {
    const currentState = transformStateRef.current;
    const animationUpdater = (useCanvasStore.getState() as TransformationStore & {
      applyAnimationTransformDelta?: (entries: ReturnType<typeof computeTransformDeltas>) => void;
    }).applyAnimationTransformDelta;

    if (
      animationUpdater &&
      currentState.animationTargetIds &&
      currentState.elementsBeforeTransform
    ) {
      const elementsAfter = (useCanvasStore.getState() as TransformationStore).elements;
      const deltaEntries = computeTransformDeltas(
        currentState.animationTargetIds,
        currentState.elementsBeforeTransform,
        elementsAfter
      );

      if (deltaEntries.length > 0) {
        animationUpdater(deltaEntries);
      }
    }

    const resetState = transformController.resetTransform();
    setTransformState((prev: TransformState) => ({
      ...prev,
      ...resetState,
      animationTargetIds: null,
      elementsBeforeTransform: null
    }));

    // Reset feedback
    setFeedback({
      rotation: { degrees: 0, visible: false, isShiftPressed: false, isMultipleOf15: false },
      resize: { deltaX: 0, deltaY: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      shape: { width: 0, height: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      pointPosition: { x: 0, y: 0, visible: false }
    });

    // Clear guidelines when transformation ends
    const guidelinesSlice = useCanvasStore.getState() as unknown as GuidelinesStore;
    if (guidelinesSlice.clearGuidelines) {
      guidelinesSlice.clearGuidelines();
    }
  }, [transformController]);

  // Add global pointerup listener to ensure transformation ends even if pointer is released outside handlers
  useEffect(() => {
    if (!transformState.isTransforming) return;

    const handleGlobalPointerUp = () => {
      endTransformation();
    };

    // Use centralized helper which will return a cleanup for the `document` target
    const cleanup = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
      { target: () => document, event: 'pointerup', handler: () => handleGlobalPointerUp() },
    ], (s) => (s as TransformationStore).activePlugin !== 'edit' /* cleanup when leaving edit mode */);

    return cleanup;
  }, [transformState.isTransforming, endTransformation]);

  return {
    transformState,
    feedback,
    startTransformation,
    updateTransformation,
    endTransformation
  };
};

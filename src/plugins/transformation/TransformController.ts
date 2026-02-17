import { transformManager, type TransformBounds } from '../../utils/transformManager';
import { transformCommands, calculateScaledStrokeWidth } from '../../utils/sharedTransformUtils';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import type { Point, PathData, CanvasElement } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';
import type { GuidelinesPluginSlice } from '../guidelines/slice';

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
  // For multi-selection and group transformations: store original state of all affected elements
  originalElementsData?: Map<string, CanvasElement>;
  // Animation sync: target IDs and snapshot before transform
  animationTargetIds?: Set<string> | null;
  elementsBeforeTransform?: CanvasElement[] | null;
}

export interface TransformFeedback {
  rotation: { degrees: number; visible: boolean; isShiftPressed: boolean; isMultipleOf15: boolean };
  resize: { deltaX: number; deltaY: number; visible: boolean; isShiftPressed: boolean; isMultipleOf10: boolean };
  shape: { width: number; height: number; visible: boolean; isShiftPressed: boolean; isMultipleOf10: boolean };
  pointPosition: { x: number; y: number; visible: boolean };
} 

export class TransformController {
  private transformManager = transformManager;

  /**
   * Initialize transformation state for an element
   */
  initializeTransform(
    element: CanvasElement,
    elementId: string,
    handler: string,
    startPoint: Point,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    rotationCenter?: Point | null
  ): Partial<TransformState> {
    const currentRotation = this.getRotationFromData(element.data);
    return {
      isTransforming: true,
      transformStart: startPoint,
      transformElementId: elementId,
      transformHandler: handler,
      originalBounds: bounds,
      transformedBounds: bounds,
      originalElementData: ((element.data || {}) as NonNullable<CanvasElement['data']>),
      initialTransform: {
        scaleX: 1,
        scaleY: 1,
        rotation: currentRotation,
        translateX: 0,
        translateY: 0
      },
      rotationCenter: rotationCenter ?? null,
    };
  }

  /**
   * Calculate transformation updates based on current pointer position
   */
  calculateTransformUpdate(
    currentPoint: Point,
    state: TransformState,
    elements: CanvasElement[],
    isShiftPressed: boolean
  ): {
    updatedElement: CanvasElement | null;
    feedback: TransformFeedback;
  } {
    performance.mark('calculateTransformUpdate-start');

    if (!state.transformStart || !state.transformElementId || !state.transformHandler ||
        !state.originalBounds || !state.transformedBounds || !state.initialTransform) {
      performance.mark('calculateTransformUpdate-end');
      performance.measure('calculateTransformUpdate', 'calculateTransformUpdate-start', 'calculateTransformUpdate-end');
      return { updatedElement: null, feedback: this.getEmptyFeedback() };
    }

    // Handle subpath transformations
    let element: CanvasElement | undefined;
    let subpathIndex: number | null = null;

    if (state.transformElementId.startsWith('subpath:')) {
      // Extract real element ID and subpath index
      const parts = state.transformElementId.split(':');
      const realElementId = parts[1];
      subpathIndex = parseInt(parts[2]);
      element = elements.find(el => el.id === realElementId);
    } else if (state.transformElementId === 'selection-bbox' || state.transformElementId.startsWith('group:')) {
      // For selection bbox and groups, create a pseudo element for transformation calculation
      element = {
        id: state.transformElementId,
        type: 'path',
        parentId: null,
        data: state.originalElementData as PathData,
        zIndex: 0
      };
    } else {
      element = elements.find(el => el.id === state.transformElementId);
    }

    if (!element) {
      return { updatedElement: null, feedback: this.getEmptyFeedback() };
    }

    const bounds: TransformBounds = {
      x: state.originalBounds.minX,
      y: state.originalBounds.minY,
      width: state.originalBounds.maxX - state.originalBounds.minX,
      height: state.originalBounds.maxY - state.originalBounds.minY,
      center: {
        x: (state.originalBounds.minX + state.originalBounds.maxX) / 2,
        y: (state.originalBounds.minY + state.originalBounds.maxY) / 2
      }
    };

    let newScaleX = state.initialTransform.scaleX;
    let newScaleY = state.initialTransform.scaleY;
    let newRotation = state.initialTransform.rotation;
    let transformOriginX = bounds.center.x;
    let transformOriginY = bounds.center.y;

    const feedback = this.getEmptyFeedback();

    // Handle different transform types
    if (state.transformHandler.startsWith('corner-') || state.transformHandler.startsWith('midpoint-')) {
      // Scale transformation
      const scaleResult = this.transformManager.calculateScale(
        state.transformHandler,
        currentPoint,
        state.transformStart,
        bounds
      );

      newScaleX = scaleResult.scaleX;
      newScaleY = scaleResult.scaleY;
      transformOriginX = scaleResult.originX;
      transformOriginY = scaleResult.originY;

      // Calculate feedback
      let newWidth = Math.round(bounds.width * newScaleX);
      let newHeight = Math.round(bounds.height * newScaleY);
      const originalWidth = Math.round(bounds.width * state.initialTransform.scaleX);
      const originalHeight = Math.round(bounds.height * state.initialTransform.scaleY);
      const deltaX = newWidth - originalWidth;
      const deltaY = newHeight - originalHeight;

      let adjustedDeltaX = deltaX;
      let adjustedDeltaY = deltaY;

      if (isShiftPressed) {
        // Round to nearest 10-pixel increment
        adjustedDeltaX = Math.round(deltaX / 10) * 10;
        adjustedDeltaY = Math.round(deltaY / 10) * 10;

        // Recalculate scales based on adjusted deltas
        newScaleX = state.initialTransform.scaleX * (originalWidth + adjustedDeltaX) / originalWidth;
        newScaleY = state.initialTransform.scaleY * (originalHeight + adjustedDeltaY) / originalHeight;
      }

      // Integrate size snapping from guidelines (if enabled)
      try {
        const guidelinesSlice = useCanvasStore.getState() as unknown as GuidelinesPluginSlice;
        if (guidelinesSlice.guidelines?.sizeMatchingEnabled && guidelinesSlice.findSizeMatches) {
          const projectedBoundsForSize = {
            minX: bounds.x,
            minY: bounds.y,
            maxX: bounds.x + Math.round(bounds.width * newScaleX),
            maxY: bounds.y + Math.round(bounds.height * newScaleY)
          };
          const targetId = state.transformElementId ?? element.id ?? '';
          const sizeMatches = guidelinesSlice.findSizeMatches(targetId, projectedBoundsForSize);
          if (sizeMatches && sizeMatches.length > 0) {
            const widthMatch = sizeMatches.find(m => m.type === 'width');
            if (widthMatch) {
              const matchedWidth = widthMatch.value;
              adjustedDeltaX = matchedWidth - originalWidth;
              newScaleX = state.initialTransform.scaleX * (originalWidth + adjustedDeltaX) / originalWidth;
              // Reflect snapped width in newWidth for feedback
              newWidth = matchedWidth;
            }
            const heightMatch = sizeMatches.find(m => m.type === 'height');
            if (heightMatch) {
              const matchedHeight = heightMatch.value;
              adjustedDeltaY = matchedHeight - originalHeight;
              newScaleY = state.initialTransform.scaleY * (originalHeight + adjustedDeltaY) / originalHeight;
              newHeight = matchedHeight;
            }
          }
        }
      } catch (_e) {
        // Be defensive; guidelines slice may not be available in some contexts
      }

      const isMultipleOf10 = (Math.abs(adjustedDeltaX) % 10 === 0) && (Math.abs(adjustedDeltaY) % 10 === 0);

      feedback.resize = {
        deltaX: adjustedDeltaX,
        deltaY: adjustedDeltaY,
        visible: true,
        isShiftPressed,
        isMultipleOf10
      };

      // Also set shape feedback with actual dimensions
      feedback.shape = {
        width: newWidth,
        height: newHeight,
        visible: true,
        isShiftPressed,
        isMultipleOf10
      };

    } else if (state.transformHandler.startsWith('rotate-')) {
      // Rotation transformation
      const rotationResult = this.transformManager.calculateRotation(
        currentPoint,
        state.transformStart,
        bounds,
        state.rotationCenter ?? undefined
      );

      let calculatedRotation = state.initialTransform.rotation + rotationResult.angle;

      // Apply sticky rotation (15-degree increments) when Shift is pressed
      if (isShiftPressed) {
        // Round to nearest 15-degree increment
        calculatedRotation = Math.round(calculatedRotation / 15) * 15;
      }

      newRotation = calculatedRotation;
      transformOriginX = rotationResult.centerX;
      transformOriginY = rotationResult.centerY;

      // Keep rotation within reasonable bounds (-180 to 180)
      while (newRotation > 180) newRotation -= 360;
      while (newRotation < -180) newRotation += 360;

      // Update rotation feedback - show total rotation in 0-360 range
      const normalizedDegrees = newRotation < 0 ? newRotation + 360 : newRotation;
      const isMultipleOf15 = Math.round(normalizedDegrees) % 15 === 0;

      feedback.rotation = {
        degrees: Math.round(normalizedDegrees),
        visible: true,
        isShiftPressed,
        isMultipleOf15: isShiftPressed ? isMultipleOf15 : false
      };
    }

    // Apply transformation to element data
    const updatedElement = this.applyTransformToElement(
      element,
      state.originalElementData ?? element.data,
      {
        scaleX: newScaleX,
        scaleY: newScaleY,
        rotation: newRotation,
        translateX: 0,
        translateY: 0
      },
      { x: transformOriginX, y: transformOriginY },
      subpathIndex,
      newRotation - (state.initialTransform.rotation ?? 0)
    );

    return { updatedElement, feedback };
  }

  /**
   * Apply transformation to element data
   */
  private applyTransformToElement(
    element: CanvasElement,
    originalData: CanvasElement['data'],
    transform: { scaleX: number; scaleY: number; rotation: number; translateX: number; translateY: number },
    origin: Point,
    subpathIndex: number | null = null,
    deltaRotation?: number
  ): CanvasElement {
    if (element.type === 'path') {
      const pathOriginal = originalData as PathData;
      // Create a copy of the original data
      const newData: PathData = {
        ...pathOriginal,
        subPaths: pathOriginal.subPaths.map((subPath, index) => {
          // If transforming a specific subpath, only transform that one
          if (subpathIndex !== null && index !== subpathIndex) {
            return subPath;
          }
          // Use shared transformation utility for consistency
          return transformCommands(subPath, {
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
            originX: origin.x,
            originY: origin.y,
            rotation: transform.rotation,
            rotationCenterX: origin.x,
            rotationCenterY: origin.y
          });
        }),
        // Update stroke width using shared utility
        strokeWidth: subpathIndex === null 
          ? calculateScaledStrokeWidth(pathOriginal.strokeWidth, transform.scaleX, transform.scaleY)
          : pathOriginal.strokeWidth,
        // Update the transform property to reflect the current transformation
        transform: {
          scaleX: transform.scaleX,
          scaleY: transform.scaleY,
          rotation: transform.rotation,
          translateX: transform.translateX,
          translateY: transform.translateY
        }
      };

      return {
        ...element,
        data: newData
      };
    }

    // Non-path elements: rely on contributions to perform scale/rotate around origin
    const baseElement: CanvasElement = { ...element, data: originalData };
    const scaled = elementContributionRegistry.scaleElement(
      baseElement,
      transform.scaleX,
      transform.scaleY,
      origin.x,
      origin.y,
      3
    ) ?? baseElement;

    // Apply rotation as a delta to avoid resetting existing rotation
    const rotationDelta = deltaRotation ?? 0;
    const rotated = elementContributionRegistry.rotateElement(
      scaled,
      rotationDelta,
      origin.x,
      origin.y,
      3
    ) ?? scaled;

    return rotated;
  }

  /**
   * Reset transformation state
   */
  resetTransform(): Partial<TransformState> {
    return {
      isTransforming: false,
      transformStart: null,
      transformElementId: null,
      transformHandler: null,
      originalBounds: null,
      transformedBounds: null,
      initialTransform: null,
      originalElementData: undefined,
      rotationCenter: null,
      animationTargetIds: null,
      elementsBeforeTransform: null
    };
  }

  /**
   * Get empty feedback state
   */
  private getRotationFromData(data: CanvasElement['data']): number {
    const maybeMatrix = (data as { transformMatrix?: [number, number, number, number, number, number] }).transformMatrix;
    if (maybeMatrix) {
      return Math.atan2(maybeMatrix[1], maybeMatrix[0]) * (180 / Math.PI);
    }
    const maybeTransform = (data as { transform?: { rotation?: number } }).transform;
    if (maybeTransform?.rotation !== undefined) {
      return maybeTransform.rotation;
    }
    return 0;
  }

  private getEmptyFeedback(): TransformFeedback {
    return {
      rotation: { degrees: 0, visible: false, isShiftPressed: false, isMultipleOf15: false },
      resize: { deltaX: 0, deltaY: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      shape: { width: 0, height: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      pointPosition: { x: 0, y: 0, visible: false }
    };
  }
}

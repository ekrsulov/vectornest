import { pluginManager } from '../../../utils/pluginManager';
import type {
  CanvasService,
  CanvasServiceContext,
  CanvasServiceInstance,
} from '../../../utils/pluginManager';
import type { Point, PathData, CanvasElement } from '../../../types';
import { findClosestPathSegment } from '../../../utils/pathProximityUtils';
import { createListenerContext, installGlobalPluginListeners } from '../../../utils/pluginListeners';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasStore } from '../../../store/canvasStore';
import type { AddPointPluginSlice } from '../slice';

type AddPointStore = CanvasStore & AddPointPluginSlice;

export const ADD_POINT_SERVICE_ID = 'add-point-listener';
const BASE_POINT_THRESHOLD = 10;
const SEGMENT_THRESHOLD = 15;

export interface AddPointServiceState {
  activePlugin: string | null;
  isAddPointModeActive: boolean;
  elements: CanvasElement[];
  selectedIds: string[];
  zoom: number;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
  updateAddPointHover: (
    position: Point | null,
    elementId: string | null,
    segmentInfo: { commandIndex: number; t: number } | null
  ) => void;
  insertPointOnPath: () => { elementId: string; commandIndex: number; pointIndex: number } | null;
  hasValidHover: () => boolean;
}

class AddPointListenerService implements CanvasService<AddPointServiceState> {
  id = ADD_POINT_SERVICE_ID;

  create({ svg }: CanvasServiceContext): CanvasServiceInstance<AddPointServiceState> {
    let currentState: AddPointServiceState | null = null;
    let cleanupFn: (() => void) | null = null;

    const getState = () => currentState;

    const handlePointerMove = (event: PointerEvent) => {
      const state = getState();
      if (!state || !state.isAddPointModeActive || state.activePlugin !== 'edit') {
        return;
      }

      // Don't process if clicking on UI elements
      const target = event.target as Element;
      if (target && target.closest) {
        const isUIElement = target.closest('circle, rect, ellipse, .chakra-button, button, input, select');
        if (isUIElement) {
          state.updateAddPointHover(null, null, null);
          return;
        }
      }

      const point = state.screenToCanvas(event.clientX, event.clientY);
      state.emitPointerEvent('pointermove', event, point);

      // Find path elements that are selected
      const pathElements = state.elements.filter(
        (el) => el.type === 'path' && state.selectedIds.includes(el.id)
      );

      // If no paths are selected, don't show hover feedback
      if (pathElements.length === 0) {
        state.updateAddPointHover(null, null, null);
        return;
      }

      let closestMatch: {
        element: CanvasElement;
        result: { commandIndex: number; closestPoint: Point; t: number; distance: number };
      } | null = null;
      let minDistance = Infinity;

      // Check each selected path element
      for (const element of pathElements) {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();

        const dynamicThreshold = BASE_POINT_THRESHOLD / state.zoom; // Make threshold dynamic based on zoom
        const dynamicSegmentThreshold = SEGMENT_THRESHOLD / state.zoom; // Make segment threshold dynamic based on zoom
        const result = findClosestPathSegment(point, commands, dynamicSegmentThreshold, dynamicThreshold);
        if (result && result.distance < minDistance) {
          minDistance = result.distance;
          closestMatch = { element, result };
        }
      }

      if (closestMatch) {
        state.updateAddPointHover(
          closestMatch.result.closestPoint,
          closestMatch.element.id,
          { commandIndex: closestMatch.result.commandIndex, t: closestMatch.result.t }
        );
      } else {
        state.updateAddPointHover(null, null, null);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = getState();
      if (!state || !state.isAddPointModeActive || state.activePlugin !== 'edit') {
        return;
      }

      // Only handle left click
      if (event.button !== 0) {
        return;
      }

      // Don't process if clicking on UI elements
      const target = event.target as Element;
      if (target && target.closest) {
        const isUIElement = target.closest('circle, rect, ellipse, .chakra-button, button, input, select');
        if (isUIElement) {
          return;
        }
      }

      // Check if we have a valid hover position (cursor is over a path segment)
      const hasValidHover = state.hasValidHover();
      
      if (!hasValidHover) {
        // No valid hover, allow normal selection behavior
        return;
      }
      
      // Insert the point - it will automatically be selected and set to dragging state
      state.insertPointOnPath();

      // Prevent default and stop propagation to avoid starting selection box
      event.preventDefault();
      event.stopPropagation();
    };

    const attachListeners = () => {
      if (cleanupFn) return;

      cleanupFn = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
        { target: () => svg, event: 'pointermove', handler: (e: Event) => handlePointerMove(e as PointerEvent) },
        { target: () => svg, event: 'pointerdown', handler: (e: Event) => handlePointerDown(e as PointerEvent), options: { capture: true } },
      ], (s) => {
        const state = s as AddPointStore;
        return state.activePlugin !== 'edit' || !state.addPointMode?.isActive;
      });
    };

    const detachListeners = () => {
      if (!cleanupFn) return;
      try { cleanupFn(); } catch { /* ignore */ }
      cleanupFn = null;
    };

    return {
      update: (state: AddPointServiceState) => {
        currentState = state;

        if (state.activePlugin === 'edit' && state.isAddPointModeActive) {
          attachListeners();
        } else {
          detachListeners();
          // Note: Don't call updateAddPointHover here as it triggers setState,
          // causing infinite loops. The hover state will be cleared naturally
          // when the mode changes through normal event flow.
        }
      },
      dispose: () => {
        detachListeners();
        currentState = null;
      },
    };
  }
}

pluginManager.registerCanvasService(new AddPointListenerService());

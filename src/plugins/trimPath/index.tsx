import { Scissors } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createTrimPathPluginSlice, type TrimPathPluginSlice } from './slice';
import { TrimPathOverlayConnected } from './TrimPathOverlay';
import { findSegmentAtPoint } from './trimPathGeometry';
import { trimPathCache } from './cache';
import { pluginManager } from '../../utils/pluginManager';
import { selectionHasOnlyPaths } from '../../utils/selectionGuards';

/**
 * Trim Path Plugin Definition.
 * 
 * Allows users to trim path segments at intersection points.
 * MVP features:
 * - Select 2-5 paths with intersections
 * - Click to trim individual segments
 * - Visual feedback for intersections and trimmable segments
 * - Undo/redo support
 */
// Slice factory for Trim Path
const trimPathSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createTrimPathPluginSlice(set as any, get as any, api as any);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state: slice as any,
  };
};

export const trimPathPlugin: PluginDefinition<CanvasStore> = {
  id: 'trimPath',
  metadata: {
    label: 'Trim Path',
    icon: Scissors,
    cursor: 'crosshair',
    disablePathInteraction: true,
  },
  behaviorFlags: () => ({
    hideIndividualSelectionOverlays: true,
    notifyOnSelectionChange: true,
  }),
  toolDefinition: {
    order: 21,
    visibility: 'dynamic',
    toolGroup: 'advanced',
    isDisabled: (store) => {
      const state = store as CanvasStore;
      return !selectionHasOnlyPaths(state.selectedIds || [], state.elements || []);
    },
  },
  subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
  handler: (event, point, _target, context) => {
    const store = context.store;
    const state = store.getState() as CanvasStore & TrimPathPluginSlice;
    const trimPath = state.trimPath;
    const activePlugin = state.activePlugin;

    // Auto-deactivate if plugin changed
    if (activePlugin !== 'trimPath' && trimPath?.isActive) {

      state.deactivateTrimTool?.();
      return;
    }

    // Ensure tool initialized on first interaction
    if (!trimPath?.isActive) {

      state.activateTrimTool?.();
    }

    if (!trimPath?.splitResult) {

      return;
    }

    if (event.type === 'pointerdown') {
      // Check if clicking on a trimmable segment to start drag
      const segment = findSegmentAtPoint(
        trimPath.splitResult.segments,
        point,
        5
      );

      if (segment) {

        state.startTrimDrag?.(point);
      }
    } else if (event.type === 'pointermove') {
      if (trimPath.isDragging) {

        state.updateTrimDrag?.(point);
      } else {
        const segment = findSegmentAtPoint(
          trimPath.splitResult.segments,
          point,
          5
        );

        state.setHoveredSegment?.(segment?.id || null);
      }
    } else if (event.type === 'pointerup') {
      if (trimPath.isDragging) {

        state.finishTrimDrag?.();
      } else {
        const segment = findSegmentAtPoint(
          trimPath.splitResult.segments,
          point,
          5
        );
        if (segment) {

          state.trimSegment?.(segment.id);
        }
      }
    }
  },
  keyboardShortcuts: {
    Escape: (_event, context) => {
      const store = context.store;
      const state = store.getState() as CanvasStore & TrimPathPluginSlice;

      if (state.trimPath?.isDragging) {
        state.cancelTrimDrag?.();
      } else if (state.trimPath?.isActive) {
        state.deactivateTrimTool?.();
      }
    },
    t: {
      handler: (_event, context) => {
        const store = context.store;
        const state = store.getState() as CanvasStore & TrimPathPluginSlice;
        if (state.trimPath?.isActive) {
          state.deactivateTrimTool?.();
        } else {
          state.activateTrimTool?.();
        }
      },
      options: { preventDefault: true },
    },
  },
  canvasLayers: [
    {
      id: 'trim-path-overlay',
      placement: 'foreground',
      render: () => <TrimPathOverlayConnected />,
    },
  ],
  // Trim Path no longer exposes a persistent panel in the UI.
  // Panels removed per UX decision; the overlay and handler remain active.
  slices: [trimPathSliceFactory],

  // Initialize lifecycle actions to invalidate cache when entering trimPath mode
  // This covers all cases: elements moved, deleted, edited by any plugin, etc.
  init: (context) => {
    const unregisterModeEnter = pluginManager.registerLifecycleAction(
      'onModeEnter:trimPath',
      () => {
        // Clear the cache first
        trimPathCache.clear();
        // Then force recalculation by calling activateTrimTool
        const state = context.store.getState() as CanvasStore & TrimPathPluginSlice;
        state.activateTrimTool?.();
      }
    );

    // Register for selection change notifications (decoupled from selectionSlice)
    const unregisterSelectionChanged = pluginManager.registerLifecycleAction(
      'onSelectionChanged',
      () => {
        const state = context.store.getState() as CanvasStore & TrimPathPluginSlice;
        // Only refresh if trimPath is active
        if (state.activePlugin === 'trimPath' && state.refreshTrimCache) {
          state.refreshTrimCache();
        }
      }
    );

    // Return cleanup function
    return () => {
      unregisterModeEnter();
      unregisterSelectionChanged();
    };
  },

  // Create API for external access
  createApi: (context) => ({
    /**
     * Debug method: Logs detailed information about selected paths and segments.
     * Usage from console: window.useCanvasStore.getState().debugTrimState()
     */
    debugTrimState: () => {
      const state = context.store.getState() as CanvasStore & TrimPathPluginSlice;
      state.debugTrimState?.();
    },
  }),
};


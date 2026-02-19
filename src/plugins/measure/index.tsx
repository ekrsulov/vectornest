import React from 'react';
import type { PluginDefinition, PluginSliceFactory, PluginContextFull, SnapOverlayConfig } from '../../types/plugins';
import { createToolPanel } from '../../utils/pluginFactories';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import { Ruler } from 'lucide-react';
import { createMeasurePluginSlice } from './slice';
import type { MeasurePluginSlice, MeasurePluginActions, SnapInfo } from './slice';
import { useCanvasStore, canvasStoreApi } from '../../store/canvasStore';
import { MeasureOverlay } from './MeasureOverlay';
import { MeasureInfoPanel } from './MeasureInfoPanel';
import { getSnapPointLabel } from '../../utils/snapPointUtils';
import { screenDistance } from '../../utils/math';
import { getEffectiveShift } from '../../utils/effectiveShift';
import { clientToCanvas } from '../../utils/pointUtils';
import { constrainToCardinalAndDiagonal } from '../../utils/geometry';
import { installGlobalPluginListeners } from '../../utils/pluginListeners';
import { SnapPointsCache } from './SnapPointsCache';
import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';

// Centralized snap system
import { snapManager } from '../../snap/SnapManager';
import { getPluginSnapResult } from '../../snap/snapUtils';
import { MeasureSnapSource } from './MeasureSnapSource';
import { registerSnapProvider, unregisterSnapProvider } from '../../snap/snapProviderRegistry';
import { registerDragHandler, unregisterDragHandler } from '../../canvas/interactions/dragHandlerRegistry';

import type { SnapPointCache } from './slice';

type MeasurePluginApi = {
  startMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  updateMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  finalizeMeasurement: () => void;
  clearMeasurement: () => void;
  refreshSnapPointsCache: (snapPoints: SnapPointCache[]) => void;
};

/**
 * Constrain a point relative to a start point to the closest of 8 directions
 * (horizontal, vertical, or diagonal 45deg steps) while preserving distance.
 */


/**
 * Helper to get snap result using centralized snap manager
 */
function getSnapResult(point: Point, state: MeasurePluginSlice & CanvasStore): SnapInfo | null {
  return getPluginSnapResult(
    point,
    state.viewport,
    state.activePlugin || '',
    state.selectedIds ?? [],
    state.measure?.enableSnapping ?? false
  ) as SnapInfo | null;
}

/**
 * Get snap overlay configuration for measure mode.
 * This decouples SnapOverlay from knowing about measure plugin internals.
 */
function getMeasureSnapOverlayConfig(): SnapOverlayConfig | null {
  const state = canvasStoreApi.getState() as CanvasStore & MeasurePluginSlice;
  const measure = state.measure;
  const snapPoints = state.snapPoints; // Read from global state

  if (!measure) return null;

  // isInteracting is true when plugin is active - this allows showing snap crosshair
  // during hover (before first click) and during measurement
  return {
    showStaticPoints: snapPoints?.showSnapPoints ?? false,
    cachedSnapPoints: measure.cachedSnapPoints ?? [],
    snapPointsOpacity: snapPoints?.snapPointsOpacity ?? 50,
    currentSnapInfo: measure.currentSnapInfo ?? null,
    isInteracting: state.activePlugin === 'measure',
    mode: 'measureSnap',
    handlesFeedbackInternally: true,
  };
}

const measureSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createMeasurePluginSlice(set as any, get as any, api as any) as MeasurePluginSlice & MeasurePluginActions;
  return {
    state: slice as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  };
};

// Global listener flags and cleanup handles (kept in the module scope)
// _stopStoreSubscription is intentionally not used, cleanup is handled by returned functions.

const installListeners = (context: PluginContextFull<CanvasStore>, api: MeasurePluginApi) => {

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    const currentState = context.store.getState() as unknown as MeasurePluginSlice & CanvasStore;
    const canvasPoint = clientToCanvas(moveEvent.clientX, moveEvent.clientY, svg, currentState.viewport);

    // Use centralized snap manager
    const moveSnapInfo = getSnapResult(canvasPoint, currentState);

    // Only update while measurement is active (not frozen)
    if (currentState.measure?.measurement?.isActive) {
      const finalMovePoint = moveSnapInfo?.point ?? canvasPoint;
      // If shift is pressed, constrain to horizontal/vertical/diagonal
      const effectiveShift = getEffectiveShift(moveEvent.shiftKey, currentState.isVirtualShiftActive);
      const pointToSet = (effectiveShift && currentState.measure?.measurement?.startPoint)
        ? constrainToCardinalAndDiagonal(currentState.measure.measurement.startPoint, finalMovePoint)
        : finalMovePoint;
      api.updateMeasurement(pointToSet, moveSnapInfo);
    }
  };

  const handlePointerUp = (upEvent: PointerEvent) => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    const currentState = context.store.getState() as unknown as MeasurePluginSlice & CanvasStore;
    const canvasPoint = clientToCanvas(upEvent.clientX, upEvent.clientY, svg, currentState.viewport);

    // Use centralized snap manager
    const upSnapInfo = getSnapResult(canvasPoint, currentState);

    let finalUpPoint = upSnapInfo?.point ?? canvasPoint;
    // If shift is pressed, constrain final position
    const effectiveShiftUp = getEffectiveShift(upEvent.shiftKey, currentState.isVirtualShiftActive);
    if (effectiveShiftUp && currentState.measure?.measurement?.startPoint) {
      finalUpPoint = constrainToCardinalAndDiagonal(currentState.measure.measurement.startPoint, finalUpPoint);
    }
    // Commit the final location
    if (currentState.measure?.measurement?.isActive) {
      api.updateMeasurement(finalUpPoint, upSnapInfo);

      // Check if we dragged (distance > 5px)
      // If so, finalize (freeze) the measurement immediately
      if (currentState.measure.measurement.startPoint) {
        const dist = screenDistance(currentState.measure.measurement.startPoint, finalUpPoint, currentState.viewport.zoom);
        // 5 screen pixels threshold for "drag"
        if (dist > 5) {
          api.finalizeMeasurement();
        }
      }
    }
  };

  installGlobalPluginListeners(context, [
    { event: 'pointermove', handler: handlePointerMove },
  ], (state) => (state as unknown as CanvasStore).activePlugin !== 'measure' || !(state as unknown as MeasurePluginSlice).measure?.measurement?.isActive);

  installGlobalPluginListeners(context, [
    { event: 'pointerup', handler: handlePointerUp },
  ], (state) => (state as unknown as CanvasStore).activePlugin !== 'measure' || !(state as unknown as MeasurePluginSlice).measure?.measurement?.isActive);

  // We rely on installGlobalPluginListeners' internal subscription to clean up when
  // the plugin becomes inactive, so no additional subscription is required here.
};

// eslint-disable-next-line react-refresh/only-export-components
export const measurePlugin: PluginDefinition<CanvasStore> = {
  id: 'measure',
  metadata: {
    label: 'Measure',
    icon: Ruler,
    cursor: 'crosshair',
  },
  toolDefinition: { order: 22, visibility: 'dynamic', toolGroup: 'advanced' },
  // Behavior flags for decoupled plugin interactions
  behaviorFlags: () => ({
    usesMeasureSnap: true,
    getSnapOverlayConfig: getMeasureSnapOverlayConfig,
  }),

  // Register MeasureSnapSource with the centralized snap manager
  init: (context: PluginContextFull<CanvasStore>) => {
    const measureSnapSource = new MeasureSnapSource(context.store);
    snapManager.registerSource(measureSnapSource);
    registerSnapProvider({
      pluginId: 'measure',
      priority: 90,
      isActive: (state) => (state as CanvasStore).activePlugin === 'measure',
      getOverlayConfig: (state) => {
        const s = state as CanvasStore & MeasurePluginSlice;
        const measure = s.measure;
        const snapPoints = s.snapPoints;
        if (!measure) return null;
        return {
          showStaticPoints: snapPoints?.showSnapPoints ?? false,
          cachedSnapPoints: measure.cachedSnapPoints ?? [],
          snapPointsOpacity: snapPoints?.snapPointsOpacity ?? 50,
          currentSnapInfo: measure.currentSnapInfo ?? null,
          isInteracting: s.activePlugin === 'measure',
          mode: 'measureSnap',
          handlesFeedbackInternally: true,
        };
      },
    });

    registerDragHandler({
      pluginId: 'measure',
      type: 'measurement',
      priority: 80,
      canHandle: (state) => Boolean((state as CanvasStore & MeasurePluginSlice).measure?.measurement?.isActive),
      getContext: (state) => {
        const s = state as CanvasStore & MeasurePluginSlice;
        const measurement = s.measure?.measurement;
        if (!measurement?.isActive) return null;
        return {
          pluginId: 'measure',
          type: 'measurement',
          isDragging: true,
          elementIds: [],
          startPosition: measurement.startPoint,
          currentPosition: measurement.endPoint,
          metadata: {
            measurement,
          },
        };
      },
    });

    // Hover listener for showing snap crosshair before first click
    let hoverCleanup: (() => void) | null = null;

    const setupHoverListener = () => {
      if (hoverCleanup) return; // Already set up

      const handleHoverMove = (moveEvent: PointerEvent) => {
        const svg = document.querySelector('svg');
        if (!svg) return;

        const currentState = context.store.getState() as unknown as MeasurePluginSlice & CanvasStore;

        // Only handle hover when plugin is active but no measurement in progress
        if (currentState.activePlugin !== 'measure') return;
        if (currentState.measure?.measurement?.isActive) return;

        const canvasPoint = clientToCanvas(moveEvent.clientX, moveEvent.clientY, svg, currentState.viewport);
        const hoverSnapInfo = getSnapResult(canvasPoint, currentState);

        // Only update if snap info actually changed (avoid unnecessary state updates)
        const currentSnapInfo = currentState.measure?.currentSnapInfo;
        const snapChanged =
          (hoverSnapInfo === null && currentSnapInfo !== null) ||
          (hoverSnapInfo !== null && currentSnapInfo === null) ||
          (hoverSnapInfo && currentSnapInfo && (
            hoverSnapInfo.point.x !== currentSnapInfo.point.x ||
            hoverSnapInfo.point.y !== currentSnapInfo.point.y
          ));

        if (snapChanged && currentState.updateMeasureState) {
          currentState.updateMeasureState({ currentSnapInfo: hoverSnapInfo });
        }
      };

      hoverCleanup = installGlobalPluginListeners(context, [
        { event: 'pointermove', handler: handleHoverMove },
      ], (state) => (state as unknown as CanvasStore).activePlugin !== 'measure');
    };

    // Set up hover listener when mode enters
    let previousPlugin: string | null = null;
    const unsubscribe = context.store.subscribe((state) => {
      const currentState = state as unknown as CanvasStore;
      const currentPlugin = currentState.activePlugin;

      // Only react to actual plugin changes
      if (currentPlugin === previousPlugin) return;
      previousPlugin = currentPlugin;

      if (currentPlugin === 'measure') {
        setupHoverListener();
      } else {
        // Clean up hover listener when leaving measure mode
        if (hoverCleanup) {
          hoverCleanup();
          hoverCleanup = null;
        }
        // Also clear currentSnapInfo when leaving the mode (only if it's set)
        const measureState = state as unknown as MeasurePluginSlice;
        if (measureState.measure?.currentSnapInfo != null && measureState.updateMeasureState) {
          measureState.updateMeasureState({ currentSnapInfo: null });
        }
      }
    });

    // Initial setup if already in measure mode
    const initialState = context.store.getState() as unknown as CanvasStore;
    if (initialState.activePlugin === 'measure') {
      setupHoverListener();
    }

    // Return cleanup function
    return () => {
      snapManager.unregisterSource(measureSnapSource.id);
      unregisterSnapProvider('measure');
      unregisterDragHandler('measure');
      unsubscribe();
      if (hoverCleanup) {
        hoverCleanup();
      }
    };
  },

  handler: (event: ReactPointerEvent, point: Point, _target: Element, context: PluginContextFull<CanvasStore>) => {
    const api = context.api as MeasurePluginApi;
    const state = context.store.getState() as unknown as MeasurePluginSlice & CanvasStore;

    // Use centralized snap manager
    const snapInfo = getSnapResult(point, state);
    const finalPoint = snapInfo?.point ?? point;

    // If there is a frozen measurement (not active but has points), clear it on click
    if (!state.measure.measurement.isActive && state.measure.measurement.startPoint && state.measure.measurement.endPoint) {
      api.clearMeasurement();
      return;
    }

    // If there is no active measurement, start a new one and ensure we have global listeners
    if (!state.measure.measurement.isActive) {
      api.startMeasurement(finalPoint, snapInfo);
      installListeners(context, api);
      return;
    }

    // If a measurement is already active, treat this pointerdown as intent to finalize (freeze)
    // the measurement at the clicked point. Update & finalize then listeners will be removed
    // via the store subscription in installListeners when `isActive` becomes false.
    // If shift is held during finalization (physical OR virtual), constrain to axis/diagonals
    const handlerEffectiveShift = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);
    const finalPointToSet = handlerEffectiveShift && state.measure?.measurement?.startPoint
      ? constrainToCardinalAndDiagonal(state.measure.measurement.startPoint, finalPoint)
      : finalPoint;
    api.updateMeasurement(finalPointToSet, snapInfo);
    api.finalizeMeasurement();
  },
  keyboardShortcuts: {
    Escape: (_event, { store }) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.clearMeasurement?.();
    },
    'Shift+M': (_event, { store }) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.updateMeasureState?.({
        showInfo: !state.measure?.showInfo,
      });
    },
    'm': {
      handler: (_event, { store }) => {
        const state = store.getState() as unknown as MeasurePluginSlice & CanvasStore;
        state.setActivePlugin('measure');
      },
      options: {
        allowWhileTyping: false,
      },
    },
  },
  // Snap points and feedback overlays are now handled by centralized SnapOverlay (src/snap/SnapOverlay.tsx)
  canvasLayers: [
    {
      id: 'measure-cache-init',
      placement: 'background',
      render: (context) => {
        // Only initialize cache when in measure mode
        if (context.activePlugin !== 'measure') {
          return null;
        }
        return <SnapPointsCache />;
      },
    },
    {
      id: 'measure-overlay',
      placement: 'foreground',
      render: (context) => {
        const MeasureOverlayWrapper = () => {
          const measureState = useCanvasStore(state => (state as CanvasStore & MeasurePluginSlice).measure);
          const { activePlugin, settings } = context as any; // eslint-disable-line @typescript-eslint/no-explicit-any

          if (activePlugin !== 'measure') {
            return null;
          }

          if (!measureState) {
            return null;
          }

          const { measurement, showInfo, units, startSnapInfo, currentSnapInfo } = measureState;
          const precision = settings?.keyboardMovementPrecision ?? 1;

          // Memoize canvasSize
          const canvasSize = { width: window.innerWidth, height: window.innerHeight };

          // Get snap feedback from currentSnapInfo (for both hover and drawing states)
          const snapFeedback = currentSnapInfo ? {
            message: getSnapPointLabel(currentSnapInfo.type),
            visible: true
          } : undefined;

          // Show feedback overlay during hover (before first click) when hovering over snap point
          if (!measurement?.isActive && !(measurement?.startPoint && measurement?.endPoint)) {
            if (currentSnapInfo) {
              const snapPoint = currentSnapInfo.point;
              return (
                <FeedbackOverlay
                  viewport={context.viewport}
                  canvasSize={canvasSize}
                  pointPositionFeedback={{ x: Math.round(snapPoint.x), y: Math.round(snapPoint.y), visible: true }}
                  customFeedback={snapFeedback}
                />
              );
            }
            return null;
          }

          // Get current endpoint for position display (during measurement)
          const endPoint = measurement.endPoint;
          const mouseX = endPoint ? Math.round(endPoint.x) : 0;
          const mouseY = endPoint ? Math.round(endPoint.y) : 0;

          return (
            <>
              <MeasureOverlay
                measurement={measurement}
                viewport={context.viewport}
                startSnapInfo={startSnapInfo ?? null}
                currentSnapInfo={currentSnapInfo ?? null}
                units={units ?? 'px'}
                showInfo={showInfo ?? true}
                precision={precision}
              />
              {measurement.isActive && (
                <FeedbackOverlay
                  viewport={context.viewport}
                  canvasSize={canvasSize}
                  pointPositionFeedback={{ x: mouseX, y: mouseY, visible: true }}
                  customFeedback={snapFeedback}
                />
              )}
            </>
          );
        };

        return <MeasureOverlayWrapper />;
      },
    },
  ],
  slices: [measureSliceFactory],
  createApi: ({ store }) => ({
    startMeasurement: (point: Point, snapInfo?: SnapInfo | null) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.startMeasurement?.(point, snapInfo);
    },
    updateMeasurement: (point: Point, snapInfo?: SnapInfo | null) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.updateMeasurement?.(point, snapInfo);
    },
    finalizeMeasurement: () => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.finalizeMeasurement?.();
    },
    clearMeasurement: () => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.clearMeasurement?.();
    },
    refreshSnapPointsCache: (snapPoints: SnapPointCache[]) => {
      const state = store.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;
      state.refreshSnapPointsCache?.(snapPoints);
    },
  }),
  expandablePanel: () => React.createElement(MeasureInfoPanel, { hideTitle: true }),
  sidebarPanels: [createToolPanel('measure', MeasureInfoPanel)],
};


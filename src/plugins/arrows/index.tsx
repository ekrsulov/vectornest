import React, { useMemo } from 'react';
import type { PluginDefinition, PluginSliceFactory, PluginContextFull, SnapOverlayConfig } from '../../types/plugins';
import { createToolPanel } from '../../utils/pluginFactories';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasStore } from '../../store/canvasStore';
import type { Point, PathData } from '../../types';
import { MoveRight } from 'lucide-react';
import { createArrowsPluginSlice } from './slice';
import type { ArrowsPluginSlice, ArrowsPluginActions, SnapInfo } from './slice';
import { useCanvasStore, canvasStoreApi } from '../../store/canvasStore';
import { ArrowsOverlay } from './ArrowsOverlay';
import { ArrowsPanel } from './ArrowsPanel';
import { SnapPointsCache } from './SnapPointsCache';
import { generateArrowComponents, type Bounds } from './arrowUtils';
import { getEffectiveShift } from '../../utils/effectiveShift';
import { clientToCanvas } from '../../utils/pointUtils';
import { installGlobalPluginListeners } from '../../utils/pluginListeners';
import { measurePath } from '../../utils/measurementUtils';
import { constrainToCardinalAndDiagonal } from '../../utils/geometry';
import { getPluginSnapResult } from '../../snap/snapUtils';

import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';
import { getSnapPointLabel } from '../../utils/snapPointUtils';

// Centralized snap system
import { snapManager } from '../../snap/SnapManager';
import { ArrowsSnapSource } from './ArrowsSnapSource';
import { registerSnapProvider, unregisterSnapProvider } from '../../snap/snapProviderRegistry';
import { registerDragHandler, unregisterDragHandler } from '../../canvas/interactions/dragHandlerRegistry';

type ArrowsPluginApi = {
  startArrowDrawing: (point: Point, snapInfo?: SnapInfo | null) => void;
  updateArrowDrawing: (point: Point, snapInfo?: SnapInfo | null) => void;
  finalizeArrowDrawing: () => { startPoint: Point; endPoint: Point } | null;
  cancelArrowDrawing: () => void;
};



/**
 * Get snap overlay configuration for arrows mode.
 * This decouples SnapOverlay from knowing about arrows plugin internals.
 */
function getArrowsSnapOverlayConfig(): SnapOverlayConfig | null {
  const state = canvasStoreApi.getState() as CanvasStore & ArrowsPluginSlice;
  const arrows = state.arrows;
  const snapPoints = state.snapPoints; // Read from global state

  if (!arrows) return null;

  // isInteracting is true when plugin is active - this allows showing snap crosshair
  // during hover (before first click) and during drawing
  return {
    showStaticPoints: snapPoints?.showSnapPoints ?? false,
    cachedSnapPoints: arrows.cachedSnapPoints ?? [],
    snapPointsOpacity: snapPoints?.snapPointsOpacity ?? 50,
    currentSnapInfo: arrows.currentSnapInfo ?? null,
    isInteracting: state.activePlugin === 'arrows',
    mode: 'arrowSnap',
    handlesFeedbackInternally: true,
  };
}

const arrowsSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createArrowsPluginSlice(set as any, get as any, api as any) as ArrowsPluginSlice & ArrowsPluginActions;
  return {
    state: slice as unknown as Partial<CanvasStore>,
  };
};

// Global listener flags
let listenersInstalled = false;
let isCleaningUp = false;

const installListeners = (context: PluginContextFull<CanvasStore>, api: ArrowsPluginApi) => {
  if (listenersInstalled) return;
  listenersInstalled = true;

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    const currentState = context.store.getState() as unknown as ArrowsPluginSlice & CanvasStore;
    const canvasPoint = clientToCanvas(moveEvent.clientX, moveEvent.clientY, svg, currentState.viewport);

    const moveSnapInfo = getSnapResult(canvasPoint, currentState);

    if (currentState.arrows?.drawing?.isDrawing) {
      const finalMovePoint = moveSnapInfo?.point ?? canvasPoint;
      const effectiveShift = getEffectiveShift(moveEvent.shiftKey, currentState.isVirtualShiftActive);
      const pointToSet = (effectiveShift && currentState.arrows.drawing.startPoint)
        ? constrainToCardinalAndDiagonal(currentState.arrows.drawing.startPoint, finalMovePoint)
        : finalMovePoint;
      api.updateArrowDrawing(pointToSet, moveSnapInfo);
    }
  };

  // Click handler for finalizing the arrow (second click)
  const handleClick = async (clickEvent: MouseEvent) => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    const currentState = context.store.getState() as unknown as ArrowsPluginSlice & ArrowsPluginActions & CanvasStore;

    // Only handle if we're drawing
    if (!currentState.arrows?.drawing?.isDrawing) return;

    const canvasPoint = clientToCanvas(clickEvent.clientX, clickEvent.clientY, svg, currentState.viewport);

    const clickSnapInfo = getSnapResult(canvasPoint, currentState);
    let finalPoint = clickSnapInfo?.point ?? canvasPoint;

    const effectiveShift = getEffectiveShift(clickEvent.shiftKey, currentState.isVirtualShiftActive);
    if (effectiveShift && currentState.arrows?.drawing?.startPoint) {
      finalPoint = constrainToCardinalAndDiagonal(currentState.arrows.drawing.startPoint, finalPoint);
    }

    // Check if we have moved enough from start point to create an arrow
    const startPoint = currentState.arrows.drawing.startPoint;
    if (startPoint) {
      const dist = Math.sqrt(
        Math.pow(finalPoint.x - startPoint.x, 2) +
        Math.pow(finalPoint.y - startPoint.y, 2)
      );

      // Only finalize if we've moved at least 5 pixels
      if (dist < 5) return;
    }

    api.updateArrowDrawing(finalPoint, clickSnapInfo);

    // Finalize and create the arrow element
    const drawingResult = api.finalizeArrowDrawing();

    if (drawingResult && drawingResult.startPoint && drawingResult.endPoint) {
      const config = currentState.arrows.config;
      const strokeColor = currentState.settings?.defaultStrokeColor ?? '#000000';
      const strokeWidth = currentState.style?.strokeWidth ?? 2;
      const fillColor = currentState.style?.fillColor ?? 'none';
      const precision = currentState.settings?.keyboardMovementPrecision ?? 1;

      // Calculate obstacles for final arrow generation
      performance.mark('arrows-obstacles-start');
      const obstacles: Bounds[] = config.avoidObstacles
        ? currentState.elements
          .filter(el => el.type === 'path')
          .map(el => {
            const pathData = el.data as PathData;
            return measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, currentState.viewport.zoom);
          })
          .filter((bounds): bounds is NonNullable<typeof bounds> => bounds !== null)
        : [];
      performance.mark('arrows-obstacles-end');
      performance.measure('arrows-obstacles', 'arrows-obstacles-start', 'arrows-obstacles-end');

      // Generate arrow components as separate paths (with obstacle avoidance)
      performance.mark('arrows-generate-start');
      const components = await generateArrowComponents(
        drawingResult.startPoint,
        drawingResult.endPoint,
        config,
        strokeColor,
        strokeWidth,
        fillColor,
        precision,
        obstacles
      );
      performance.mark('arrows-generate-end');
      performance.measure('arrows-generate', 'arrows-generate-start', 'arrows-generate-end');

      if (components.length === 1) {
        currentState.addElement({
          type: 'path',
          data: components[0].pathData,
        });
      } else if (components.length > 1) {
        const createdIds: string[] = [];

        for (const component of components) {
          const elementId = currentState.addElement({
            type: 'path',
            data: component.pathData,
          });
          createdIds.push(elementId);
        }

        if (createdIds.length > 1) {
          currentState.selectElements(createdIds);
          currentState.createGroupFromSelection?.('Arrow');
        }
      }
    }

    // Cleanup listeners after creating arrow
    cleanupListeners();
  };

  let cleanupPointerMove: (() => void) | null = null;
  let cleanupClick: (() => void) | null = null;
  let clickTimeout: ReturnType<typeof setTimeout> | null = null;

  const cleanupListeners = () => {
    if (isCleaningUp) return;
    isCleaningUp = true;

    if (cleanupPointerMove) cleanupPointerMove();
    if (cleanupClick) cleanupClick();
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }
    listenersInstalled = false;
    isCleaningUp = false;
  };

  // Install pointermove listener and auto-unmount when plugin changes
  cleanupPointerMove = installGlobalPluginListeners(context, [
    { event: 'pointermove', handler: handlePointerMove },
  ], (state) => (state as unknown as CanvasStore).activePlugin !== 'arrows');

  // Use click instead of pointerup for second click finalization
  // Small delay to prevent the initial click from immediately triggering
  clickTimeout = setTimeout(() => {
    cleanupClick = installGlobalPluginListeners(context, [
      { event: 'click', handler: (e: MouseEvent) => { void handleClick(e); } },
    ], (state) => (state as unknown as CanvasStore).activePlugin !== 'arrows');
  }, 50);

  // Keep a reference to a combined cleanup so the code that previously called the
  // store subscription can still call stopStoreSubscription() to cleanup immediately.
  // stopStoreSubscription = () => {
  //   cleanupListeners();
  // };
};

// Helper to get snap result
function getSnapResult(point: Point, state: ArrowsPluginSlice & CanvasStore): SnapInfo | null {
  return getPluginSnapResult(
    point,
    state.viewport,
    state.activePlugin || '',
    state.selectedIds ?? [],
    state.arrows?.enableSnapping ?? false
  ) as SnapInfo | null;
}

 
export const arrowsPlugin: PluginDefinition<CanvasStore> = {
  id: 'arrows',
  metadata: {
    label: 'Arrows',
    icon: MoveRight,
    cursor: 'crosshair',
  },
  toolDefinition: { order: 25, visibility: 'always-shown', toolGroup: 'advanced' },
  behaviorFlags: () => ({
    usesMeasureSnap: true, // Use same snap system as measure
    hideSelectionOverlay: true,
    getSnapOverlayConfig: getArrowsSnapOverlayConfig,
  }),

  // Register ArrowsSnapSource with the centralized snap manager
  init: (context: PluginContextFull<CanvasStore>) => {
    const arrowsSnapSource = new ArrowsSnapSource(context.store);
    snapManager.registerSource(arrowsSnapSource);
    registerSnapProvider({
      pluginId: 'arrows',
      priority: 85,
      isActive: (state) => (state as CanvasStore).activePlugin === 'arrows',
      getOverlayConfig: (state) => {
        const s = state as CanvasStore & ArrowsPluginSlice;
        const snapPoints = s.snapPoints;
        const arrows = s.arrows;
        if (!arrows) return null;
        return {
          showStaticPoints: snapPoints?.showSnapPoints ?? false,
          cachedSnapPoints: arrows.cachedSnapPoints ?? [],
          snapPointsOpacity: snapPoints?.snapPointsOpacity ?? 50,
          currentSnapInfo: arrows.currentSnapInfo ?? null,
          isInteracting: s.activePlugin === 'arrows',
          mode: 'arrowSnap',
          handlesFeedbackInternally: true,
        };
      },
    });

    registerDragHandler({
      pluginId: 'arrows',
      type: 'drawing',
      priority: 80,
      canHandle: (state) => Boolean((state as CanvasStore & ArrowsPluginSlice).arrows?.drawing?.isDrawing),
      getContext: (state) => {
        const s = state as CanvasStore & ArrowsPluginSlice;
        const drawing = s.arrows?.drawing;
        if (!drawing?.isDrawing) return null;
        return {
          pluginId: 'arrows',
          type: 'drawing',
          isDragging: true,
          elementIds: [],
          startPosition: drawing.startPoint,
          currentPosition: drawing.endPoint,
          metadata: {
            drawing,
          },
        };
      },
    });

    // Initialize slice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.store.setState(createArrowsPluginSlice(context.store.setState as any, context.store.getState as any, context.store as any));

    // Hover listener for showing snap crosshair before first click
    let hoverCleanup: (() => void) | null = null;

    const setupHoverListener = () => {
      if (hoverCleanup) return; // Already set up

      const handleHoverMove = (moveEvent: PointerEvent) => {
        const svg = document.querySelector('svg');
        if (!svg) return;

        const currentState = context.store.getState() as unknown as ArrowsPluginSlice & CanvasStore;

        // Only handle hover when plugin is active but no drawing in progress
        if (currentState.activePlugin !== 'arrows') return;
        if (currentState.arrows?.drawing?.isDrawing) return;

        const canvasPoint = clientToCanvas(moveEvent.clientX, moveEvent.clientY, svg, currentState.viewport);
        const hoverSnapInfo = getSnapResult(canvasPoint, currentState);

        // Only update if snap info actually changed (avoid unnecessary state updates)
        const currentSnapInfo = currentState.arrows?.currentSnapInfo;
        const snapChanged =
          (hoverSnapInfo === null && currentSnapInfo !== null) ||
          (hoverSnapInfo !== null && currentSnapInfo === null) ||
          (hoverSnapInfo && currentSnapInfo && (
            hoverSnapInfo.point.x !== currentSnapInfo.point.x ||
            hoverSnapInfo.point.y !== currentSnapInfo.point.y
          ));

        if (snapChanged) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (context.store.getState() as any).updateArrowsState?.({
            currentSnapInfo: hoverSnapInfo ?? null,
          });
        }
      };

      hoverCleanup = installGlobalPluginListeners(context, [
        { event: 'pointermove', handler: handleHoverMove },
      ], (state) => (state as unknown as CanvasStore).activePlugin !== 'arrows');
    };

    // Set up hover listener when mode enters
    let previousPlugin: string | null = null;
    const unsubscribe = context.store.subscribe((state) => {
      const currentState = state as unknown as CanvasStore;
      const currentPlugin = currentState.activePlugin;

      // Only react to actual plugin changes
      if (currentPlugin === previousPlugin) return;
      previousPlugin = currentPlugin;

      if (currentPlugin === 'arrows') {
        setupHoverListener();
      } else {
        // Clean up hover listener when leaving arrows mode
        if (hoverCleanup) {
          hoverCleanup();
          hoverCleanup = null;
        }
        // Also clear currentSnapInfo when leaving the mode (only if it's set)
        const arrowsState = state as unknown as ArrowsPluginSlice;
        if (arrowsState.arrows?.currentSnapInfo != null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (context.store.getState() as any).updateArrowsState?.({
            currentSnapInfo: null,
          });
        }
      }
    });

    // Initial setup if already in arrows mode
    const initialState = context.store.getState() as unknown as CanvasStore;
    if (initialState.activePlugin === 'arrows') {
      setupHoverListener();
    }

    // Return cleanup function
    return () => {
      snapManager.unregisterSource(arrowsSnapSource.id);
      unregisterSnapProvider('arrows');
      unregisterDragHandler('arrows');
      unsubscribe();
      if (hoverCleanup) {
        hoverCleanup();
      }
    };
  },

  registerHelpers: () => ({
    getSnapOverlayConfig: getArrowsSnapOverlayConfig,
  }),

  handler: (_event: ReactPointerEvent, point: Point, _target: Element, context: PluginContextFull<CanvasStore>) => {
    const api = context.api as unknown as ArrowsPluginApi;
    const state = context.store.getState() as unknown as ArrowsPluginSlice & CanvasStore;

    // Snap to existing points if enabled
    const snapInfo = getSnapResult(point, state);
    const finalPoint = snapInfo?.point ?? point;

    // If already drawing, this is handled by the global listeners
    if (state.arrows?.drawing?.isDrawing) {
      return;
    }

    // Start a new arrow drawing
    api.startArrowDrawing(finalPoint, snapInfo);
    installListeners(context, api);
  },

  keyboardShortcuts: {
    Escape: (_event, { store }) => {
      const state = store.getState() as unknown as ArrowsPluginSlice & ArrowsPluginActions;
      state.cancelArrowDrawing?.();
    },
  },

  canvasLayers: [
    {
      id: 'arrows-cache-init',
      placement: 'background',
      render: (context) => {
        // Only initialize cache when in arrows mode
        if (context.activePlugin !== 'arrows') {
          return null;
        }
        return <SnapPointsCache />;
      },
    },
    {
      id: 'arrows-overlay',
      placement: 'foreground',
      render: (context) => {
        const ArrowsOverlayWrapper = () => {
          const arrowsState = useCanvasStore(state => (state as CanvasStore & ArrowsPluginSlice).arrows);
          const defaultStrokeColor = useCanvasStore(state => state.settings.defaultStrokeColor);
          const defaultStrokeWidth = useCanvasStore(state => state.style?.strokeWidth ?? 2);
          const precision = useCanvasStore(state => state.settings?.keyboardMovementPrecision ?? 1);
          const elements = useCanvasStore(state => state.elements);
          const { activePlugin, viewport } = context;

          // Memoize canvasSize
          const canvasSize = useMemo(() => ({
            width: window.innerWidth,
            height: window.innerHeight
          }), []);

          // Calculate obstacles when avoidObstacles is enabled
          const obstacles: Bounds[] = useMemo(() => {
            if (!arrowsState?.config?.avoidObstacles) {
              return [];
            }
            return elements
              .filter(el => el.type === 'path')
              .map(el => {
                const pathData = el.data as PathData;
                return measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, viewport.zoom);
              })
              .filter((bounds): bounds is NonNullable<typeof bounds> => bounds !== null);
          }, [arrowsState?.config?.avoidObstacles, elements, viewport.zoom]);

          if (activePlugin !== 'arrows') {
            return null;
          }

          // Get snap feedback from currentSnapInfo (for both hover and drawing states)
          const currentSnapInfo = arrowsState?.currentSnapInfo;
          const snapFeedback = currentSnapInfo ? {
            message: getSnapPointLabel(currentSnapInfo.type),
            visible: true
          } : undefined;

          // Show feedback overlay during hover (before first click) when hovering over snap point
          if (!arrowsState?.drawing?.isDrawing) {
            if (currentSnapInfo) {
              const snapPoint = currentSnapInfo.point;
              return (
                <FeedbackOverlay
                  viewport={viewport}
                  canvasSize={canvasSize}
                  pointPositionFeedback={{ x: Math.round(snapPoint.x), y: Math.round(snapPoint.y), visible: true }}
                  customFeedback={snapFeedback}
                />
              );
            }
            return null;
          }

          // Get current endpoint for mouse position display (during drawing)
          const endPoint = arrowsState.drawing.endPoint;
          const mouseX = endPoint ? Math.round(endPoint.x) : 0;
          const mouseY = endPoint ? Math.round(endPoint.y) : 0;

          return (
            <>
              <ArrowsOverlay
                startPoint={arrowsState.drawing.startPoint}
                endPoint={arrowsState.drawing.endPoint}
                config={arrowsState.config}
                color={defaultStrokeColor}
                strokeWidth={defaultStrokeWidth}
                viewport={viewport}
                precision={precision}
                obstacles={obstacles}
              />
              <FeedbackOverlay
                viewport={viewport}
                canvasSize={canvasSize}
                pointPositionFeedback={{ x: mouseX, y: mouseY, visible: true }}
                customFeedback={snapFeedback}
              />
            </>
          );
        };

        return <ArrowsOverlayWrapper />;
      },
    },
  ],

  slices: [arrowsSliceFactory],

  createApi: ({ store }) => ({
    startArrowDrawing: (point: Point, snapInfo?: SnapInfo | null) => {
      const state = store.getState() as unknown as ArrowsPluginSlice & ArrowsPluginActions;
      state.startArrowDrawing?.(point, snapInfo);
    },
    updateArrowDrawing: (point: Point, snapInfo?: SnapInfo | null) => {
      const state = store.getState() as unknown as ArrowsPluginSlice & ArrowsPluginActions;
      state.updateArrowDrawing?.(point, snapInfo);
    },
    finalizeArrowDrawing: () => {
      const state = store.getState() as unknown as ArrowsPluginSlice & ArrowsPluginActions;
      return state.finalizeArrowDrawing?.() ?? null;
    },
    cancelArrowDrawing: () => {
      const state = store.getState() as unknown as ArrowsPluginSlice & ArrowsPluginActions;
      state.cancelArrowDrawing?.();
    },
  }),

  expandablePanel: () => React.createElement(ArrowsPanel, { hideTitle: true }),

  sidebarPanels: [createToolPanel('arrows', ArrowsPanel)],
};


import React, { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useShallow } from 'zustand/react/shallow';
import type { CanvasElement, Point } from '../types';
import type { CanvasRenderContext } from './renderers';
import type { CanvasLayerContext, RendererOverrides } from '../types/plugins';
import { selectAnimations, selectAnimationState, selectMasks, selectWireframe } from './pluginStateSelectors';
import { useCanvasKeyboardControls } from './hooks/useCanvasKeyboardControls';
import { useSelectionController } from './hooks/useSelectionController';
import { useCanvasControllerActions, useCanvasControllerData } from './controller/CanvasControllerContext';
import { CanvasControllerProvider } from './controller/CanvasControllerProvider';
import { CanvasEventBusProvider, useCanvasEventBus } from './CanvasEventBusContext';
import { useDynamicCanvasSize } from './hooks/useDynamicCanvasSize';
import { useCanvasEventBusManager } from './hooks/useCanvasEventBusManager';
import { canvasRendererRegistry } from './renderers';
import { useCanvasGeometry } from './hooks/useCanvasGeometry';
import { useViewportController } from './hooks/useViewportController';
import { useCanvasModeController } from './hooks/useCanvasModeController';
import { useCanvasStore, canvasStoreApi } from '../store/canvasStore';
import { useCanvasDecorators } from './hooks/useCanvasDecorators';
import { pluginManager } from '../utils/pluginManager';
import { CanvasInteractionManager } from './components/CanvasInteractionManager';
import { CanvasRenderer } from './components/CanvasRenderer';
import { CanvasEffectManager } from './components/CanvasEffectManager';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';

/** Stable empty arrays to avoid creating new references on every render when values are nullish */
const EMPTY_COMMANDS: never[] = [];
const EMPTY_SUBPATHS: never[] = [];

const CanvasContent: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { colorMode } = useColorMode();
  const { isSpacePressed } = useCanvasKeyboardControls();
  const eventBus = useCanvasEventBus();

  const {
    isSelecting,
    selectionStart,
    selectionEnd,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    cancelSelection,
  } = useSelectionController();

  const controllerData = useCanvasControllerData();
  const controllerActions = useCanvasControllerActions();
  const {
    scaleStrokeWithZoom,
    isPathInteractionDisabled,
    pathCursorMode,
    settings,
    hiddenElementIds,
    lockedElementIds,
    sidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
    leftSidebarWidth,
    isLeftSidebarPinned,
    isLeftSidebarOpen,
  } = useCanvasStore(
    useShallow((state) => ({
      scaleStrokeWithZoom: state.settings.scaleStrokeWithZoom,
      isPathInteractionDisabled: state.isPathInteractionDisabled,
      pathCursorMode: state.pathCursorMode,
      settings: state.settings,
      hiddenElementIds: state.hiddenElementIds,
      lockedElementIds: state.lockedElementIds,
      sidebarWidth: state.sidebarWidth,
      isSidebarPinned: state.isSidebarPinned,
      isSidebarOpen: state.isSidebarOpen,
      leftSidebarWidth: state.leftSidebarWidth,
      isLeftSidebarPinned: state.isLeftSidebarPinned,
      isLeftSidebarOpen: state.isLeftSidebarOpen,
    }))
  );

  const { visibleDecorators, decoratorOffset, hasDecorators } = useCanvasDecorators();
  const { currentMode, transition } = useCanvasModeController();
  const { viewport, screenToCanvas: mapScreenPointToCanvas, getViewBoxString } = useViewportController();

  const {
    elements,
    sortedElements,
    elementMap,
    selectedIds,
    selectedCommands,
    selectedSubpaths,
  } = controllerData;
  const {
    updateElement,
    stopDraggingPoint,
    isWorkingWithSubpaths,
    getControlPointInfo,
    saveAsPng,
    isElementHidden: isElementHiddenFromStore,
    isElementLocked: isElementLockedFromStore,
    moveSelectedElements,
    moveSelectedSubpaths,
  } = controllerActions;
  const controller = useMemo(
    () => ({
      ...controllerData,
      ...controllerActions,
    }),
    [controllerData, controllerActions]
  );

  const animations = useCanvasStore(useShallow(selectAnimations));
  const animationState = useCanvasStore(selectAnimationState);
  const masks = useCanvasStore(useShallow(selectMasks));
  const maskVersions = useMemo(() => {
    const versions = new Map<string, number>();
    masks.forEach((mask) => {
      if (mask.version !== undefined && mask.version > 0) {
        versions.set(mask.id, mask.version);
      }
    });
    return versions;
  }, [masks]);
  const rendererExtensionsContext = useMemo(
    () => ({
      animations,
      animationState,
      maskVersions,
    }),
    [animations, animationState, maskVersions]
  );

  const animationCurrentTime = animationState?.currentTime ?? 0;
  const animationIsPlaying = animationState?.isPlaying ?? false;
  const animationRestartKey = animationState?.restartKey ?? 0;

  const rendererOverridesCacheRef = useRef<RendererOverrides>({});
  const lastActivePluginRef = useRef<string | null>(null);
  const lastColorModeRef = useRef<'light' | 'dark' | undefined>(undefined);
  const lastWireframeKeyRef = useRef<string>('');

  const rendererOverrides = useSyncExternalStore(
    canvasStoreApi.subscribe,
    () => {
      const currentState = canvasStoreApi.getState();
      const currentActivePlugin = currentState.activePlugin;
      // Wireframe is the only renderBehavior plugin; track its config to avoid full-state comparison
      const wf = selectWireframe(currentState);
      const wireframeKey = wf ? `${wf.enabled}|${wf.removeFill}` : '';

      if (
        currentActivePlugin === lastActivePluginRef.current &&
        lastColorModeRef.current === colorMode &&
        wireframeKey === lastWireframeKeyRef.current
      ) {
        return rendererOverridesCacheRef.current;
      }

      lastActivePluginRef.current = currentActivePlugin;
      lastColorModeRef.current = colorMode;
      lastWireframeKeyRef.current = wireframeKey;
      rendererOverridesCacheRef.current = pluginManager.getRendererOverrides({ colorMode });
      return rendererOverridesCacheRef.current;
    },
    () => rendererOverridesCacheRef.current
  );

  const rawCanvasSize = useDynamicCanvasSize();
  const viewportInsets = useMemo(() => {
    const left = settings.showLeftSidebar && (isLeftSidebarPinned || isLeftSidebarOpen) ? leftSidebarWidth : 0;
    const right = (isSidebarPinned || isSidebarOpen) ? sidebarWidth : 0;
    return { left, right };
  }, [
    settings.showLeftSidebar,
    isLeftSidebarPinned,
    isLeftSidebarOpen,
    leftSidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
    sidebarWidth,
  ]);

  const viewportSize = useMemo(() => ({
    width: Math.max(1, rawCanvasSize.width - viewportInsets.left - viewportInsets.right),
    height: rawCanvasSize.height,
  }), [rawCanvasSize, viewportInsets.left, viewportInsets.right]);

  const canvasSize = useMemo(() => ({
    width: Math.max(1, viewportSize.width - (hasDecorators ? decoratorOffset.width : 0)),
    height: Math.max(1, viewportSize.height - (hasDecorators ? decoratorOffset.height : 0)),
  }), [viewportSize, hasDecorators, decoratorOffset]);

  const setCanvasSizeInStore = useCanvasStore((state) => state.setCanvasSize);

  const dragSelectionCallbacks = useMemo(() => ({
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    cancelSelection,
  }), [beginSelectionRectangle, updateSelectionRectangle, completeSelectionRectangle, cancelSelection]);

  const movementCallbacks = useMemo(() => ({
    moveSelectedElements,
    moveSelectedSubpaths,
    isWorkingWithSubpaths,
  }), [moveSelectedElements, moveSelectedSubpaths, isWorkingWithSubpaths]);

  const elementCallbacksObj = useMemo(() => ({
    stopDraggingPoint,
    updateElement,
    getControlPointInfo,
  }), [stopDraggingPoint, updateElement, getControlPointInfo]);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => mapScreenPointToCanvas(svgRef.current, screenX, screenY),
    [mapScreenPointToCanvas]
  );

  const hiddenElementIdSet = useMemo(() => new Set(hiddenElementIds), [hiddenElementIds]);
  const lockedElementIdSet = useMemo(() => new Set(lockedElementIds), [lockedElementIds]);

  const isElementHidden = useCallback(
    (elementId: string) => hiddenElementIdSet.has(elementId) || isElementHiddenFromStore(elementId),
    [hiddenElementIdSet, isElementHiddenFromStore]
  );

  const isElementLocked = useCallback(
    (elementId: string) => lockedElementIdSet.has(elementId) || isElementLockedFromStore(elementId),
    [lockedElementIdSet, isElementLockedFromStore]
  );

  const { getElementBounds, selectedGroupBounds } = useCanvasGeometry({
    elementMap,
    viewport,
    selectedIds,
    isElementHidden,
  });

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const isElementSelected = useCallback(
    (elementId: string) => selectedIdSet.has(elementId),
    [selectedIdSet]
  );

  return (
    <>
      <CanvasEffectManager
        svgRef={svgRef}
        eventBus={eventBus}
        currentMode={currentMode}
        transition={transition}
        animationIsPlaying={animationIsPlaying}
        animationCurrentTime={animationCurrentTime}
        animationRestartKey={animationRestartKey}
        setCanvasSize={setCanvasSizeInStore}
        canvasSize={canvasSize}
        selectedCommands={selectedCommands ?? EMPTY_COMMANDS}
        elements={elements}
        saveAsPng={saveAsPng}
      />
      <CanvasInteractionManager
        svgRef={svgRef}
        eventBus={eventBus}
        currentMode={currentMode}
        isSpacePressed={isSpacePressed}
        viewport={viewport}
        elements={elements}
        selectedIds={selectedIds}
        selectedSubpaths={selectedSubpaths ?? EMPTY_SUBPATHS}
        isSelecting={isSelecting}
        dragSelection={dragSelectionCallbacks}
        movement={movementCallbacks}
        elementCallbacks={elementCallbacksObj}
        screenToCanvas={screenToCanvas}
      >
        {(interactionState) => {
          // Build renderContext — the "stable base" is memoised in Canvas
          // and only the interaction-dependent event handlers are merged here.
          const renderContext: CanvasRenderContext = {
            viewport,
            activePlugin: currentMode,
            scaleStrokeWithZoom,
            colorMode,
            rendererOverrides,
            isElementHidden,
            isElementLocked,
            isElementSelected,
            isSelecting,
            isPathInteractionDisabled,
            pathCursorMode,
            animations,
            animationState,
            extensionsContext: rendererExtensionsContext,
            elementMap,
            eventHandlers: interactionState.elementEventHandlers,
          };

          const renderElement = (element: CanvasElement) =>
            canvasRendererRegistry.render(element, renderContext);

          const canvasLayerContext: CanvasLayerContext = {
            ...controller,
            activePlugin: currentMode,
            canvasSize,
            isSelecting,
            selectionStart,
            selectionEnd,
            selectedGroupBounds,
            dragPosition: interactionState.dragPosition,
            isDragging: interactionState.isDragging,
            getElementBounds,
            handleSubpathDoubleClick: interactionState.handleSubpathDoubleClick,
            handleSubpathTouchEnd: interactionState.handleSubpathTouchEnd,
            setDragStart: interactionState.setDragStart,
            settings,
          };

          return (
            <CanvasRenderer
              svgRef={svgRef}
              screenToCanvas={screenToCanvas}
              emitPointerEvent={interactionState.emitPointerEvent}
              visibleDecorators={visibleDecorators}
              hasDecorators={hasDecorators}
              decoratorOffset={decoratorOffset}
              viewportInsets={viewportInsets}
              canvasSize={canvasSize}
              viewport={viewport}
              isSpacePressed={isSpacePressed}
              currentMode={currentMode}
              isPanMode={pluginManager.isInPanMode()}
              sortedElements={sortedElements}
              renderElement={renderElement}
              canvasLayerContext={canvasLayerContext}
              getViewBoxString={getViewBoxString}
              handlePointerDown={interactionState.handlePointerDown}
              handlePointerMove={interactionState.handlePointerMove}
              handlePointerUp={interactionState.handlePointerUp}
              handleCanvasDoubleClick={interactionState.handleCanvasDoubleClick}
              handleCanvasTouchEnd={interactionState.handleCanvasTouchEnd}
            />
          );
        }}
      </CanvasInteractionManager>
    </>
  );
};

export const Canvas: React.FC = () => {
  const eventBus = useCanvasEventBusManager();

  return (
    <CanvasEventBusProvider value={eventBus}>
      <CanvasControllerProvider>
        <CanvasErrorBoundary>
          <CanvasContent />
        </CanvasErrorBoundary>
      </CanvasControllerProvider>
    </CanvasEventBusProvider>
  );
};

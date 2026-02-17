import { useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { useCanvasControllerActions } from '../controller/CanvasControllerContext';
import type { ShortcutRegistry } from '../shortcuts';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { getDeletionScope, executeDeletion } from '../../utils/deletionScopeUtils';
import { getCanvasCenter, isTextFieldFocused } from '../../utils/domHelpers';
import { buildElementMap } from '../../utils/elementMapUtils';
import type { CanvasShortcutContext } from '../../types/plugins';
import { DEFAULT_MODE } from '../../constants';
import { getEffectiveShift } from '../../utils/effectiveShift';
import { pluginManager } from '../../utils/pluginManager';
import { getInterceptorsForShortcut } from '../shortcuts/shortcutInterceptorRegistry';
import { createShortcutContext } from '../shortcuts/shortcutContextFactory';
import { logger } from '../../utils/logger';

const CORE_SHORTCUT_SOURCE = 'canvas:core';
const ZOOM_SHORTCUT_FACTOR = 1.2;

const handleEscapeShortcut = (state: CanvasStore) => {
  if (state.showFilePanel) {
    state.setShowFilePanel(false);
    state.setActivePlugin(DEFAULT_MODE);
    return;
  }

  if (state.showSettingsPanel) {
    state.setShowSettingsPanel(false);
    state.setActivePlugin(DEFAULT_MODE);
    return;
  }

  // Plugin-specific escape handling moved to plugins

  if (state.activePlugin === DEFAULT_MODE && state.selectedIds.length > 0) {
    state.clearSelection();
    return;
  }

  state.setActivePlugin(DEFAULT_MODE);
};

const handleArrowKey = (event: KeyboardEvent, context: CanvasShortcutContext, dirX: number, dirY: number) => {
  const state = context.store.getState() as CanvasStore;

  // Don't move if typing
  if (isTextFieldFocused()) return;

  const { viewport, settings, selectedCommands, selectedSubpaths, selectedIds } = state;

  // Calculate zoom-adjusted movement delta (supports virtualShift for mobile)
  const effectiveShift = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);
  const baseDelta = effectiveShift ? 10 : 1;
  const zoomAdjustedDelta = viewport.zoom > 1 ? baseDelta / viewport.zoom : baseDelta;

  const deltaX = dirX * zoomAdjustedDelta;
  const deltaY = dirY * zoomAdjustedDelta;

  // Apply precision rounding
  const precision = settings.keyboardMovementPrecision;
  const roundedDeltaX = precision === 0 ? Math.round(deltaX) : parseFloat(deltaX.toFixed(precision));
  const roundedDeltaY = precision === 0 ? Math.round(deltaY) : parseFloat(deltaY.toFixed(precision));

  // Priority: points > subpaths > paths
  if ((selectedCommands?.length ?? 0) > 0 && state.moveSelectedPoints) {
    state.moveSelectedPoints(roundedDeltaX, roundedDeltaY);
  } else if ((selectedSubpaths?.length ?? 0) > 0 && state.moveSelectedSubpaths) {
    state.moveSelectedSubpaths(roundedDeltaX, roundedDeltaY);
  } else if (selectedIds.length > 0) {
    state.moveSelectedElements(roundedDeltaX, roundedDeltaY);
  }
};

const handleZoomShortcut = (direction: 'in' | 'out' | 'reset', context: CanvasShortcutContext) => {
  const state = context.store.getState() as CanvasStore;
  const center = getCanvasCenter(context.svg);

  switch (direction) {
    case 'in':
      state.zoom?.(ZOOM_SHORTCUT_FACTOR, center?.x, center?.y);
      break;
    case 'out':
      state.zoom?.(1 / ZOOM_SHORTCUT_FACTOR, center?.x, center?.y);
      break;
    case 'reset':
      state.resetZoom?.();
      break;
  }
};

const handleUndoRedo = (
  direction: 'undo' | 'redo',
  shortcut: string,
  _event: KeyboardEvent,
  context: CanvasShortcutContext
) => {
  const state = context.store.getState() as CanvasStore;

  const interceptors = getInterceptorsForShortcut(shortcut);
  for (const interceptor of interceptors) {
    try {
      if (interceptor.shouldHandle(state, shortcut)) {
        const handled = interceptor.handle(state, shortcut, context);
        if (handled) {
          return;
        }
      }
    } catch (error) {
      // Log interceptor errors in dev mode to aid debugging
      if (import.meta.env.DEV) {
        logger.warn('[useCanvasShortcuts] Interceptor error:', error);
      }
    }
  }

  if (pluginManager.isGlobalUndoRedoDisabled()) {
    return;
  }

  const temporal = useCanvasStore.temporal.getState();
  if (direction === 'undo') {
    if ((temporal.pastStates?.length ?? 0) > 0) {
      temporal.undo?.();
    }
    return;
  }

  if ((temporal.futureStates?.length ?? 0) > 0) {
    temporal.redo?.();
  }
};

const handleDeleteShortcut = (context: CanvasShortcutContext) => {
  const state = context.store.getState() as CanvasStore;
  const scope = getDeletionScope({
    selectedCommandsCount: state.selectedCommands?.length ?? 0,
    selectedSubpathsCount: state.selectedSubpaths?.length ?? 0,
    selectedElementsCount: state.selectedIds.length,
    activePlugin: state.activePlugin,
  }, false);

  executeDeletion(scope, {
    deleteSelectedCommands: state.deleteSelectedCommands,
    deleteSelectedSubpaths: state.deleteSelectedSubpaths,
    deleteSelectedElements: state.deleteSelectedElements,
  });
};

const handleSelectAllShortcut = (event: KeyboardEvent, context: CanvasShortcutContext) => {
  event.preventDefault();
  const state = context.store.getState() as CanvasStore;
  state.selectAllElements();
};

const handleGroupToggleShortcut = (context: CanvasShortcutContext) => {
  const state = context.store.getState() as CanvasStore;
  const selectedIds = state.selectedIds;

  if (selectedIds.length === 1) {
    const elementMap = buildElementMap(state.elements);
    const selectedElement = elementMap.get(selectedIds[0]);
    if (selectedElement?.type === 'group') {
      state.ungroupSelectedGroups();
    }
    return;
  }

  if (selectedIds.length > 1) {
    state.createGroupFromSelection();
  }
};

export const useCanvasShortcuts = (
  registry: ShortcutRegistry,
  svgRef?: RefObject<SVGSVGElement | null>
) => {
  const eventBus = useCanvasEventBus();
  const controllerActions = useCanvasControllerActions();

  const storeApi = useMemo(
    () => ({
      getState: useCanvasStore.getState,
      subscribe: useCanvasStore.subscribe,
    }),
    []
  );

  useEffect(() => {
    registry.mount(window);

    const unregisterCoreShortcuts = registry.register(CORE_SHORTCUT_SOURCE, {
      Escape: {
        handler: (_event, context) => {
          const state = context.store.getState() as CanvasStore;
          handleEscapeShortcut(state);
        },
      },
      Delete: {
        handler: (_event, context) => handleDeleteShortcut(context),
        options: { preventDefault: true }
      },
      Backspace: {
        handler: (_event, context) => handleDeleteShortcut(context),
        options: { preventDefault: true }
      },
      ArrowUp: {
        handler: (event, context) => handleArrowKey(event, context, 0, -1),
        options: { preventDefault: true }
      },
      ArrowDown: {
        handler: (event, context) => handleArrowKey(event, context, 0, 1),
        options: { preventDefault: true }
      },
      ArrowLeft: {
        handler: (event, context) => handleArrowKey(event, context, -1, 0),
        options: { preventDefault: true }
      },
      ArrowRight: {
        handler: (event, context) => handleArrowKey(event, context, 1, 0),
        options: { preventDefault: true }
      },
      // Shift+Arrow for faster movement (10px instead of 1px)
      'shift+ArrowUp': {
        handler: (event, context) => handleArrowKey(event, context, 0, -1),
        options: { preventDefault: true }
      },
      'shift+ArrowDown': {
        handler: (event, context) => handleArrowKey(event, context, 0, 1),
        options: { preventDefault: true }
      },
      'shift+ArrowLeft': {
        handler: (event, context) => handleArrowKey(event, context, -1, 0),
        options: { preventDefault: true }
      },
      'shift+ArrowRight': {
        handler: (event, context) => handleArrowKey(event, context, 1, 0),
        options: { preventDefault: true }
      },
      'ctrl+=': {
        handler: (_event, context) => handleZoomShortcut('in', context),
      },
      'ctrl+plus': {
        handler: (_event, context) => handleZoomShortcut('in', context),
      },
      'ctrl+shift+plus': {
        handler: (_event, context) => handleZoomShortcut('in', context),
      },
      'ctrl+-': {
        handler: (_event, context) => handleZoomShortcut('out', context),
      },
      'ctrl+0': {
        handler: (_event, context) => handleZoomShortcut('reset', context),
      },
      'meta+z': {
        handler: (event, context) => handleUndoRedo('undo', 'meta+z', event, context),
      },
      'ctrl+z': {
        handler: (event, context) => handleUndoRedo('undo', 'ctrl+z', event, context),
      },
      'meta+shift+z': {
        handler: (event, context) => handleUndoRedo('redo', 'meta+shift+z', event, context),
      },
      'ctrl+shift+z': {
        handler: (event, context) => handleUndoRedo('redo', 'ctrl+shift+z', event, context),
      },
      'ctrl+a': {
        handler: (event, context) => handleSelectAllShortcut(event, context),
        options: { preventDefault: true }
      },
      'meta+a': {
        handler: (event, context) => handleSelectAllShortcut(event, context),
        options: { preventDefault: true }
      },
      g: {
        handler: (_event, context) => handleGroupToggleShortcut(context),
      },
    });

    return () => {
      unregisterCoreShortcuts();
      registry.unmount();
      registry.setContext(null);
    };
  }, [registry, storeApi]);

  useEffect(() => {
    registry.setContext(
      createShortcutContext(eventBus, controllerActions, storeApi, svgRef?.current ?? null)
    );
  }, [registry, eventBus, controllerActions, storeApi, svgRef]);
};

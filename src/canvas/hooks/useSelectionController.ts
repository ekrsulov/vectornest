import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../../store/canvasStore';
import { completeSelection, type SelectionCallbacks } from '../interactions/SelectionStrategyController';
import type { Point } from '../../types';
import { mergeUniqueByKey } from '../../utils/coreHelpers';
import type { SelectionData } from '../selection/SelectionStrategy';
import { DEFAULT_SELECTION_STRATEGY } from '../../constants';
import { pluginManager } from '../../utils/pluginManager';
import { buildElementMap } from '../../utils/elementMapUtils';
import { selectActiveSelectionStrategy } from '../pluginStateSelectors';
import { useModifierKeys } from './useModifierKeys';

export interface SelectionControllerState {
  isShiftPressed: boolean;
  isCtrlPressed: boolean;
  isMultiSelectActive: boolean;
}

export interface UseSelectionControllerResult {
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  beginSelectionRectangle: (point: Point, shouldClearCommands?: boolean, shouldClearSubpaths?: boolean) => void;
  updateSelectionRectangle: (point: Point) => void;
  completeSelectionRectangle: () => void;
  selectElement: (elementId: string, toggle: boolean) => void;
  toggleSelection: (elementId: string) => void;
  clearSelection: () => void;
  cancelSelection: () => void;
  modifiers: SelectionControllerState;
}

export const useSelectionController = (): UseSelectionControllerResult => {
  const {
    activePlugin,
    clearSelectedCommands,
    clearSubpathSelection,
    setSelectionPath,
    clearSelectionPath,
    selectElement: selectElementAction,
    clearSelection: clearSelectionAction
  } = useCanvasStore(
    useShallow((state) => ({
      activePlugin: state.activePlugin,
      clearSelectedCommands: state.clearSelectedCommands,
      clearSubpathSelection: state.clearSubpathSelection,
      setSelectionPath: state.setSelectionPath,
      clearSelectionPath: state.clearSelectionPath,
      selectElement: state.selectElement,
      clearSelection: state.clearSelection,
    }))
  );

  // --- Selection Modifiers State (uses consolidated useModifierKeys hook) ---
  const modifierKeys = useModifierKeys();

  const modifiers: SelectionControllerState = useMemo(() => ({
    isShiftPressed: modifierKeys.isShiftPressed,
    isCtrlPressed: modifierKeys.isCtrlPressed || modifierKeys.isMetaPressed,
    isMultiSelectActive: modifierKeys.isMultiSelectActive,
  }), [modifierKeys]);

  // --- Pointer Selection State ---
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);

  const isShiftPressed = modifiers.isShiftPressed || modifiers.isCtrlPressed;

  // --- Selection Strategy Controller ---
  const callbacks: SelectionCallbacks = useMemo(() => ({
    selectCommands: (commands, isShift) => {
      if (isShift) {
        useCanvasStore.setState(state => {
          const unique = mergeUniqueByKey(
            state.selectedCommands ?? [],
            commands,
            (c) => `${c.elementId}-${c.commandIndex}-${c.pointIndex}`
          );
          return { selectedCommands: unique };
        });
      } else {
        useCanvasStore.setState({ selectedCommands: commands });
      }
    },
    selectSubpaths: (subpaths, isShift) => {
      if (isShift) {
        useCanvasStore.setState(state => {
          const unique = mergeUniqueByKey(
            state.selectedSubpaths ?? [],
            subpaths,
            (s) => `${s.elementId}-${s.subpathIndex}`
          );
          return { selectedSubpaths: unique };
        });
      } else {
        useCanvasStore.setState({ selectedSubpaths: subpaths });
      }
    },
    selectElements: (elementIds, isShift) => {
      if (isShift) {
        const currentSelectedIds = useCanvasStore.getState().selectedIds;
        const newSelectedIds = [...new Set([...currentSelectedIds, ...elementIds])];
        useCanvasStore.getState().selectElements(newSelectedIds);
      } else {
        useCanvasStore.getState().selectElements(elementIds);
      }
    }
  }), []);



  // --- Pointer Selection Actions ---
  const beginSelectionRectangle = useCallback((point: Point, shouldClearCommands = false, shouldClearSubpaths = false) => {
    setIsSelecting(true);
    setSelectionStart(point);
    setSelectionEnd(point);
    setSelectionPath([point]);

    if (shouldClearCommands) {
      clearSelectedCommands?.();
    }
    if (shouldClearSubpaths) {
      clearSubpathSelection?.();
    }
  }, [clearSelectedCommands, clearSubpathSelection, setSelectionPath]);

  const updateSelectionRectangle = useCallback((point: Point) => {
    if (isSelecting) {
      setSelectionEnd(point);
      useCanvasStore.setState((state) => ({
        selectionPath: [...state.selectionPath, point],
      }));
    }
  }, [isSelecting]);

  const completeSelectionRectangle = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd || !activePlugin) return;

    // Get current state
    const { elements, viewport, selectedIds, getFilteredEditablePoints } = useCanvasStore.getState();
    const lassoClosed = useCanvasStore.getState().lassoClosed ?? true;
    const selectionPath = useCanvasStore.getState().selectionPath;
    const elementMap = buildElementMap(elements);

    // Determine selection strategy ID
    const activeStrategyId = selectActiveSelectionStrategy(useCanvasStore.getState()) ?? DEFAULT_SELECTION_STRATEGY;

    // Get selection mode from active plugin's behavior flags
    const selectionMode = pluginManager.getActiveSelectionMode();

    // Build selection data
    const selectionData: SelectionData = {
      start: selectionStart,
      end: selectionEnd,
      path: selectionPath.length > 2 ? selectionPath : undefined,
      closed: lassoClosed,
    };

    // Handle selection using the strategy controller
    completeSelection(
      selectionData,
      activeStrategyId,
      selectionMode,
      elements,
      viewport.zoom,
      isShiftPressed,
      callbacks,
      selectedIds,
      getFilteredEditablePoints,
      elementMap
    );

    // Reset selection state
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    clearSelectionPath();
  }, [isSelecting, selectionStart, selectionEnd, activePlugin, isShiftPressed, callbacks, clearSelectionPath]);

  const cancelSelection = useCallback(() => {
    if (!isSelecting) return;

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    clearSelectionPath();
  }, [isSelecting, clearSelectionPath]);

  // --- Element Selection Actions ---
  const handleSelectElement = useCallback(
    (elementId: string, toggle: boolean) => {
      selectElementAction(elementId, toggle || modifiers.isMultiSelectActive);
    },
    [selectElementAction, modifiers.isMultiSelectActive]
  );

  const handleToggleSelection = useCallback(
    (elementId: string) => {
      selectElementAction(elementId, true);
    },
    [selectElementAction]
  );

  const handleClearSelection = useCallback(() => {
    if (useCanvasStore.getState().selectedIds.length > 0) {
      clearSelectionAction();
    }
  }, [clearSelectionAction]);

  return {
    isSelecting,
    selectionStart,
    selectionEnd,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    selectElement: handleSelectElement,
    toggleSelection: handleToggleSelection,
    clearSelection: handleClearSelection,
    cancelSelection,
    modifiers,
  };
};

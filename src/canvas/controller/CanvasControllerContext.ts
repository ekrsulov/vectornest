import { createContext, useContext, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';
import { buildElementMap } from '../../utils';

type CanvasControllerDataKeys =
  | 'elements'
  | 'viewport'
  | 'activePlugin'
  | 'selectedIds'
  | 'editingPoint'
  | 'selectedCommands'
  | 'selectedSubpaths'
  | 'draggingSelection';

type CanvasControllerActionKeys =
  | 'updateElement'
  | 'startDraggingPoint'
  | 'stopDraggingPoint'
  | 'emergencyCleanupDrag'
  | 'selectCommand'
  | 'selectSubpath'
  | 'isWorkingWithSubpaths'
  | 'getFilteredEditablePoints'
  | 'getControlPointInfo'
  | 'saveAsPng'
  | 'isElementHidden'
  | 'isElementLocked'
  | 'moveSelectedElements'
  | 'moveSelectedSubpaths'
  | 'selectElement'
  | 'setMode'
  | 'zoom';

export type CanvasControllerData = Pick<CanvasStore, CanvasControllerDataKeys> & {
  sortedElements: CanvasElement[];
  elementMap: Map<string, CanvasElement>;
};

export type CanvasControllerActions = Pick<CanvasStore, CanvasControllerActionKeys>;

export type CanvasControllerValue = CanvasControllerData & CanvasControllerActions;

export const CanvasControllerDataContext = createContext<CanvasControllerData | null>(null);
export const CanvasControllerActionsContext = createContext<CanvasControllerActions | null>(null);

// Keep legacy combined context for compatibility with existing consumers.
export const CanvasControllerContext = createContext<CanvasControllerValue | null>(null);

export const useCanvasControllerDataSource = (): CanvasControllerData => {
  const data = useCanvasStore(
    useShallow((store) => ({
      elements: store.elements,
      viewport: store.viewport,
      activePlugin: store.activePlugin,
      selectedIds: store.selectedIds,
      editingPoint: store.editingPoint,
      selectedCommands: store.selectedCommands,
      selectedSubpaths: store.selectedSubpaths,
      draggingSelection: store.draggingSelection,
    }))
  );

  const sortedElements = useMemo(() => {
    return [...data.elements].sort((a, b) => a.zIndex - b.zIndex);
  }, [data.elements]);

  const elementMap = useMemo(() => buildElementMap(data.elements), [data.elements]);

  return useMemo(
    () => ({
      ...data,
      sortedElements,
      elementMap,
    }),
    [data, sortedElements, elementMap]
  );
};

export const useCanvasControllerActionsSource = (): CanvasControllerActions => {
  return useCanvasStore(
    useShallow((store) => ({
      updateElement: store.updateElement,
      startDraggingPoint: store.startDraggingPoint,
      stopDraggingPoint: store.stopDraggingPoint,
      emergencyCleanupDrag: store.emergencyCleanupDrag,
      selectCommand: store.selectCommand,
      selectSubpath: store.selectSubpath,
      isWorkingWithSubpaths: store.isWorkingWithSubpaths,
      getFilteredEditablePoints: store.getFilteredEditablePoints,
      getControlPointInfo: store.getControlPointInfo,
      saveAsPng: store.saveAsPng,
      isElementHidden: store.isElementHidden,
      isElementLocked: store.isElementLocked,
      moveSelectedElements: store.moveSelectedElements,
      moveSelectedSubpaths: store.moveSelectedSubpaths,
      selectElement: store.selectElement,
      setMode: store.setMode,
      zoom: store.zoom,
    }))
  );
};

export const splitCanvasControllerValue = (
  value: CanvasControllerValue
): {
  data: CanvasControllerData;
  actions: CanvasControllerActions;
} => ({
  data: {
    elements: value.elements,
    viewport: value.viewport,
    activePlugin: value.activePlugin,
    selectedIds: value.selectedIds,
    editingPoint: value.editingPoint,
    selectedCommands: value.selectedCommands,
    selectedSubpaths: value.selectedSubpaths,
    draggingSelection: value.draggingSelection,
    sortedElements: value.sortedElements,
    elementMap: value.elementMap,
  },
  actions: {
    updateElement: value.updateElement,
    startDraggingPoint: value.startDraggingPoint,
    stopDraggingPoint: value.stopDraggingPoint,
    emergencyCleanupDrag: value.emergencyCleanupDrag,
    selectCommand: value.selectCommand,
    selectSubpath: value.selectSubpath,
    isWorkingWithSubpaths: value.isWorkingWithSubpaths,
    getFilteredEditablePoints: value.getFilteredEditablePoints,
    getControlPointInfo: value.getControlPointInfo,
    saveAsPng: value.saveAsPng,
    isElementHidden: value.isElementHidden,
    isElementLocked: value.isElementLocked,
    moveSelectedElements: value.moveSelectedElements,
    moveSelectedSubpaths: value.moveSelectedSubpaths,
    selectElement: value.selectElement,
    setMode: value.setMode,
    zoom: value.zoom,
  },
});

export const useCanvasControllerSource = (): CanvasControllerValue => {
  const data = useCanvasControllerDataSource();
  const actions = useCanvasControllerActionsSource();

  return useMemo(
    () => ({
      ...data,
      ...actions,
    }),
    [data, actions]
  );
};

export const useCanvasControllerData = (): CanvasControllerData => {
  const data = useContext(CanvasControllerDataContext);
  if (!data) {
    throw new Error('useCanvasControllerData must be used within a CanvasControllerProvider');
  }
  return data;
};

export const useCanvasControllerActions = (): CanvasControllerActions => {
  const actions = useContext(CanvasControllerActionsContext);
  if (!actions) {
    throw new Error('useCanvasControllerActions must be used within a CanvasControllerProvider');
  }
  return actions;
};

export const useCanvasController = (): CanvasControllerValue => {
  const legacyContext = useContext(CanvasControllerContext);
  const data = useContext(CanvasControllerDataContext);
  const actions = useContext(CanvasControllerActionsContext);

  const context = useMemo(() => {
    if (legacyContext) {
      return legacyContext;
    }
    if (!data || !actions) {
      return null;
    }
    return {
      ...data,
      ...actions,
    };
  }, [legacyContext, data, actions]);

  if (!context) {
    throw new Error('useCanvasController must be used within a CanvasControllerProvider');
  }

  return context;
};

import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createConditionalToolPanel } from '../../utils/pluginFactories';
import { Route } from 'lucide-react';
import { createSubpathPluginSlice } from './slice';
import type { SubpathPluginSlice } from './slice';
import { SubPathOperationsPanel } from './SubPathOperationsPanel';
import { EditorPanel } from '../../sidebar/panels/EditorPanel';
import { SubpathOverlay } from './SubpathOverlay';
import type { PathData } from '../../types';
import { performPathSimplify, performSubPathReverse, performSubPathJoin } from './actions';
import { calculateSubpathsBounds } from '../../utils/selectionBoundsUtils';
import { createPluginSlice } from '../../utils/pluginUtils';
import { Undo, SplitSquareVertical, Combine } from 'lucide-react';
import { pluginManager } from '../../utils/pluginManager';

const subpathSliceFactory = createPluginSlice(createSubpathPluginSlice);

export const subpathPlugin: PluginDefinition<CanvasStore> = {
  id: 'subpath',
  toolDefinition: {
    order: 2,
    visibility: 'dynamic',
    toolGroup: 'basic',
    isDisabled: (store) => {
      // Subpath requires exactly one path element with multiple subpaths
      const { selectedIds, elements } = store;
      if (selectedIds.length !== 1) return true;
      const element = elements.find(el => el.id === selectedIds[0]);
      if (!element || element.type !== 'path') return true;
      const pathData = element.data as PathData;
      return pathData.subPaths.length <= 1;
    },
  },
  behaviorFlags: () => ({
    selectionMode: 'subpaths',
  }),
  init: (_context) => {
    return () => { };
  },
  contextMenuActions: [
    {
      id: 'reverse-subpath',
      action: (context) => {
        if (context.type !== 'subpath') return null;

        return {
          id: 'reverse-subpath',
          label: 'Reverse Direction',
          icon: Undo,
          onClick: () => {
            pluginManager.callPluginApi('subpath', 'performSubPathReverse');
          }
        };
      }
    },
    {
      id: 'subpath-split',
      action: (context) => {
        if (context.type !== 'path') return null;

        // Check if path has multiple subpaths
        // We need to access the store state to check the element data
        // For now, let's assume if we are in path context, we might show it if applicable
        // But the original logic checked for multiple subpaths.
        // We can access the element via context.elementId and store

        const store = pluginManager.requireStoreApi();
        const state = store.getState();
        const element = state.elements.find(el => el.id === context.elementId);

        if (!element || element.type !== 'path') return null;
        const pathData = element.data as import('../../types').PathData;

        if (pathData.subPaths.length <= 1) return null;

        return {
          id: 'subpath-split',
          label: 'Subpath Split',
          icon: SplitSquareVertical,
          onClick: () => {
            pluginManager.callPluginApi('subpath', 'performPathSimplify');
          }
        };
      }
    },
    {
      id: 'subpath-join',
      action: (context) => {
        if (context.type !== 'path') return null;

        const store = pluginManager.requireStoreApi();
        const state = store.getState();
        const element = state.elements.find(el => el.id === context.elementId);

        if (!element || element.type !== 'path') return null;
        const pathData = element.data as import('../../types').PathData;

        if (pathData.subPaths.length <= 1) return null;

        return {
          id: 'subpath-join',
          label: 'Subpath Join',
          icon: Combine,
          onClick: () => {
            pluginManager.callPluginApi('subpath', 'performSubPathJoin');
          }
        };
      }
    }
  ],
  metadata: {
    label: 'Subpath',
    icon: Route,
    cursor: 'pointer',
    disablePathInteraction: true,
  },
  modeConfig: {
    description: 'Mode for choosing and working with subpaths.',
    toggleTo: 'select',
  },
  onSubpathDoubleClick: (elementId, subpathIndex, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = (state.selectedSubpaths?.length ?? 0) === 1 &&
      state.selectedSubpaths?.[0].elementId === elementId &&
      state.selectedSubpaths?.[0].subpathIndex === subpathIndex;

    if (wasAlreadySelected) {
      state.setActivePlugin('transformation');
    }
  },
  onCanvasDoubleClick: (_event, context) => {
    context.store.getState().setActivePlugin('select');
  },
  subscribedEvents: ['pointerdown', 'pointerup'],
  handler: (event, point, target, context) => {
    const state = context.store.getState();
    const { pointerState } = context;

    if (event.type === 'pointerdown') {
      if (target.tagName === 'svg') {
        context.helpers.beginSelectionRectangle?.(point, false, !event.shiftKey);
      }
    } else if (event.type === 'pointerup') {
      if (pointerState?.isDragging && pointerState?.hasDragMoved) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fullState = state as any;
        if (fullState.grid?.snapEnabled && fullState.snapToGrid) {
          const selectedSubpaths = state.selectedSubpaths || [];
          if (selectedSubpaths.length > 0) {
            // Convert to Map<string, Set<number>>
            const subpathMap = new Map<string, Set<number>>();
            selectedSubpaths.forEach((sel: { elementId: string; subpathIndex: number }) => {
              if (!subpathMap.has(sel.elementId)) {
                subpathMap.set(sel.elementId, new Set());
              }
              subpathMap.get(sel.elementId)!.add(sel.subpathIndex);
            });

            const bounds = calculateSubpathsBounds(state.elements, subpathMap, state.viewport.zoom);

            if (Number.isFinite(bounds.minX)) {
              const snappedTopLeft = fullState.snapToGrid(bounds.minX, bounds.minY);
              const snapOffsetX = snappedTopLeft.x - bounds.minX;
              const snapOffsetY = snappedTopLeft.y - bounds.minY;

              if (snapOffsetX !== 0 || snapOffsetY !== 0) {
                state.moveSelectedSubpaths(snapOffsetX, snapOffsetY);
              }
            }
          }
        }
      }
    }
  },
  keyboardShortcuts: {
    Escape: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      if ((state.selectedSubpaths?.length ?? 0) > 0) {
        state.clearSubpathSelection?.();
      } else {
        state.setActivePlugin('select');
      }
    },
    Delete: () => {
      // Reserved for subpath deletion behaviour
    },
  },
  canvasLayers: [
    {
      id: 'subpath-overlay',
      placement: 'foreground',
      render: ({
        elements,
        selectedSubpaths,
        activePlugin,
        selectSubpath,
        setDragStart,
        handleSubpathDoubleClick,
        handleSubpathTouchEnd,
        isElementHidden,
        viewport,
      }) => {
        if (!['subpath', 'transformation', 'edit'].includes(activePlugin ?? '')) {
          return null;
        }

        // Create fallback handlers for when the context doesn't provide them
        const safeHandleSubpathDoubleClick = handleSubpathDoubleClick ?? (() => { });
        const safeHandleSubpathTouchEnd = handleSubpathTouchEnd ?? (() => { });

        return (
          <>
            {elements
              .filter((element) => {
                if (element.type !== 'path' || (isElementHidden && isElementHidden(element.id))) {
                  return false;
                }
                const pathData = element.data as PathData;
                return pathData.subPaths?.length > 1;
              })
              .map((element) => (
                <SubpathOverlay
                  key={`subpath-overlay-${element.id}`}
                  element={element}
                  selectedSubpaths={selectedSubpaths ?? []}
                  viewport={viewport}
                  onSelectSubpath={selectSubpath ?? (() => { })}
                  onSetDragStart={setDragStart}
                  onSubpathDoubleClick={safeHandleSubpathDoubleClick}
                  onSubpathTouchEnd={safeHandleSubpathTouchEnd}
                  isVisible={activePlugin === 'subpath'}
                />
              ))}
          </>
        );
      },
    },
  ],
  slices: [subpathSliceFactory],
  // Reuse Editor styling controls for subpath editing in the bottom expandable panel
  expandablePanel: EditorPanel,
  sidebarPanels: [
    createConditionalToolPanel(
      'subpath',
      SubPathOperationsPanel,
      (ctx) => ctx.selectedSubpathsCount > 0,
      { key: 'subpath-operations' }
    ),
  ],
  createApi: ({ store }) => ({
    performPathSimplify: () => {
      performPathSimplify(store.getState);
    },
    performSubPathReverse: () => {
      performSubPathReverse(store.getState);
    },
    performSubPathJoin: () => {
      performSubPathJoin(store.getState);
    },
  }),
};

export type { SubpathPluginSlice };
export { SubPathOperationsPanel };
export { SubpathOverlay } from './SubpathOverlay';

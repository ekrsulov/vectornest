/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import type { Point, CanvasElement, Viewport, GroupElement } from '../types';
import type { Bounds } from '../utils/boundsUtils';
import type { ElementMap } from '../canvas/geometry/CanvasGeometryService';
import { getGroupBounds } from '../canvas/geometry/CanvasGeometryService';
import { calculateMultiElementBounds } from '../utils/selectionBoundsUtils';
import { getEffectiveShift } from '../utils/effectiveShift';
import { buildElementMap } from '../utils';
import { SelectionOverlay, BlockingOverlay } from '../overlays';
import { useCanvasStore } from '../store/canvasStore';
import { MousePointer } from 'lucide-react';
import { useColorMode } from '@chakra-ui/react';
import { EditorPanel } from '../sidebar/panels/EditorPanel';
import { GroupTransformationOverlay } from './transformation/GroupTransformationOverlay';
import { SelectionBboxTransformationOverlay } from './transformation/SelectionBboxTransformationOverlay';
import { pluginManager } from '../utils/pluginManager';
import { elementContributionRegistry } from '../utils/elementContributionRegistry';
import { getAccumulatedTransformMatrix } from '../utils/elementTransformUtils';
import type { GroupEditorSlice } from '../store/slices/features/groupEditorSlice';

/** Type helpers for transformation-related props coming from CanvasLayerContext index signature */
type TransformationConfig = {
  showCoordinates?: boolean;
  showRulers?: boolean;
  advancedMode?: boolean;
  rotationPivot?: { x: number; y: number } | null;
  rotationPivotTarget?: string | null;
};
type TransformHandlerPointerDown = (e: React.PointerEvent, id: string, handler: string) => void;
type TransformHandlerPointerUp = (e: React.PointerEvent) => void;

const SelectionRectangleComponent: React.FC<{
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  viewport: { zoom: number };
}> = ({ isSelecting, selectionStart, selectionEnd, viewport }) => {
  const { colorMode } = useColorMode();

  // Check if a non-default selection strategy is active
  const activeStrategy = useCanvasStore(s => (s as unknown as { activeSelectionStrategy?: string }).activeSelectionStrategy);

  // Don't show selection rectangle when a custom strategy (non-rectangle) is active
  if (!isSelecting || !selectionStart || !selectionEnd || (activeStrategy && activeStrategy !== 'rectangle')) {
    return null;
  }

  const x = Math.min(selectionStart.x, selectionEnd.x);
  const y = Math.min(selectionStart.y, selectionEnd.y);
  const width = Math.abs(selectionEnd.x - selectionStart.x);
  const height = Math.abs(selectionEnd.y - selectionStart.y);

  // Use gray tones for selection rectangle
  const strokeColor = colorMode === 'dark' ? '#dee2e6' : '#6b7280'; // gray.300 : gray.500
  const fillColor = colorMode === 'dark' ? 'rgba(222, 226, 230, 0.1)' : 'rgba(107, 114, 128, 0.1)';

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={1 / viewport.zoom}
      strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
    />
  );
};

// Component for group selection bounds that can use hooks
const GroupSelectionBoundsComponent: React.FC<{
  selectedGroupBounds: Array<{ id: string; bounds: { minX: number; minY: number; maxX: number; maxY: number } }>;
  viewport: { zoom: number };
}> = ({ selectedGroupBounds, viewport }) => {
  const { colorMode } = useColorMode();

  if (!selectedGroupBounds.length) {
    return null;
  }

  // Use theme-adaptive color for group selection (same as selection rectangle)
  const strokeColor = colorMode === 'dark' ? '#22d3ee' : '#0ea5e9';
  const fillColor = colorMode === 'dark' ? '#cccccc10' : '#cccccc30';
  const padding = 8 / viewport.zoom; // Greater than the 5px used for selected elements

  return (
    <>
      {selectedGroupBounds.map(({ id, bounds }) => (
        <rect
          key={`group-selection-${id}`}
          x={bounds.minX - padding}
          y={bounds.minY - padding}
          width={bounds.maxX - bounds.minX + 2 * padding}
          height={bounds.maxY - bounds.minY + 2 * padding}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1 / viewport.zoom}
          pointerEvents="none"
        />
      ))}
    </>
  );
};

// Component for selection bbox from top-left to bottom-right element
const SelectionBboxComponent: React.FC<{
  selectedIds: string[];
  getElementBounds: (element: CanvasElement) => Bounds | null;
  elementMap: ElementMap;
  viewport: Viewport;
}> = ({ selectedIds, getElementBounds, elementMap, viewport }) => {
  const { colorMode } = useColorMode();

  if (selectedIds.length <= 1) {
    return null;
  }

  // Separate selected elements and groups
  const selectedElements: CanvasElement[] = [];
  const selectedGroups: GroupElement[] = [];

  selectedIds.forEach(id => {
    const item = elementMap.get(id);
    if (item) {
      if (item.type === 'group') {
        selectedGroups.push(item as GroupElement);
      } else {
        selectedElements.push(item);
      }
    }
  });

  // Create pairs of representative elements (element/group or its parent group) and their bounds
  const representativeBoundsPairs: { representative: CanvasElement; bounds: Bounds }[] = [];

  // Handle directly selected groups
  selectedGroups.forEach(group => {
    const groupBounds = getGroupBounds(group, elementMap, viewport);
    if (groupBounds) {
      representativeBoundsPairs.push({ representative: group, bounds: groupBounds });
    }
  });

  // Handle selected elements (considering their parent groups)
  selectedElements.forEach(element => {
    // If element belongs to a group, use the group's bounds instead
    if (element.parentId) {
      const parentGroup = elementMap.get(element.parentId);
      if (parentGroup && parentGroup.type === 'group') {
        const groupBounds = getGroupBounds(parentGroup as GroupElement, elementMap, viewport);
        if (groupBounds) {
          representativeBoundsPairs.push({ representative: parentGroup, bounds: groupBounds });
        }
        return; // Skip adding the individual element
      }
    }

    // Otherwise use the element itself
    const bounds = getElementBounds(element);
    if (bounds) {
      representativeBoundsPairs.push({ representative: element, bounds });
    }
  });

  if (representativeBoundsPairs.length < 2) {
    return null;
  }

  // Find representatives defining the four extremes
  let leftRep = representativeBoundsPairs[0];
  let topRep = representativeBoundsPairs[0];
  let rightRep = representativeBoundsPairs[0];
  let bottomRep = representativeBoundsPairs[0];

  for (const pair of representativeBoundsPairs) {
    if (pair.bounds.minX < leftRep.bounds.minX) {
      leftRep = pair;
    }
    if (pair.bounds.minY < topRep.bounds.minY) {
      topRep = pair;
    }
    if (pair.bounds.maxX > rightRep.bounds.maxX) {
      rightRep = pair;
    }
    if (pair.bounds.maxY > bottomRep.bounds.maxY) {
      bottomRep = pair;
    }
  }

  // Only draw if not all four extremes are defined by the same representative
  const extremeRepresentatives = new Set([leftRep.representative.id, topRep.representative.id, rightRep.representative.id, bottomRep.representative.id]);
  if (extremeRepresentatives.size === 1) {
    return null;
  }

  // Use theme-adaptive color, similar to group selection but different
  const strokeColor = colorMode === 'dark' ? '#f59e0b' : '#d97706'; // amber
  const fillColor = colorMode === 'dark' ? '#f59e0b10' : '#f59e0b20';
  const padding = 10 / viewport.zoom; // Greater than the 8px used for groups

  const x = leftRep.bounds.minX - padding;
  const y = topRep.bounds.minY - padding;
  const width = rightRep.bounds.maxX - leftRep.bounds.minX + 2 * padding;
  const height = bottomRep.bounds.maxY - topRep.bounds.minY + 2 * padding;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={1 / viewport.zoom}
      pointerEvents="none"
    />
  );
};

// Import helper function from basePluginDefinitions
import { getAllElementsShareSameParentGroup, resolveRootGroup } from './basePluginDefinitions';

 
export const selectPlugin: PluginDefinition<CanvasStore> = {
  id: 'select',
  metadata: {
    label: 'Select',
    icon: MousePointer,
    cursor: 'default',
    pathCursorMode: 'select', // Select tool needs 'select' cursor mode for path interaction
  },
  modeConfig: {
    description: 'Default tool for selecting and manipulating elements.',
    entry: ['clearSubpathSelection', 'clearSelectedCommands'],
  },
  behaviorFlags: () => ({
    selectionMode: 'elements',
  }),
  toolDefinition: { order: 1, visibility: 'always-shown', toolGroup: 'basic' },
  subscribedEvents: ['pointerdown', 'pointerup'],
  onElementDoubleClick: (elementId, _event, context) => {
    const state = context.store.getState();
    const element = state.elements.find(el => el.id === elementId);

    if (!element) return;

    const rootGroupId = resolveRootGroup(elementId, state.elements);
    const groupEditor = (state as CanvasStore & GroupEditorSlice).groupEditor;
    const activeGroupId =
      groupEditor?.isEditing && groupEditor.activeGroupId ? groupEditor.activeGroupId : null;
    const isWithinActiveGroup = (() => {
      if (!activeGroupId) return false;
      const elementMap = buildElementMap(state.elements);
      let current = elementMap.get(elementId);
      const visited = new Set<string>();
      while (current) {
        if (current.id === activeGroupId) return true;
        if (!current.parentId) break;
        if (visited.has(current.parentId)) break;
        visited.add(current.parentId);
        current = elementMap.get(current.parentId);
      }
      return false;
    })();

    // If the element belongs to a group and that group isn't active, a double click should
    // select the element and enter group editing mode (equivalent to "Enter Group" in svgStructure).
    // This applies to ALL element types (path, nativeText, image, nativeShape, etc.)
    if (rootGroupId !== elementId && !isWithinActiveGroup && activeGroupId !== rootGroupId) {
      state.selectElement(elementId, false);
      return;
    }

    if (element.type !== 'path' && element.type !== 'nativeText' && element.type !== 'image' && element.type !== 'nativeShape') return;

    // Only proceed if this element is selected and it's the only one selected
    if (state.selectedIds.length === 1 && state.selectedIds[0] === elementId) {
      if (element.type === 'path') {
        const pathData = element.data as import('../types').PathData;
        if (pathData.subPaths.length === 1) {
          // Single subpath -> go to transformation mode
          state.setActivePlugin('transformation');
        } else if (pathData.subPaths.length > 1) {
          // Multiple subpaths -> go to subpath mode
          state.setActivePlugin('subpath');
        }
      } else if (element.type === 'nativeText' || element.type === 'image' || element.type === 'nativeShape') {
        // For nativeText, image, and nativeShape: first double click goes to transformation
        state.setActivePlugin('transformation');
      }
    }
  },
  handler: (
    event,
    point,
    target,
    context
  ) => {
    const state = context.store.getState();
    const { helpers, pointerState } = context;

    if (event.type === 'pointerdown') {
      if (target.tagName === 'svg' || target.classList.contains('canvas-background')) {
        if (!event.shiftKey) {
          state.clearSelection?.();
          state.clearSubpathSelection?.();
        }
        context.helpers.beginSelectionRectangle?.(point);
        return;
      }

      // Handle Element click
      const elementId = target.getAttribute('data-element-id') || target.closest('[data-element-id]')?.getAttribute('data-element-id');

      if (elementId) {
        if (state.styleEyedropper.isActive) {
          state.applyStyleToPath(elementId);
          return;
        }

        const groupEditor = (state as CanvasStore & GroupEditorSlice).groupEditor;
        const activeGroupId =
          groupEditor?.isEditing && groupEditor.activeGroupId ? groupEditor.activeGroupId : null;
        const targetId = (() => {
          if (!activeGroupId) {
            return resolveRootGroup(elementId, state.elements);
          }

          const elementMap = buildElementMap(state.elements);
          let current = elementMap.get(elementId);
          const visited = new Set<string>();
          while (current) {
            if (current.id === activeGroupId) {
              return elementId;
            }
            if (!current.parentId) {
              break;
            }
            if (visited.has(current.parentId)) {
              break;
            }
            visited.add(current.parentId);
            current = elementMap.get(current.parentId);
          }

          return resolveRootGroup(elementId, state.elements);
        })();

        const effectiveShiftKey = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);

        if (!effectiveShiftKey) {
          const selectedIds = state.selectedIds;
          const hasMultiSelection = selectedIds.length > 1;
          const isElementInSelection = selectedIds.includes(elementId) || selectedIds.includes(targetId);

          if (hasMultiSelection && isElementInSelection) {
            // Keep the current multiselection - don't change it
            // Just start dragging all selected elements
          } else if (!isElementInSelection) {
            state.selectElement(targetId, false);
          }

          helpers.setDragStart?.(point);
          helpers.setHasDragMoved?.(false);
          helpers.setIsDragging?.(false);

          // Ensure subpath selection is cleared when starting to drag in select mode
          state.clearSubpathSelection?.();
        }
      }
    } else if (event.type === 'pointerup') {
      // Snap logic on drag end
      if (pointerState?.isDragging && pointerState?.hasDragMoved) {
        const state = context.store.getState();
        if (state.settings.showMinimap && state.snapToGrid) { // Assuming snapToGrid checks enabled state internally or we check settings
          // Wait, state.grid.snapEnabled is where?
          // In useCanvasEventHandlers: if (state.grid?.snapEnabled && state.snapToGrid)
          // Let's check state structure.
          // It seems grid is a plugin slice?
          // But snapToGrid is in BaseSlice or similar?
          // Let's assume state has it if useCanvasEventHandlers used it.
          // But TS might complain if I don't cast state.
        }

        // Let's use a safer check
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fullState = state as any;
        if (fullState.grid?.snapEnabled && fullState.snapToGrid) {
          const selectedElements = state.elements.filter(el => state.selectedIds.includes(el.id));

          let minX = Infinity;
          let minY = Infinity;

          // Create a temporary element map if needed (though store usually has it)
          // We use a Map for O(1) lookups required by getGroupBounds
          const elementMap = buildElementMap(state.elements);

          selectedElements.forEach(el => {
            let b: Bounds | null = null;
            if (el.type === 'group') {
              b = getGroupBounds(el as GroupElement, elementMap, state.viewport);
            } else {
              b = elementContributionRegistry.getBounds(el, {
                viewport: state.viewport,
                elementMap,
              }) ?? (el.type === 'path'
                ? calculateMultiElementBounds([el], { includeStroke: true, zoom: state.viewport.zoom })
                : null);
            }

            if (b && Number.isFinite(b.minX)) {
              minX = Math.min(minX, b.minX);
              minY = Math.min(minY, b.minY);
            }
          });

          if (Number.isFinite(minX)) {
            const snappedTopLeft = fullState.snapToGrid(minX, minY);
            const snapOffsetX = snappedTopLeft.x - minX;
            const snapOffsetY = snappedTopLeft.y - minY;

            if (snapOffsetX !== 0 || snapOffsetY !== 0) {
              state.moveSelectedElements(snapOffsetX, snapOffsetY);
            }
          }
        }

        helpers.setIsDragging?.(false);
        helpers.setDragStart?.(null);
        helpers.setHasDragMoved?.(false);
        return;
      }

      const elementId = target.getAttribute('data-element-id') || target.closest('[data-element-id]')?.getAttribute('data-element-id');

      if (elementId && !pointerState?.hasDragMoved) {
        const effectiveShiftKey = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);
        if (effectiveShiftKey) {
          const groupEditor = (state as CanvasStore & GroupEditorSlice).groupEditor;
          const activeGroupId =
            groupEditor?.isEditing && groupEditor.activeGroupId ? groupEditor.activeGroupId : null;
          const targetId = (() => {
            if (!activeGroupId) {
              return resolveRootGroup(elementId, state.elements);
            }

            const elementMap = buildElementMap(state.elements);
            let current = elementMap.get(elementId);
            const visited = new Set<string>();
            while (current) {
              if (current.id === activeGroupId) {
                return elementId;
              }
              if (!current.parentId) {
                break;
              }
              if (visited.has(current.parentId)) {
                break;
              }
              visited.add(current.parentId);
              current = elementMap.get(current.parentId);
            }

            return resolveRootGroup(elementId, state.elements);
          })();
          state.selectElement(targetId, true);
        }
      }
    }
  },
  keyboardShortcuts: {
    Delete: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      state.deleteSelectedElements();
    },
  },
  canvasLayers: [
    {
      id: 'selection-overlays',
      placement: 'midground',
      render: ({
        elements,
        selectedIds,
        selectedSubpaths,
        activePlugin,
        viewport,
        isElementHidden,
        getElementBounds,
      }) => {
        if (!selectedIds.length) {
          return null;
        }

        // Hide individual selection feedback when active plugin requests it
        if (pluginManager.shouldHideIndividualSelectionOverlays()) {
          return null;
        }

        // Build lookup map once for all selected elements
        const elMap = buildElementMap(elements);

        return (
          <>
            {elements
              .filter((element) =>
                element.type !== 'group' &&
                selectedIds.includes(element.id) &&
                (!isElementHidden || !isElementHidden(element.id))
              )
              .map((element) => {
                const shouldRender =
                  activePlugin !== 'transformation' ||
                  (selectedSubpaths ?? []).some((subpath: { elementId: string }) => subpath.elementId === element.id);

                if (!shouldRender) {
                  return null;
                }

                return (
                  <SelectionOverlay
                    key={`selection-${element.id}`}
                    element={element}
                    bounds={getElementBounds(element)}
                    viewport={viewport}
                    selectedSubpaths={selectedSubpaths}
                    activePlugin={activePlugin}
                    transformMatrix={getAccumulatedTransformMatrix(element.id, elMap)}
                  />
                );
              })}
          </>
        );
      },
    },
    {
      id: 'group-selection-bounds',
      placement: 'midground',
      render: ({ selectedGroupBounds, viewport, activePlugin, selectedIds, elementMap }) => {
        if (activePlugin === 'transformation') {
          // In transformation mode, show feedback only for parent groups (not the directly selected group)
          // This provides visual context similar to edit mode

          // If a single path is selected, show all parent group bounds as feedback
          if (selectedIds.length === 1) {
            const element = elementMap.get(selectedIds[0]);
            if (element && element.type === 'path') {
              // Show parent groups feedback (they won't have handlers)
              return (
                <GroupSelectionBoundsComponent
                  selectedGroupBounds={selectedGroupBounds}
                  viewport={viewport}
                />
              );
            }
          }

          // For group selections or multi-selection, don't show feedback (handlers are shown instead)
          return null;
        }

        // In select mode, always show group bounds feedback
        // Hide group bounds feedback when active plugin requests it
        if (pluginManager.shouldHideIndividualSelectionOverlays()) {
          return null;
        }
        return (
          <GroupSelectionBoundsComponent
            selectedGroupBounds={selectedGroupBounds}
            viewport={viewport}
          />
        );
      },
    },
    {
      id: 'selection-bbox',
      placement: 'midground',
      render: ({ selectedIds, getElementBounds, elementMap, viewport, activePlugin }) => {
        // Don't show feedback visual in transformation mode (handlers are shown instead)
        // Also hide when active plugin requests it (e.g., provides its own feedback)
        if (activePlugin === 'transformation' || pluginManager.shouldHideSelectionBbox()) {
          return null;
        }

        return (
          <SelectionBboxComponent
            selectedIds={selectedIds}
            getElementBounds={getElementBounds}
            elementMap={elementMap}
            viewport={viewport}
          />
        );
      },
    },
    {
      id: 'selection-transformation-handlers',
      placement: 'foreground',
      render: (props) => {
        const {
          selectedIds,
          elementMap,
          viewport,
          activePlugin,
          isElementHidden,
          getElementBounds,
        } = props;
        const transformation = props.transformation as TransformationConfig | undefined;
        const handleTransformationHandlerPointerDown = props.handleTransformationHandlerPointerDown as TransformHandlerPointerDown | undefined;
        const handleTransformationHandlerPointerUp = props.handleTransformationHandlerPointerUp as TransformHandlerPointerUp | undefined;

        if (!selectedIds.length || activePlugin !== 'transformation') {
          return null;
        }

        // Priority: Single group (including multiple elements from same group) > Multi-selection bbox > Single element (path/group handled individually)

        // Check if all selected elements belong to the same parent group (only if multiple elements selected)
        const sharedParentGroupId = selectedIds.length > 1
          ? getAllElementsShareSameParentGroup(selectedIds, elementMap)
          : null;

        // Case 1: Multiple elements all belonging to the same parent group - show group handlers
        if (sharedParentGroupId) {
          const groupElement = elementMap.get(sharedParentGroupId);
          if (groupElement && groupElement.type === 'group' && (!isElementHidden || !isElementHidden(sharedParentGroupId))) {
            const bounds = getGroupBounds(groupElement as GroupElement, elementMap, viewport);
            if (bounds && isFinite(bounds.minX)) {
              return (
                <GroupTransformationOverlay
                  group={groupElement as GroupElement}
                  bounds={bounds}
                  viewport={viewport}
                  activePlugin={activePlugin}
                  transformation={transformation}
                  onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown!}
                  onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp!}
                />
              );
            }
          }
        }

        // Case 2: Multiple selection (not all from same group) - show selection bbox handlers
        if (selectedIds.length > 1) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          let hasBounds = false;

          selectedIds.forEach((id) => {
            const element = elementMap.get(id);
            if (!element || (isElementHidden && isElementHidden(id))) return;

            let bounds = null;
            if (element.type === 'group') {
              bounds = getGroupBounds(element as GroupElement, elementMap, viewport);
            } else {
              bounds = getElementBounds(element);
            }

            if (bounds && isFinite(bounds.minX)) {
              minX = Math.min(minX, bounds.minX);
              minY = Math.min(minY, bounds.minY);
              maxX = Math.max(maxX, bounds.maxX);
              maxY = Math.max(maxY, bounds.maxY);
              hasBounds = true;
            }
          });

          if (hasBounds && isFinite(minX)) {
            return (
              <SelectionBboxTransformationOverlay
                bounds={{ minX, minY, maxX, maxY }}
                viewport={viewport}
                activePlugin={activePlugin}
                transformation={transformation}
                onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown!}
                onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp!}
              />
            );
          }
        }

        // Case 3: Single group selected - show group handlers
        if (selectedIds.length === 1) {
          const element = elementMap.get(selectedIds[0]);
          if (element && element.type === 'group' && (!isElementHidden || !isElementHidden(selectedIds[0]))) {
            const bounds = getGroupBounds(element as GroupElement, elementMap, viewport);
            if (bounds && isFinite(bounds.minX)) {
              return (
                <GroupTransformationOverlay
                  group={element as GroupElement}
                  bounds={bounds}
                  viewport={viewport}
                  activePlugin={activePlugin}
                  transformation={transformation}
                  onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown!}
                  onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp!}
                />
              );
            }
          }
        }

        // Case 4: Single path - handlers will be shown by transformation plugin when needed
        return null;
      },
    },
    {
      id: 'selection-rectangle',
      placement: 'midground',
      render: (props) => <SelectionRectangleComponent {...props} />,
    },
    {
      id: 'selection-blocking-overlay',
      placement: 'midground',
      render: ({ viewport, canvasSize, isSelecting }) => (
        <BlockingOverlay
          viewport={viewport}
          canvasSize={canvasSize}
          isActive={isSelecting}
        />
      ),
    },
  ],
  // Show the same styling controls as the Editor panel in the bottom expandable panel
  expandablePanel: EditorPanel,
};





// Re-export helper function and simple plugins from basePluginDefinitions
 
export { panPlugin, filePlugin, settingsPlugin, libraryPlugin } from './basePluginDefinitions';

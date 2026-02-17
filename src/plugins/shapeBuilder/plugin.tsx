import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { Point, PathData, PathElement } from '../../types';
import { Combine } from 'lucide-react';
import { createShapeBuilderSlice } from './slice';
import type { ShapeBuilderSlice } from './slice';
import { ShapeBuilderPanel } from './ShapeBuilderPanel';
import { ShapeBuilderOverlay } from './ShapeBuilderOverlay';
import { findRegionAtPoint, findRegionsAlongPath, mergeRegions } from './regionUtils';
import { pluginManager } from '../../utils/pluginManager';
import { createPluginSlice } from '../../utils/pluginUtils';

const shapeBuilderSliceFactory = createPluginSlice(createShapeBuilderSlice);

export const shapeBuilderPlugin: PluginDefinition<CanvasStore> = {
    id: 'shapeBuilder',
    metadata: {
        label: 'Shape Builder',
        icon: Combine,
        cursor: 'crosshair',
    },
    modeConfig: {
        description: 'Merge or subtract regions formed by overlapping paths.',
        toggleTo: 'select',
    },
    behaviorFlags: () => ({
        notifyOnSelectionChange: true,
    }),
    toolDefinition: {
        order: 26,
        visibility: 'dynamic',
        toolGroup: 'advanced',
        isDisabled: (store) => {
            // Requires 2+ paths selected
            const { selectedIds, elements } = store;
            const pathCount = selectedIds.filter(id => {
                const el = elements.find(e => e.id === id);
                return el && el.type === 'path';
            }).length;
            return pathCount < 2;
        },
    },
    slices: [shapeBuilderSliceFactory],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],

    handler: (event, point, _target, context) => {
        const state = context.store.getState() as unknown as ShapeBuilderSlice & CanvasStore;
        const shapeBuilder = state.shapeBuilder;

        // Compute regions if not already computed
        if (!shapeBuilder || shapeBuilder.regions.length === 0) {
            state.computeShapeBuilderRegions?.();
            return;
        }

        const regions = shapeBuilder.regions;
        const updateState = state.updateShapeBuilderState;

        // Points from the canvas event bus are already in canvas coordinates
        const canvasPoint: Point = { ...point };

        if (event.type === 'pointerdown') {
            const region = findRegionAtPoint(canvasPoint, regions);
            const isSubtractMode = event.altKey || shapeBuilder.mode === 'subtract';

            updateState?.({
                isDragging: true,
                dragStartPoint: canvasPoint,
                dragPath: [canvasPoint],
                selectedRegionIds: region ? [region.id] : [],
                mode: isSubtractMode ? 'subtract' : 'merge',
            });
        }

        if (event.type === 'pointermove') {
            // Update hovered region
            const region = findRegionAtPoint(canvasPoint, regions);

            if (shapeBuilder.isDragging) {
                // Add point to drag path
                const newDragPath = [...shapeBuilder.dragPath, canvasPoint];
                const touchedRegions = findRegionsAlongPath(newDragPath, regions);

                updateState?.({
                    dragPath: newDragPath,
                    selectedRegionIds: touchedRegions.map(r => r.id),
                    hoveredRegionId: region?.id ?? null,
                });
            } else {
                updateState?.({
                    hoveredRegionId: region?.id ?? null,
                });
            }
        }

        if (event.type === 'pointerup') {
            if (shapeBuilder.isDragging) {
                const selectedIds = shapeBuilder.selectedRegionIds;

                if (selectedIds.length > 0) {
                    // Apply the operation
                    if (shapeBuilder.mode === 'merge' && selectedIds.length >= 1) {
                        applyMergeOperation(state, selectedIds);
                    } else if (shapeBuilder.mode === 'subtract') {
                        applySubtractOperation(state, selectedIds);
                    }

                    // Clear state and exit Shape Builder mode to materialize changes
                    updateState?.({
                        isDragging: false,
                        dragStartPoint: null,
                        dragPath: [],
                        selectedRegionIds: [],
                        regions: [],
                    });

                    // Exit to select mode to show the final result
                    setTimeout(() => {
                        state.setActivePlugin('select');
                    }, 10);
                } else {
                    // No regions selected, just clear drag state
                    updateState?.({
                        isDragging: false,
                        dragStartPoint: null,
                        dragPath: [],
                        selectedRegionIds: [],
                    });
                }
            }
        }
    },

    keyboardShortcuts: {
        Escape: (_event, { store }) => {
            const state = store.getState() as CanvasStore;
            state.setActivePlugin('select');
        },
    },

    canvasLayers: [
        {
            id: 'shape-builder-overlay',
            placement: 'foreground',
            render: ({ viewport, activePlugin }) => {
                if (activePlugin !== 'shapeBuilder') return null;
                return <ShapeBuilderOverlay viewport={viewport} />;
            },
        },
    ],

    expandablePanel: ShapeBuilderPanel,

    sidebarPanels: [
        {
            key: 'shapeBuilder',
            condition: (ctx) => ctx.activePlugin === 'shapeBuilder',
            component: ShapeBuilderPanel,
        },
    ],

    init: (context) => {
        // Recompute regions every time the mode is entered
        const unregisterModeEnter = pluginManager.registerLifecycleAction(
            'onModeEnter:shapeBuilder',
            () => {
                const state = context.store.getState() as CanvasStore & ShapeBuilderSlice;
                state.updateShapeBuilderState?.({
                    hoveredRegionId: null,
                    selectedRegionIds: [],
                    isDragging: false,
                    dragPath: [],
                    dragStartPoint: null,
                    regions: [],
                });
                state.computeShapeBuilderRegions?.();
            }
        );

        // Recompute regions when selection changes while the tool is active
        const unregisterSelectionChanged = pluginManager.registerLifecycleAction(
            'onSelectionChanged',
            () => {
                const state = context.store.getState() as CanvasStore & ShapeBuilderSlice;
                if (state.activePlugin !== 'shapeBuilder') return;
                state.updateShapeBuilderState?.({
                    hoveredRegionId: null,
                    selectedRegionIds: [],
                    isDragging: false,
                    dragPath: [],
                    dragStartPoint: null,
                    regions: [],
                });
                state.computeShapeBuilderRegions?.();
            }
        );

        return () => {
            unregisterModeEnter();
            unregisterSelectionChanged();
        };
    },
};

/**
 * Applies merge operation: creates a new path from merged regions
 */
function applyMergeOperation(
    state: ShapeBuilderSlice & CanvasStore,
    regionIds: string[]
) {
    const regions = state.shapeBuilder?.regions ?? [];
    const regionsToMerge = regions.filter(r => regionIds.includes(r.id));

    if (regionsToMerge.length === 0) return;

    // Get source element IDs to remove after merge
    const sourceIds = new Set<string>();
    for (const region of regionsToMerge) {
        for (const id of region.sourceElementIds) {
            sourceIds.add(id);
        }
    }

    const mergedPathData = mergeRegions(regionsToMerge);
    if (!mergedPathData) return;

    // Get first source element for style reference
    const firstSourceId = Array.from(sourceIds)[0];
    const sourceElement = state.elements.find(e => e.id === firstSourceId) as PathElement | undefined;
    const sourceData = sourceElement?.data as PathData | undefined;

    // Add new merged element
    const newId = state.addElement({
        type: 'path',
        data: {
            ...mergedPathData,
            strokeWidth: sourceData?.strokeWidth ?? 1,
            strokeColor: sourceData?.strokeColor ?? '#000000',
            strokeOpacity: sourceData?.strokeOpacity ?? 1,
            fillColor: sourceData?.fillColor ?? 'none',
            fillOpacity: sourceData?.fillOpacity ?? 1,
        },
    });

    // Remove source elements
    sourceIds.forEach(id => state.deleteElement(id));

    // Select the new merged element
    state.selectElement(newId);
}

/**
 * Applies subtract operation: removes selected regions from source paths
 */
function applySubtractOperation(
    state: ShapeBuilderSlice & CanvasStore,
    regionIds: string[]
) {
    const regions = state.shapeBuilder?.regions ?? [];
    const regionsToRemove = regions.filter(r => regionIds.includes(r.id));

    if (regionsToRemove.length === 0) return;

    // Get remaining regions
    const remainingRegions = regions.filter(r => !regionIds.includes(r.id));

    // Get all source element IDs
    const sourceIds = new Set<string>();
    for (const region of regions) {
        for (const id of region.sourceElementIds) {
            sourceIds.add(id);
        }
    }

    // Get first source element for style reference BEFORE deletion
    const firstSourceId = Array.from(sourceIds)[0];
    const sourceElement = state.elements.find(e => e.id === firstSourceId) as PathElement | undefined;
    const sourceData = sourceElement?.data as PathData | undefined;

    // Remove source elements
    sourceIds.forEach(id => state.deleteElement(id));

    if (remainingRegions.length === 0) {
        // All regions removed - clear selection
        state.clearSelection();
        return;
    }

    // Merge remaining regions into new path
    const mergedPathData = mergeRegions(remainingRegions);
    if (!mergedPathData) return;

    // Create new element with remaining regions
    const newId = state.addElement({
        type: 'path',
        data: {
            ...mergedPathData,
            strokeWidth: sourceData?.strokeWidth ?? 1,
            strokeColor: sourceData?.strokeColor ?? '#000000',
            strokeOpacity: sourceData?.strokeOpacity ?? 1,
            fillColor: sourceData?.fillColor ?? 'none',
            fillOpacity: sourceData?.fillOpacity ?? 1,
        },
    });

    // Select the new element
    state.selectElement(newId);
}

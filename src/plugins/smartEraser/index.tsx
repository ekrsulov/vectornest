import { Eraser } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSmartEraserPluginSlice, type SmartEraserPluginSlice } from './slice';
import React from 'react';
import { SmartEraserPanel } from './SmartEraserPanel';
import { SmartEraserOverlay } from './SmartEraserOverlay';
import { eraseElementsWithPath } from './smartEraserUtils';

export const smartEraserPlugin: PluginDefinition<CanvasStore> = {
    id: 'smartEraser',
    metadata: {
        label: 'Smart Eraser',
        icon: Eraser,
        cursor: 'none', // Hide standard cursor to show the custom eraser circle
    },
    slices: [createPluginSlice(createSmartEraserPluginSlice)],
    toolDefinition: {
        order: 48,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Erase portions of paths or shapes',
    },
    expandablePanel: () => React.createElement(SmartEraserPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'smart-eraser-panel',
            component: SmartEraserPanel,
            condition: (ctx) => ctx.activePlugin === 'smartEraser',
        },
    ],
    canvasLayers: [
        {
            id: 'smart-eraser-overlay',
            placement: 'foreground',
            render: () => <SmartEraserOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & SmartEraserPluginSlice;
        const { eraserPoints, isErasing, eraserSize } = state.smartEraser || { eraserPoints: [], isErasing: false, enabled: true, eraserSize: 20 };

        if (!state.smartEraser?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateSmartEraserState?.({
                isErasing: true,
                eraserPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isErasing) {
                // Collect stroke
                const lastPoint = eraserPoints[eraserPoints.length - 1];
                if (!lastPoint) return;

                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 4) {
                    state.updateSmartEraserState?.({
                        eraserPoints: [...eraserPoints, point],
                    });
                }
            } else {
                // Just track position for the overlay preview when hovering
                state.updateSmartEraserState?.({
                    eraserPoints: [point] // Single point array tricks the overlay into showing cursor preview
                });
            }
            return;
        }

        if (eventType === 'pointerup' && isErasing) {
            try {
                if (eraserPoints.length > 1) {
                    // Eraser only affects selected items if there are any, otherwise ALL items
                    let targets = state.elements.filter(el => state.selectedIds?.includes(el.id));
                    if (targets.length === 0) {
                        targets = state.elements;
                    }

                    const { elementsToAdd, elementsToRemove } = eraseElementsWithPath(
                        targets,
                        eraserPoints,
                        eraserSize / state.viewport.zoom
                    );

                    if (elementsToRemove.length > 0) {
                        store.setState((prev) => {
                            const filtered = prev.elements.filter((el) => !elementsToRemove.includes(el.id));
                            const newSelection = prev.selectedIds?.filter((id: string) => !elementsToRemove.includes(id)) || [];
                            const addedIds = elementsToAdd.map(el => el.id);
                            return {
                                elements: [...filtered, ...elementsToAdd],
                                selectedIds: prev.selectedIds?.some(id => elementsToRemove.includes(id))
                                    ? [...newSelection, ...addedIds]
                                    : prev.selectedIds,
                            };
                        });
                    }
                }
            } catch (e) {
                console.warn('[SmartEraser] Operation failed:', e);
            } finally {
                state.updateSmartEraserState?.({
                    isErasing: false,
                    eraserPoints: [point], // keep cursor preview
                });
            }
        }
    },
};

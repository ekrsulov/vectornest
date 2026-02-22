import { Scissors } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createKnifePluginSlice, type KnifePluginSlice } from './slice';
import React from 'react';
import { KnifePanel } from './KnifePanel';
import { KnifeOverlay } from './KnifeOverlay';
import { cutElementsWithPath } from './knifeUtils';

export const knifePlugin: PluginDefinition<CanvasStore> = {
    id: 'knife',
    metadata: {
        label: 'Knife',
        icon: Scissors,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createKnifePluginSlice)],
    toolDefinition: {
        order: 40,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Cut paths by drawing across them',
    },
    expandablePanel: () => React.createElement(KnifePanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'knife-panel',
            component: KnifePanel,
            condition: (ctx) => ctx.activePlugin === 'knife',
        },
    ],
    canvasLayers: [
        {
            id: 'knife-overlay',
            placement: 'foreground',
            render: () => <KnifeOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & KnifePluginSlice;
        const { cutPoints, isCutting } = state.knife || { cutPoints: [], isCutting: false, enabled: true };

        if (!state.knife?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateKnifeState?.({
                isCutting: true,
                cutPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove' && isCutting) {
            // Add point if moved enough to avoid dense point clumps
            const lastPoint = cutPoints[cutPoints.length - 1];
            if (!lastPoint) return;

            const dx = point.x - lastPoint.x;
            const dy = point.y - lastPoint.y;
            if (dx * dx + dy * dy > 4) { // Minimun distance squared
                state.updateKnifeState?.({
                    cutPoints: [...cutPoints, point],
                });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isCutting) {
            try {
                if (cutPoints.length > 2) {
                    // Execute cut operation
                    const pathData = cutPoints.reduce((acc, pt, i) => {
                        return acc + (i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`);
                    }, '');

                    // Use selected elements if any, otherwise all elements (fallback)
                    let targets = state.elements.filter(el => state.selectedIds?.includes(el.id));
                    if (targets.length === 0) {
                        targets = state.elements;
                    }

                    const { elementsToAdd, elementsToRemove } = cutElementsWithPath(targets, pathData);

                    if (elementsToRemove.length > 0) {
                        store.setState((prev) => {
                            const filtered = prev.elements.filter(el => !elementsToRemove.includes(el.id));
                            const newSelection = prev.selectedIds?.filter(id => !elementsToRemove.includes(id)) || [];
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
                console.warn('[Knife] Operation failed:', e);
            } finally {
                state.updateKnifeState?.({
                    isCutting: false,
                    cutPoints: [],
                });
            }
        }
    },
};

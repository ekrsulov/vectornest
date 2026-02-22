import { PenLine } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createShapeCutterPluginSlice, type ShapeCutterPluginSlice } from './slice';
import React from 'react';
import { ShapeCutterPanel } from './ShapeCutterPanel';
import { ShapeCutterOverlay } from './ShapeCutterOverlay';
import { cutWithShape } from './shapeCutterUtils';

export const shapeCutterPlugin: PluginDefinition<CanvasStore> = {
    id: 'shapeCutter',
    metadata: {
        label: 'Shape Cutter',
        icon: PenLine,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createShapeCutterPluginSlice)],
    toolDefinition: {
        order: 42,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Draw a freehand region to cut or keep portions of paths',
    },
    expandablePanel: () => React.createElement(ShapeCutterPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'shape-cutter-panel',
            component: ShapeCutterPanel,
            condition: (ctx) => ctx.activePlugin === 'shapeCutter',
        },
    ],
    canvasLayers: [
        {
            id: 'shape-cutter-overlay',
            placement: 'foreground',
            render: () => <ShapeCutterOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & ShapeCutterPluginSlice;
        const { cutterPoints, isCutting, mode } = state.shapeCutter || {
            cutterPoints: [], isCutting: false, mode: 'subtract' as const, enabled: true,
        };

        if (!state.shapeCutter?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateShapeCutterState?.({
                isCutting: true,
                cutterPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove' && isCutting) {
            const lastPoint = cutterPoints[cutterPoints.length - 1];
            if (!lastPoint) return;
            const dx = point.x - lastPoint.x;
            const dy = point.y - lastPoint.y;
            if (dx * dx + dy * dy > 4) {
                state.updateShapeCutterState?.({
                    cutterPoints: [...cutterPoints, point],
                });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isCutting) {
            try {
                if (cutterPoints.length > 4) {
                    const pathData = cutterPoints.reduce(
                        (acc, pt, i) => acc + (i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`),
                        ''
                    );

                    let targets = state.elements.filter((el) =>
                        state.selectedIds?.includes(el.id)
                    );
                    if (targets.length === 0) {
                        targets = state.elements;
                    }

                    const { elementsToAdd, elementsToRemove } = cutWithShape(
                        targets,
                        pathData,
                        mode
                    );

                    if (elementsToRemove.length > 0) {
                        store.setState((prev) => {
                            const filtered = prev.elements.filter(
                                (el) => !elementsToRemove.includes(el.id)
                            );
                            const newSelection =
                                prev.selectedIds?.filter(
                                    (id) => !elementsToRemove.includes(id)
                                ) || [];
                            const addedIds = elementsToAdd.map((el) => el.id);
                            return {
                                elements: [...filtered, ...elementsToAdd],
                                selectedIds: prev.selectedIds?.some((id) =>
                                    elementsToRemove.includes(id)
                                )
                                    ? [...newSelection, ...addedIds]
                                    : prev.selectedIds,
                            };
                        });
                    }
                }
            } catch (e) {
                console.warn('[ShapeCutter] Operation failed:', e);
            } finally {
                state.updateShapeCutterState?.({
                    isCutting: false,
                    cutterPoints: [],
                });
            }
        }
    },
};

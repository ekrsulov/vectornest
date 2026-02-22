import { Merge } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathWeldPluginSlice, type PathWeldPluginSlice } from './slice';
import React from 'react';
import { PathWeldPanel } from './PathWeldPanel';
import { PathWeldOverlay } from './PathWeldOverlay';
import { weldElementsWithPath } from './pathWeldUtils';

export const pathWeldPlugin: PluginDefinition<CanvasStore> = {
    id: 'pathWeld',
    metadata: {
        label: 'Path Weld',
        icon: Merge,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createPathWeldPluginSlice)],
    toolDefinition: {
        order: 41,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Draw over overlapping paths to unite them',
    },
    expandablePanel: () => React.createElement(PathWeldPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'path-weld-panel',
            component: PathWeldPanel,
            condition: (ctx) => ctx.activePlugin === 'pathWeld',
        },
    ],
    canvasLayers: [
        {
            id: 'path-weld-overlay',
            placement: 'foreground',
            render: () => <PathWeldOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & PathWeldPluginSlice;
        const { weldPoints, isWelding, weldWidth } = state.pathWeld || {
            weldPoints: [], isWelding: false, weldWidth: 4, enabled: true,
        };

        if (!state.pathWeld?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updatePathWeldState?.({
                isWelding: true,
                weldPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove' && isWelding) {
            const lastPoint = weldPoints[weldPoints.length - 1];
            if (!lastPoint) return;
            const dx = point.x - lastPoint.x;
            const dy = point.y - lastPoint.y;
            if (dx * dx + dy * dy > 4) {
                state.updatePathWeldState?.({
                    weldPoints: [...weldPoints, point],
                });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isWelding) {
            try {
                if (weldPoints.length > 2) {
                    const pathData = weldPoints.reduce(
                        (acc, pt, i) => acc + (i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`),
                        ''
                    );

                    // Use selected elements if any, otherwise all elements
                    let targets = state.elements.filter((el) =>
                        state.selectedIds?.includes(el.id)
                    );
                    if (targets.length === 0) {
                        targets = state.elements;
                    }

                    const scaledWidth = weldWidth / state.viewport.zoom;
                    const { newElement, elementsToRemove } = weldElementsWithPath(
                        targets,
                        pathData,
                        scaledWidth
                    );

                    if (newElement && elementsToRemove.length > 0) {
                        store.setState((prev) => {
                            const filtered = prev.elements.filter(
                                (el) => !elementsToRemove.includes(el.id)
                            );
                            return {
                                elements: [...filtered, newElement],
                                selectedIds: [newElement.id],
                            };
                        });
                    }
                }
            } catch (e) {
                console.warn('[PathWeld] Operation failed:', e);
            } finally {
                state.updatePathWeldState?.({
                    isWelding: false,
                    weldPoints: [],
                });
            }
        }
    },
};

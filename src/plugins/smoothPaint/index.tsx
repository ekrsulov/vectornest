import { Paintbrush } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSmoothPaintPluginSlice, type SmoothPaintPluginSlice } from './slice';
import React from 'react';
import { SmoothPaintPanel } from './SmoothPaintPanel';
import { SmoothPaintOverlay } from './SmoothPaintOverlay';
import { smoothElements } from './smoothPaintUtils';

export const smoothPaintPlugin: PluginDefinition<CanvasStore> = {
    id: 'smoothPaint',
    metadata: {
        label: 'Smooth Paint',
        icon: Paintbrush,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createSmoothPaintPluginSlice)],
    toolDefinition: {
        order: 50,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Paint over rough paths to smooth them',
    },
    expandablePanel: () => React.createElement(SmoothPaintPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'smooth-paint-panel',
            component: SmoothPaintPanel,
            condition: (ctx) => ctx.activePlugin === 'smoothPaint',
        },
    ],
    canvasLayers: [
        {
            id: 'smooth-paint-overlay',
            placement: 'foreground',
            render: () => <SmoothPaintOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & SmoothPaintPluginSlice;
        const { smoothPoints, isSmoothing, brushRadius, strength, preserveShape } =
            state.smoothPaint || {
                smoothPoints: [],
                isSmoothing: false,
                brushRadius: 30,
                strength: 5,
                preserveShape: true,
            };

        if (!state.smoothPaint?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateSmoothPaintState?.({
                isSmoothing: true,
                smoothPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isSmoothing) {
                const lastPoint = smoothPoints[smoothPoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 4) {
                    state.updateSmoothPaintState?.({
                        smoothPoints: [...smoothPoints, point],
                    });
                }
            } else {
                state.updateSmoothPaintState?.({ smoothPoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isSmoothing) {
            try {
                if (smoothPoints.length > 1) {
                    let targets = state.elements.filter((el) =>
                        state.selectedIds?.includes(el.id)
                    );
                    if (targets.length === 0) {
                        targets = state.elements;
                    }

                    const scaledRadius = brushRadius / state.viewport.zoom;

                    const modifiedElements = smoothElements(
                        targets,
                        smoothPoints,
                        scaledRadius,
                        strength,
                        preserveShape
                    );

                    if (modifiedElements.length > 0) {
                        const modifiedIds = new Set(modifiedElements.map((el) => el.id));
                        store.setState((prev) => {
                            const updated = prev.elements.map((el) => {
                                if (modifiedIds.has(el.id)) {
                                    return (
                                        modifiedElements.find((m) => m.id === el.id) ?? el
                                    );
                                }
                                return el;
                            });
                            return { elements: updated };
                        });
                    }
                }
            } catch (e) {
                console.warn('[SmoothPaint] Operation failed:', e);
            } finally {
                state.updateSmoothPaintState?.({
                    isSmoothing: false,
                    smoothPoints: [point],
                });
            }
        }
    },
};

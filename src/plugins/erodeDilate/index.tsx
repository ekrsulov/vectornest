import { Maximize2 } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createErodeDilatePluginSlice, type ErodeDilatePluginSlice } from './slice';
import React from 'react';
import { ErodeDilatePanel } from './ErodeDilatePanel';
import { ErodeDilateOverlay } from './ErodeDilateOverlay';
import { erodeOrDilateElements } from './erodeDilateUtils';

export const erodeDilatePlugin: PluginDefinition<CanvasStore> = {
    id: 'erodeDilate',
    metadata: {
        label: 'Erode / Dilate',
        icon: Maximize2,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createErodeDilatePluginSlice)],
    toolDefinition: {
        order: 45,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Paint over paths to erode (shrink) or dilate (expand) them',
    },
    expandablePanel: () => React.createElement(ErodeDilatePanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'erode-dilate-panel',
            component: ErodeDilatePanel,
            condition: (ctx) => ctx.activePlugin === 'erodeDilate',
        },
    ],
    canvasLayers: [
        {
            id: 'erode-dilate-overlay',
            placement: 'foreground',
            render: () => <ErodeDilateOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & ErodeDilatePluginSlice;
        const { brushPoints, isPainting, brushRadius, amount, mode } =
            state.erodeDilate || {
                brushPoints: [],
                isPainting: false,
                brushRadius: 30,
                amount: 3,
                mode: 'dilate' as const,
                enabled: true,
            };

        if (!state.erodeDilate?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateErodeDilateState?.({
                isPainting: true,
                brushPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isPainting) {
                const lastPoint = brushPoints[brushPoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 4) {
                    state.updateErodeDilateState?.({
                        brushPoints: [...brushPoints, point],
                    });
                }
            } else {
                state.updateErodeDilateState?.({ brushPoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isPainting) {
            try {
                if (brushPoints.length > 1) {
                    let targets = state.elements.filter((el) =>
                        state.selectedIds?.includes(el.id)
                    );
                    if (targets.length === 0) {
                        targets = state.elements;
                    }

                    const scaledRadius = brushRadius / state.viewport.zoom;
                    const scaledAmount = amount / state.viewport.zoom;

                    const modifiedElements = erodeOrDilateElements(
                        targets,
                        brushPoints,
                        scaledRadius,
                        scaledAmount,
                        mode
                    );

                    if (modifiedElements.length > 0) {
                        const modifiedIds = new Set(modifiedElements.map((el) => el.id));
                        store.setState((prev) => {
                            const updated = prev.elements.map((el) => {
                                if (modifiedIds.has(el.id)) {
                                    return modifiedElements.find((m) => m.id === el.id) ?? el;
                                }
                                return el;
                            });
                            return { elements: updated };
                        });
                    }
                }
            } catch (e) {
                console.warn('[ErodeDilate] Operation failed:', e);
            } finally {
                state.updateErodeDilateState?.({
                    isPainting: false,
                    brushPoints: [point],
                });
            }
        }
    },
};

import { SprayCan } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSprayCanPluginSlice, type SprayCanPluginSlice } from './slice';
import React from 'react';
import { SprayCanPanel } from './SprayCanPanel';
import { SprayCanOverlay } from './SprayCanOverlay';
import { createSprayDots } from './sprayCanUtils';

export const sprayCanPlugin: PluginDefinition<CanvasStore> = {
    id: 'sprayCan',
    metadata: {
        label: 'Spray Can',
        icon: SprayCan,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createSprayCanPluginSlice)],
    toolDefinition: {
        order: 46,
        toolGroup: 'creation',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Spray scattered dots and shapes on the canvas',
    },
    expandablePanel: () => React.createElement(SprayCanPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'spray-can-panel',
            component: SprayCanPanel,
            condition: (ctx) => ctx.activePlugin === 'sprayCan',
        },
    ],
    canvasLayers: [
        {
            id: 'spray-can-overlay',
            placement: 'foreground',
            render: () => <SprayCanOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & SprayCanPluginSlice;
        const { sprayPoints, isSpraying, sprayRadius, dotSize, density } = state.sprayCan || {
            sprayPoints: [], isSpraying: false, sprayRadius: 40, dotSize: 4, density: 8, enabled: true,
        };

        if (!state.sprayCan?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateSprayCanState?.({
                isSpraying: true,
                sprayPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isSpraying) {
                const lastPoint = sprayPoints[sprayPoints.length - 1];
                if (!lastPoint) return;

                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 16) {
                    state.updateSprayCanState?.({
                        sprayPoints: [...sprayPoints, point],
                    });
                }
            } else {
                // Track cursor position for overlay preview
                state.updateSprayCanState?.({ sprayPoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isSpraying) {
            try {
                if (sprayPoints.length > 0) {
                    const styleFill = state.style?.fillColor;
                    const fillColor = (styleFill && styleFill !== 'none') ? styleFill : '#000000';

                    const scaledRadius = sprayRadius / state.viewport.zoom;
                    const scaledDotSize = dotSize / state.viewport.zoom;

                    const newElements = createSprayDots(
                        sprayPoints,
                        scaledRadius,
                        scaledDotSize,
                        density,
                        fillColor,
                        state.elements
                    );

                    if (newElements.length > 0) {
                        store.setState((prev) => ({
                            elements: [...prev.elements, ...newElements],
                            selectedIds: newElements.map((el) => el.id),
                        }));
                    }
                }
            } catch (e) {
                console.warn('[SprayCan] Operation failed:', e);
            } finally {
                state.updateSprayCanState?.({
                    isSpraying: false,
                    sprayPoints: [point],
                });
            }
        }
    },
};

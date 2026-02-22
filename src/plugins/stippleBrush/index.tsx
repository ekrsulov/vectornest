import { Droplets } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createStippleBrushPluginSlice, type StippleBrushPluginSlice } from './slice';
import React from 'react';
import { StippleBrushPanel } from './StippleBrushPanel';
import { StippleBrushOverlay } from './StippleBrushOverlay';
import { createStippleDots } from './stippleBrushUtils';

export const stippleBrushPlugin: PluginDefinition<CanvasStore> = {
    id: 'stippleBrush',
    metadata: {
        label: 'Stipple Brush',
        icon: Droplets,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createStippleBrushPluginSlice)],
    toolDefinition: {
        order: 49,
        toolGroup: 'creation',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Paint stipple patterns with randomized dot sizes and distribution',
    },
    expandablePanel: () => React.createElement(StippleBrushPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'stipple-brush-panel',
            component: StippleBrushPanel,
            condition: (ctx) => ctx.activePlugin === 'stippleBrush',
        },
    ],
    canvasLayers: [
        {
            id: 'stipple-brush-overlay',
            placement: 'foreground',
            render: () => <StippleBrushOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & StippleBrushPluginSlice;
        const { stipplePoints, isStippling, brushRadius, dotSizeMin, dotSizeMax, density, sizeDistribution } =
            state.stippleBrush || {
                stipplePoints: [],
                isStippling: false,
                brushRadius: 30,
                dotSizeMin: 0.5,
                dotSizeMax: 3,
                density: 12,
                sizeDistribution: 'uniform' as const,
                enabled: true,
            };

        if (!state.stippleBrush?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateStippleBrushState?.({
                isStippling: true,
                stipplePoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isStippling) {
                const lastPoint = stipplePoints[stipplePoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 16) {
                    state.updateStippleBrushState?.({
                        stipplePoints: [...stipplePoints, point],
                    });
                }
            } else {
                state.updateStippleBrushState?.({ stipplePoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isStippling) {
            try {
                if (stipplePoints.length > 0) {
                    const styleFill = state.style?.fillColor;
                    const fillColor = (styleFill && styleFill !== 'none') ? styleFill : '#000000';

                    const scaledRadius = brushRadius / state.viewport.zoom;
                    const scaledMin = dotSizeMin / state.viewport.zoom;
                    const scaledMax = dotSizeMax / state.viewport.zoom;

                    const newElements = createStippleDots(
                        stipplePoints,
                        scaledRadius,
                        scaledMin,
                        scaledMax,
                        density,
                        sizeDistribution,
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
                console.warn('[StippleBrush] Operation failed:', e);
            } finally {
                state.updateStippleBrushState?.({
                    isStippling: false,
                    stipplePoints: [point],
                });
            }
        }
    },
};

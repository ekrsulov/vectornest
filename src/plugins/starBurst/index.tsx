import { Sparkles } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createStarBurstPluginSlice, type StarBurstPluginSlice } from './slice';
import React from 'react';
import { StarBurstPanel } from './StarBurstPanel';
import { StarBurstOverlay } from './StarBurstOverlay';
import { createStarBurst } from './starBurstUtils';

export const starBurstPlugin: PluginDefinition<CanvasStore> = {
    id: 'starBurst',
    metadata: {
        label: 'Star Burst',
        icon: Sparkles,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createStarBurstPluginSlice)],
    toolDefinition: {
        order: 51,
        toolGroup: 'creation',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Click and drag to create a radiating star burst shape',
    },
    expandablePanel: () => React.createElement(StarBurstPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'star-burst-panel',
            component: StarBurstPanel,
            condition: (ctx) => ctx.activePlugin === 'starBurst',
        },
    ],
    canvasLayers: [
        {
            id: 'star-burst-overlay',
            placement: 'foreground',
            render: () => <StarBurstOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & StarBurstPluginSlice;
        const { isDragging, dragStart, rays, innerRadiusRatio, rayStyle } =
            state.starBurst || {
                isDragging: false,
                dragStart: null,
                rays: 12,
                innerRadiusRatio: 0.4,
                rayStyle: 'pointed' as const,
                enabled: true,
            };

        if (!state.starBurst?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateStarBurstState?.({
                isDragging: true,
                dragStart: point,
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (!isDragging) {
                state.updateStarBurstState?.({ dragStart: point });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isDragging && dragStart) {
            try {
                const dx = point.x - dragStart.x;
                const dy = point.y - dragStart.y;
                const outerRadius = Math.sqrt(dx * dx + dy * dy);

                if (outerRadius > 3) {
                    const styleFill = state.style?.fillColor;
                    const fillColor = (styleFill && styleFill !== 'none') ? styleFill : '#FFD700';
                    const styleStroke = state.style?.strokeColor;
                    const strokeColor = (styleStroke && styleStroke !== 'none') ? styleStroke : '#000000';
                    const strokeWidth = state.style?.strokeWidth ?? 1;

                    const newElement = createStarBurst(
                        dragStart,
                        outerRadius,
                        rays,
                        innerRadiusRatio,
                        rayStyle,
                        fillColor,
                        strokeColor,
                        strokeWidth,
                        state.elements
                    );

                    if (newElement) {
                        store.setState((prev) => ({
                            elements: [...prev.elements, newElement],
                            selectedIds: [newElement.id],
                        }));
                    }
                }
            } catch (e) {
                console.warn('[StarBurst] Operation failed:', e);
            } finally {
                state.updateStarBurstState?.({
                    isDragging: false,
                    dragStart: null,
                });
            }
        }
    },
};

import { Zap } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createZigzagToolPluginSlice, type ZigzagToolPluginSlice } from './slice';
import React from 'react';
import { ZigzagToolPanel } from './ZigzagToolPanel';
import { ZigzagToolOverlay } from './ZigzagToolOverlay';
import { createZigzagPath } from './zigzagUtils';

export const zigzagToolPlugin: PluginDefinition<CanvasStore> = {
    id: 'zigzagTool',
    metadata: {
        label: 'Zigzag',
        icon: Zap,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createZigzagToolPluginSlice)],
    toolDefinition: {
        order: 47,
        toolGroup: 'creation',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Draw freehand to create zigzag, sine, or square wave paths',
    },
    expandablePanel: () => React.createElement(ZigzagToolPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'zigzag-tool-panel',
            component: ZigzagToolPanel,
            condition: (ctx) => ctx.activePlugin === 'zigzagTool',
        },
    ],
    canvasLayers: [
        {
            id: 'zigzag-tool-overlay',
            placement: 'foreground',
            render: () => <ZigzagToolOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & ZigzagToolPluginSlice;
        const { zigzagPoints, isDrawing, amplitude, frequency, style } =
            state.zigzagTool || {
                zigzagPoints: [],
                isDrawing: false,
                amplitude: 10,
                frequency: 8,
                style: 'zigzag' as const,
                enabled: true,
            };

        if (!state.zigzagTool?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateZigzagToolState?.({
                isDrawing: true,
                zigzagPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isDrawing) {
                const lastPoint = zigzagPoints[zigzagPoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 16) {
                    state.updateZigzagToolState?.({
                        zigzagPoints: [...zigzagPoints, point],
                    });
                }
            } else {
                state.updateZigzagToolState?.({ zigzagPoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isDrawing) {
            try {
                if (zigzagPoints.length > 1) {
                    const styleStroke = state.style?.strokeColor;
                    const strokeColor = (styleStroke && styleStroke !== 'none') ? styleStroke : '#000000';
                    const strokeWidth = state.style?.strokeWidth ?? 2;

                    const scaledAmplitude = amplitude / state.viewport.zoom;

                    const newElement = createZigzagPath(
                        zigzagPoints,
                        scaledAmplitude,
                        frequency,
                        style,
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
                console.warn('[ZigzagTool] Operation failed:', e);
            } finally {
                state.updateZigzagToolState?.({
                    isDrawing: false,
                    zigzagPoints: [point],
                });
            }
        }
    },
};

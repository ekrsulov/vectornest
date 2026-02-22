import { Cable } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createBridgeToolPluginSlice, type BridgeToolPluginSlice } from './slice';
import React from 'react';
import { BridgeToolPanel } from './BridgeToolPanel';
import { BridgeToolOverlay } from './BridgeToolOverlay';
import { bridgeElements } from './bridgeUtils';

export const bridgeToolPlugin: PluginDefinition<CanvasStore> = {
    id: 'bridgeTool',
    metadata: {
        label: 'Bridge',
        icon: Cable,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createBridgeToolPluginSlice)],
    toolDefinition: {
        order: 49,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Draw a stroke between paths to bridge/connect them',
    },
    expandablePanel: () => React.createElement(BridgeToolPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'bridge-tool-panel',
            component: BridgeToolPanel,
            condition: (ctx) => ctx.activePlugin === 'bridgeTool',
        },
    ],
    canvasLayers: [
        {
            id: 'bridge-tool-overlay',
            placement: 'foreground',
            render: () => <BridgeToolOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & BridgeToolPluginSlice;
        const { bridgePoints, isDrawing, bridgeWidth, smooth } = state.bridgeTool || {
            bridgePoints: [],
            isDrawing: false,
            bridgeWidth: 8,
            smooth: true,
        };

        if (eventType === 'pointerdown') {
            state.updateBridgeToolState?.({
                isDrawing: true,
                bridgePoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isDrawing) {
                const lastPoint = bridgePoints[bridgePoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 4) {
                    state.updateBridgeToolState?.({
                        bridgePoints: [...bridgePoints, point],
                    });
                }
            } else {
                state.updateBridgeToolState?.({ bridgePoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isDrawing) {
            try {
                if (bridgePoints.length > 2) {
                    const targets = state.elements.filter((el) => el.type === 'path');
                    const scaledWidth = bridgeWidth / state.viewport.zoom;

                    const result = bridgeElements(targets, bridgePoints, scaledWidth, smooth);

                    if (result.newElement) {
                        const removeSet = new Set(result.elementsToRemove);
                        store.setState((prev) => ({
                            elements: [
                                ...prev.elements.filter((el) => !removeSet.has(el.id)),
                                result.newElement!,
                            ],
                            selectedIds: [result.newElement!.id],
                        }));
                    }
                }
            } catch (e) {
                console.warn('[BridgeTool] Operation failed:', e);
            } finally {
                state.updateBridgeToolState?.({
                    isDrawing: false,
                    bridgePoints: [point],
                });
            }
        }
    },
};

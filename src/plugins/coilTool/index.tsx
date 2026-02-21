import { Shell } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createCoilToolPluginSlice, type CoilToolPluginSlice } from './slice';
import { CoilToolPanel } from './CoilToolPanel';
import { CoilToolOverlay } from './CoilToolOverlay';
import { createCoilPath } from './coilUtils';

export const coilToolPlugin: PluginDefinition<CanvasStore> = {
    id: 'coilTool',
    metadata: {
        label: 'Coil',
        icon: Shell,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createCoilToolPluginSlice)],
    toolDefinition: {
        order: 50,
        toolGroup: 'creation',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Draw freehand to create a coil/spring path',
    },
    sidebarPanels: [
        {
            key: 'coil-tool-panel',
            component: CoilToolPanel,
            condition: (ctx) => ctx.activePlugin === 'coilTool',
        },
    ],
    canvasLayers: [
        {
            id: 'coil-tool-overlay',
            placement: 'foreground',
            render: () => <CoilToolOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & CoilToolPluginSlice;
        const { coilPoints, isDrawing, coilRadius, turns, taper } =
            state.coilTool || {
                coilPoints: [],
                isDrawing: false,
                coilRadius: 15,
                turns: 12,
                taper: false,
                enabled: true,
            };

        if (!state.coilTool?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateCoilToolState?.({
                isDrawing: true,
                coilPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isDrawing) {
                const lastPoint = coilPoints[coilPoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 16) {
                    state.updateCoilToolState?.({
                        coilPoints: [...coilPoints, point],
                    });
                }
            } else {
                state.updateCoilToolState?.({ coilPoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isDrawing) {
            try {
                if (coilPoints.length > 1) {
                    const styleStroke = state.style?.strokeColor;
                    const strokeColor = (styleStroke && styleStroke !== 'none') ? styleStroke : '#000000';
                    const strokeWidth = state.style?.strokeWidth ?? 2;

                    const scaledRadius = coilRadius / state.viewport.zoom;

                    const newElement = createCoilPath(
                        coilPoints,
                        scaledRadius,
                        turns,
                        taper,
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
                console.warn('[CoilTool] Operation failed:', e);
            } finally {
                state.updateCoilToolState?.({
                    isDrawing: false,
                    coilPoints: [point],
                });
            }
        }
    },
};

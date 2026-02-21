import { CornerDownRight } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createCornerRounderPluginSlice, type CornerRounderPluginSlice } from './slice';
import { CornerRounderPanel } from './CornerRounderPanel';
import { CornerRounderOverlay } from './CornerRounderOverlay';
import { roundCorners } from './cornerRounderUtils';

export const cornerRounderPlugin: PluginDefinition<CanvasStore> = {
    id: 'cornerRounder',
    metadata: {
        label: 'Corner Rounder',
        icon: CornerDownRight,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createCornerRounderPluginSlice)],
    toolDefinition: {
        order: 44,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Paint over sharp corners to round them with bezier curves',
    },
    sidebarPanels: [
        {
            key: 'corner-rounder-panel',
            component: CornerRounderPanel,
            condition: (ctx) => ctx.activePlugin === 'cornerRounder',
        },
    ],
    canvasLayers: [
        {
            id: 'corner-rounder-overlay',
            placement: 'foreground',
            render: () => <CornerRounderOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & CornerRounderPluginSlice;
        const { roundPoints, isRounding, roundRadius, brushSize } = state.cornerRounder || {
            roundPoints: [],
            isRounding: false,
            roundRadius: 10,
            brushSize: 20,
            enabled: true,
        };

        if (!state.cornerRounder?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateCornerRounderState?.({
                isRounding: true,
                roundPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isRounding) {
                const lastPoint = roundPoints[roundPoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 4) {
                    state.updateCornerRounderState?.({
                        roundPoints: [...roundPoints, point],
                    });
                }
            } else {
                state.updateCornerRounderState?.({ roundPoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isRounding) {
            try {
                if (roundPoints.length > 0) {
                    let targets = state.elements.filter((el) =>
                        state.selectedIds?.includes(el.id)
                    );
                    if (targets.length === 0) {
                        targets = state.elements;
                    }

                    const scaledBrush = brushSize / state.viewport.zoom;
                    const scaledRadius = roundRadius / state.viewport.zoom;

                    const modifiedElements = roundCorners(
                        targets,
                        roundPoints,
                        scaledBrush,
                        scaledRadius
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
                console.warn('[CornerRounder] Operation failed:', e);
            } finally {
                state.updateCornerRounderState?.({
                    isRounding: false,
                    roundPoints: [point],
                });
            }
        }
    },
};

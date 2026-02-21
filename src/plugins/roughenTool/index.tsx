import { Brush } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createRoughenToolPluginSlice, type RoughenToolPluginSlice } from './slice';
import { RoughenToolPanel } from './RoughenToolPanel';
import { RoughenToolOverlay } from './RoughenToolOverlay';
import { roughenElements } from './roughenUtils';

export const roughenToolPlugin: PluginDefinition<CanvasStore> = {
    id: 'roughenTool',
    metadata: {
        label: 'Roughen',
        icon: Brush,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createRoughenToolPluginSlice)],
    toolDefinition: {
        order: 43,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Paint over paths to add roughness and a hand-drawn feel',
    },
    sidebarPanels: [
        {
            key: 'roughen-tool-panel',
            component: RoughenToolPanel,
            condition: (ctx) => ctx.activePlugin === 'roughenTool',
        },
    ],
    canvasLayers: [
        {
            id: 'roughen-tool-overlay',
            placement: 'foreground',
            render: () => <RoughenToolOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & RoughenToolPluginSlice;
        const { roughenPoints, isRoughening, roughenRadius, intensity, detail } =
            state.roughenTool || {
                roughenPoints: [],
                isRoughening: false,
                roughenRadius: 30,
                intensity: 5,
                detail: 4,
                enabled: true,
            };

        if (!state.roughenTool?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateRoughenToolState?.({
                isRoughening: true,
                roughenPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isRoughening) {
                const lastPoint = roughenPoints[roughenPoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 4) {
                    state.updateRoughenToolState?.({
                        roughenPoints: [...roughenPoints, point],
                    });
                }
            } else {
                state.updateRoughenToolState?.({ roughenPoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isRoughening) {
            try {
                if (roughenPoints.length > 1) {
                    let targets = state.elements.filter((el) =>
                        state.selectedIds?.includes(el.id)
                    );
                    if (targets.length === 0) {
                        targets = state.elements;
                    }

                    const scaledRadius = roughenRadius / state.viewport.zoom;
                    const scaledIntensity = intensity / state.viewport.zoom;

                    const modifiedElements = roughenElements(
                        targets,
                        roughenPoints,
                        scaledRadius,
                        scaledIntensity,
                        detail
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
                console.warn('[RoughenTool] Operation failed:', e);
            } finally {
                state.updateRoughenToolState?.({
                    isRoughening: false,
                    roughenPoints: [point],
                });
            }
        }
    },
};

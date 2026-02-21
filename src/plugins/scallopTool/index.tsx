import { Waves } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createScallopToolPluginSlice, type ScallopToolPluginSlice } from './slice';
import { ScallopToolPanel } from './ScallopToolPanel';
import { ScallopToolOverlay } from './ScallopToolOverlay';
import { scallopElements } from './scallopUtils';

export const scallopToolPlugin: PluginDefinition<CanvasStore> = {
    id: 'scallopTool',
    metadata: {
        label: 'Scallop',
        icon: Waves,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createScallopToolPluginSlice)],
    toolDefinition: {
        order: 47,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Paint over paths to add scalloped wavy edges',
    },
    sidebarPanels: [
        {
            key: 'scallop-tool-panel',
            component: ScallopToolPanel,
            condition: (ctx) => ctx.activePlugin === 'scallopTool',
        },
    ],
    canvasLayers: [
        {
            id: 'scallop-tool-overlay',
            placement: 'foreground',
            render: () => <ScallopToolOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & ScallopToolPluginSlice;
        const { scallopPoints, isScalloping, brushRadius, scallopSize, complexity } =
            state.scallopTool || {
                scallopPoints: [],
                isScalloping: false,
                brushRadius: 30,
                scallopSize: 5,
                complexity: 3,
                enabled: true,
            };

        if (!state.scallopTool?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateScallopToolState?.({
                isScalloping: true,
                scallopPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isScalloping) {
                const lastPoint = scallopPoints[scallopPoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 4) {
                    state.updateScallopToolState?.({
                        scallopPoints: [...scallopPoints, point],
                    });
                }
            } else {
                state.updateScallopToolState?.({ scallopPoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isScalloping) {
            try {
                if (scallopPoints.length > 1) {
                    let targets = state.elements.filter((el) =>
                        state.selectedIds?.includes(el.id)
                    );
                    if (targets.length === 0) {
                        targets = state.elements;
                    }

                    const scaledRadius = brushRadius / state.viewport.zoom;
                    const scaledSize = scallopSize / state.viewport.zoom;

                    const modifiedElements = scallopElements(
                        targets,
                        scallopPoints,
                        scaledRadius,
                        scaledSize,
                        complexity
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
                console.warn('[ScallopTool] Operation failed:', e);
            } finally {
                state.updateScallopToolState?.({
                    isScalloping: false,
                    scallopPoints: [point],
                });
            }
        }
    },
};

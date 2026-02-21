import { Stamp } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createStampBrushPluginSlice, type StampBrushPluginSlice } from './slice';
import { StampBrushPanel } from './StampBrushPanel';
import { StampBrushOverlay } from './StampBrushOverlay';
import { createStampedCopies } from './stampBrushUtils';

export const stampBrushPlugin: PluginDefinition<CanvasStore> = {
    id: 'stampBrush',
    metadata: {
        label: 'Stamp Brush',
        icon: Stamp,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createStampBrushPluginSlice)],
    toolDefinition: {
        order: 48,
        toolGroup: 'creation',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Stamp copies of the selected element along a freehand stroke',
    },
    sidebarPanels: [
        {
            key: 'stamp-brush-panel',
            component: StampBrushPanel,
            condition: (ctx) => ctx.activePlugin === 'stampBrush',
        },
    ],
    canvasLayers: [
        {
            id: 'stamp-brush-overlay',
            placement: 'foreground',
            render: () => <StampBrushOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & StampBrushPluginSlice;
        const { stampPoints, isStamping, spacing, scaleVariation, rotationVariation, sizeMultiplier } =
            state.stampBrush || {
                stampPoints: [],
                isStamping: false,
                spacing: 40,
                scaleVariation: 0.2,
                rotationVariation: 15,
                sizeMultiplier: 1.0,
                enabled: true,
            };

        if (!state.stampBrush?.enabled) return;

        if (eventType === 'pointerdown') {
            state.updateStampBrushState?.({
                isStamping: true,
                stampPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove') {
            if (isStamping) {
                const lastPoint = stampPoints[stampPoints.length - 1];
                if (!lastPoint) return;
                const dx = point.x - lastPoint.x;
                const dy = point.y - lastPoint.y;
                if (dx * dx + dy * dy > 16) {
                    state.updateStampBrushState?.({
                        stampPoints: [...stampPoints, point],
                    });
                }
            } else {
                state.updateStampBrushState?.({ stampPoints: [point] });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isStamping) {
            try {
                if (stampPoints.length > 1) {
                    // Use the first selected element as the stamp source
                    const selectedIds = state.selectedIds ?? [];
                    const sourceElement = state.elements.find(
                        (el) => selectedIds.includes(el.id) && el.type === 'path'
                    );

                    if (sourceElement) {
                        const scaledSpacing = spacing / state.viewport.zoom;

                        const newElements = createStampedCopies(
                            sourceElement,
                            stampPoints,
                            scaledSpacing,
                            scaleVariation,
                            rotationVariation,
                            sizeMultiplier,
                            state.elements
                        );

                        if (newElements.length > 0) {
                            store.setState((prev) => ({
                                elements: [...prev.elements, ...newElements],
                                selectedIds: newElements.map((el) => el.id),
                            }));
                        }
                    }
                }
            } catch (e) {
                console.warn('[StampBrush] Operation failed:', e);
            } finally {
                state.updateStampBrushState?.({
                    isStamping: false,
                    stampPoints: [point],
                });
            }
        }
    },
};

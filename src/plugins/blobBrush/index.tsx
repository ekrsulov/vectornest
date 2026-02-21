import { Paintbrush } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createBlobBrushPluginSlice, type BlobBrushPluginSlice } from './slice';
import { BlobBrushPanel } from './BlobBrushPanel';
import { BlobBrushOverlay } from './BlobBrushOverlay';
import { createBlobBrushShape } from './blobBrushUtils';

export const blobBrushPlugin: PluginDefinition<CanvasStore> = {
    id: 'blobBrush',
    metadata: {
        label: 'Blob Brush',
        icon: Paintbrush,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createBlobBrushPluginSlice)],
    toolDefinition: {
        order: 45,
        toolGroup: 'creation',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Draw filled shapes that automatically merge',
    },
    sidebarPanels: [
        {
            key: 'blob-brush-panel',
            component: BlobBrushPanel,
            condition: (ctx) => ctx.activePlugin === 'blobBrush',
        },
    ],
    canvasLayers: [
        {
            id: 'blob-brush-overlay',
            placement: 'foreground',
            render: () => <BlobBrushOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, _target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & BlobBrushPluginSlice;
        const { brushPoints, isDrawing, enabled, brushSize } = state.blobBrush || { brushPoints: [], isDrawing: false, enabled: true, brushSize: 20 };

        if (!enabled) return;

        if (eventType === 'pointerdown') {
            state.updateBlobBrushState?.({
                isDrawing: true,
                brushPoints: [point],
            });
            return;
        }

        if (eventType === 'pointermove' && isDrawing) {
            // Add point if moved enough to avoid dense point clumps
            const lastPoint = brushPoints[brushPoints.length - 1];
            if (!lastPoint) return;

            const dx = point.x - lastPoint.x;
            const dy = point.y - lastPoint.y;
            if (dx * dx + dy * dy > 4) { // Minimun distance squared
                state.updateBlobBrushState?.({
                    brushPoints: [...brushPoints, point],
                });
            }
            return;
        }

        if ((eventType === 'pointerup' || eventType === 'pointercancel') && isDrawing) {
            try {
                if (brushPoints.length > 0) {
                    // Ensure we have a fill color
                    const styleFill = state.style?.fillColor;
                    const fillColor = (styleFill && styleFill !== 'none') ? styleFill : '#000000';

                    // Generate the solid shape and merge it
                    const { newElement, elementsToRemove } = createBlobBrushShape(
                        brushPoints,
                        brushSize / state.viewport.zoom, // scale brush to canvas units
                        fillColor,
                        state.elements
                    );

                    if (newElement) {
                        store.setState((prev) => {
                            const filtered = elementsToRemove.length > 0
                                ? prev.elements.filter(el => !elementsToRemove.includes(el.id))
                                : prev.elements;
                            return {
                                elements: [...filtered, newElement],
                                selectedIds: [newElement.id],
                            };
                        });
                    }
                }
            } catch (e) {
                console.warn('[BlobBrush] Operation failed:', e);
            } finally {
                state.updateBlobBrushState?.({
                    isDrawing: false,
                    brushPoints: [],
                });
            }
        }
    },
};

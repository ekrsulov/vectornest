import { SquareSplitHorizontal } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createFractureToolPluginSlice, type FractureToolPluginSlice } from './slice';
import React from 'react';
import { FractureToolPanel } from './FractureToolPanel';
import { FractureToolOverlay } from './FractureToolOverlay';
import { fractureElement } from './fractureUtils';

export const fractureToolPlugin: PluginDefinition<CanvasStore> = {
    id: 'fractureTool',
    metadata: {
        label: 'Fracture',
        icon: SquareSplitHorizontal,
        cursor: 'crosshair',
    },
    slices: [createPluginSlice(createFractureToolPluginSlice)],
    toolDefinition: {
        order: 48,
        toolGroup: 'advanced',
    },
    behaviorFlags: () => ({
        preventsSelection: true,
        hideSelectionOverlay: true,
        hideSelectionBbox: true,
    }),
    modeConfig: {
        description: 'Click on a closed path to fracture it into multiple pieces',
    },
    expandablePanel: () => React.createElement(FractureToolPanel, { hideTitle: true }),
    sidebarPanels: [
        {
            key: 'fracture-tool-panel',
            component: FractureToolPanel,
            condition: (ctx) => ctx.activePlugin === 'fractureTool',
        },
    ],
    canvasLayers: [
        {
            id: 'fracture-tool-overlay',
            placement: 'foreground',
            render: () => <FractureToolOverlay />,
        },
    ],
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (event, point, target, context) => {
        const eventType = event.type;
        const store = context.store;
        const state = store.getState() as CanvasStore & FractureToolPluginSlice;
        const { numPieces, pattern } = state.fractureTool || {
            fracturePoints: [],
            isDrawing: false,
            numPieces: 6,
            pattern: 'voronoi' as const,
            enabled: true,
        };

        if (!state.fractureTool?.enabled) return;

        if (eventType === 'pointermove') {
            state.updateFractureToolState?.({ fracturePoints: [point] });
            return;
        }

        if (eventType === 'pointerdown') {
            state.updateFractureToolState?.({
                isDrawing: true,
                fracturePoints: [point],
            });
            return;
        }

        if (eventType === 'pointerup' || eventType === 'pointercancel') {
            try {
                // Find the clicked element
                const elementId = target?.getAttribute?.('data-element-id');
                if (!elementId) return;

                const targetElement = state.elements.find((el) => el.id === elementId);
                if (!targetElement || targetElement.type !== 'path') return;

                const result = fractureElement(
                    targetElement,
                    numPieces,
                    pattern,
                    state.elements
                );

                if (result && result.newElements.length > 0) {
                    store.setState((prev) => ({
                        elements: [
                            ...prev.elements.filter((el) => el.id !== result.elementToRemove),
                            ...result.newElements,
                        ],
                        selectedIds: result.newElements.map((el) => el.id),
                    }));
                }
            } catch (e) {
                console.warn('[FractureTool] Operation failed:', e);
            } finally {
                state.updateFractureToolState?.({
                    isDrawing: false,
                    fracturePoints: [point],
                });
            }
        }
    },
};

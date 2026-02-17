import React from 'react';
import type {
    PluginDefinition,
    CanvasLayerContribution,
    CanvasLayerPlacement,
} from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';

export class PluginLayerManager {
    private canvasLayers = new Map<string, CanvasLayerContribution[]>();
    private canvasLayerOrder: string[] = [];

    constructor() { }

    register(plugin: PluginDefinition<CanvasStore>): void {
        const layerContributions = this.composeCanvasLayers(plugin);
        this.setCanvasLayers(plugin.id, layerContributions);
    }

    unregister(pluginId: string): void {
        this.unregisterCanvasLayers(pluginId);
    }

    registerCanvasLayers(pluginId: string, layers: CanvasLayerContribution[]): void {
        this.setCanvasLayers(pluginId, layers);
    }

    unregisterCanvasLayers(pluginId: string): void {
        this.canvasLayers.delete(pluginId);
        this.canvasLayerOrder = this.canvasLayerOrder.filter((id) => id !== pluginId);
    }

    getCanvasLayers(isPluginEnabled: (id: string) => boolean): Array<CanvasLayerContribution & { pluginId: string }> {
        const placementBuckets: Record<CanvasLayerPlacement, Array<CanvasLayerContribution & { pluginId: string }>> = {
            background: [],
            midground: [],
            foreground: [],
        };

        for (const pluginId of this.canvasLayerOrder) {
            if (!isPluginEnabled(pluginId)) continue;

            const layers = this.canvasLayers.get(pluginId);
            if (!layers?.length) {
                continue;
            }

            layers.forEach((layer) => {
                const placement = layer.placement ?? 'midground';
                placementBuckets[placement].push({ ...layer, pluginId });
            });
        }

        const placementOrder: CanvasLayerPlacement[] = ['background', 'midground', 'foreground'];
        return placementOrder.flatMap((placement) => placementBuckets[placement]);
    }

    private composeCanvasLayers(plugin: PluginDefinition<CanvasStore>): CanvasLayerContribution[] {
        const layers = [...(plugin.canvasLayers ?? [])];

        if (plugin.overlays?.length) {
            plugin.overlays.forEach((overlay) => {
                // Skip global overlays - they are rendered by GlobalOverlays component, not as canvas layers
                if (overlay.placement === 'global') {
                    return;
                }

                const OverlayComponent = overlay.component as React.ComponentType<Record<string, unknown>>;
                layers.push({
                    id: `overlay-${overlay.id}`,
                    placement: 'foreground',
                    render: ({ activePlugin, viewport }) => {
                        return plugin.id === activePlugin
                            ? React.createElement(OverlayComponent, { viewport })
                            : null;
                    },
                });
            });
        }

        return layers;
    }

    private setCanvasLayers(pluginId: string, layers: CanvasLayerContribution[]): void {
        if (!layers.length) {
            this.unregisterCanvasLayers(pluginId);
            return;
        }

        if (!this.canvasLayerOrder.includes(pluginId)) {
            this.canvasLayerOrder.push(pluginId);
        }

        this.canvasLayers.set(pluginId, layers);
    }
}

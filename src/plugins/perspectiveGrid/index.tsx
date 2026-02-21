import { Grid3X3 } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPerspectiveGridPluginSlice, type PerspectiveGridPluginSlice } from './slice';
import { PerspectiveGridPanel } from './PerspectiveGridPanel';
import { PerspectiveGridLayer } from './PerspectiveGridLayer';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { registerSnapProvider, unregisterSnapProvider } from '../../snap/snapProviderRegistry';

registerStateKeys('perspectiveGrid', ['perspectiveGrid'], 'temporal');

export const perspectiveGridPlugin: PluginDefinition<CanvasStore> = {
    id: 'perspectiveGrid',
    metadata: {
        label: 'Perspective Grid',
        icon: Grid3X3,
        cursor: 'default',
    },
    slices: [createPluginSlice(createPerspectiveGridPluginSlice)],
    sidebarPanels: [
        createSettingsPanel('perspective-grid-settings', PerspectiveGridPanel),
    ],
    canvasLayers: [
        {
            id: 'perspective-grid-layer',
            placement: 'background',
            render: () => <PerspectiveGridLayer />,
        },
    ],
    init: (_context) => {
        // Register custom snap provider into VectorNest's snapping engine
        registerSnapProvider({
            pluginId: 'perspectiveGrid',
            priority: 60,
            isActive: (state) => {
                const pGrid = (state as CanvasStore & PerspectiveGridPluginSlice).perspectiveGrid;
                return Boolean(pGrid?.enabled && pGrid?.snapEnabled);
            },
            getOverlayConfig: () => null, // We handle our own visual overlay via canvasLayers
        });

        return () => {
            unregisterSnapProvider('perspectiveGrid');
        };
    },
};

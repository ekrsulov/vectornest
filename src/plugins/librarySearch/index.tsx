import { Search } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { LibrarySearchPanel } from './LibrarySearchPanel';

export const librarySearchPlugin: PluginDefinition<CanvasStore> = {
    id: 'library-search',
    metadata: {
        label: 'Library Search',
        icon: Search,
        cursor: 'default',
    },
    behaviorFlags: () => ({
        isSidebarPanelMode: true,
    }),
    // Register as a library panel contribution
    relatedPluginPanels: [
        {
            id: 'library-search-panel',
            targetPlugin: 'library',
            component: LibrarySearchPanel,
            order: 0, // Ensure it appears at the top
        },
    ],
};

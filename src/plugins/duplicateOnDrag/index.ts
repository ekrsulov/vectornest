import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createDuplicateOnDragPluginSlice } from './slice';
import type { DuplicateOnDragPluginSlice } from './slice';
import { pluginManager } from '../../utils/pluginManager';
import { duplicateOnDragService } from './service';
import { useDuplicateOnDragHook } from './hooks/useDuplicateOnDragHook';
import { createPluginSlice } from '../../utils/pluginUtils';

const duplicateOnDragSliceFactory = createPluginSlice(createDuplicateOnDragPluginSlice);
export const duplicateOnDragPlugin: PluginDefinition<CanvasStore> = {
  id: 'duplicate-on-drag',
  metadata: {
    label: 'Duplicate on Drag',
    cursor: 'default',
  },
  // This plugin doesn't have a handler because it works via Canvas Service
  // It listens to events globally, not as an active tool
  slices: [duplicateOnDragSliceFactory],
  hooks: [
    {
      id: 'duplicate-on-drag-hook',
      hook: useDuplicateOnDragHook,
      global: true, // This hook runs regardless of active plugin to listen for Cmd+Drag gestures
    },
  ],
  init: () => {
    pluginManager.registerCanvasService(duplicateOnDragService);
    return () => {
      pluginManager.unregisterCanvasService(duplicateOnDragService.id);
    };
  },
};

export type { DuplicateOnDragPluginSlice };
export { duplicateOnDragService, DUPLICATE_ON_DRAG_SERVICE_ID } from './service';

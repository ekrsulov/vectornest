import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createToolPanel } from '../../utils/pluginFactories';
import { Wand2 } from 'lucide-react';
import { createPotracePluginSlice } from './slice';
import type { PotracePluginSlice } from './slice';
import { PotracePanel } from './PotracePanel';

const potraceSliceFactory = createPluginSlice(createPotracePluginSlice);
export const potracePlugin: PluginDefinition<CanvasStore> = {
  id: 'potrace',
  metadata: {
    label: 'Potrace',
    icon: Wand2,
    cursor: 'default',
  },
  behaviorFlags: () => ({
    isSidebarPanelMode: true,
  }),
  subscribedEvents: ['pointerdown'],
  handler: (_event, _point, _target, context) => {
    // Return to select mode when canvas is clicked
    context.store.getState().setMode('select');
  },
  slices: [potraceSliceFactory],

  toolDefinition: {
    order: 20,
    visibility: 'dynamic',
    toolGroup: 'advanced',
    isDisabled: (store) => store.selectedIds.length === 0,
  },
  sidebarPanels: [createToolPanel('potrace', PotracePanel)],
};

export type { PotracePluginSlice };
export { PotracePanel };

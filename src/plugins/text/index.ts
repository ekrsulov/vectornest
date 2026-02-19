import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createToolPanel } from '../../utils/pluginFactories';
import { RemoveFormatting } from 'lucide-react';
import { createTextPluginSlice } from './slice';
import React from 'react';
import { TextPanel } from './TextPanel';
import { addText } from './actions';

type TextPluginApi = {
  addText: (x: number, y: number, text: string) => Promise<void> | void;
};

const textSliceFactory = createPluginSlice(createTextPluginSlice);
export const textPlugin: PluginDefinition<CanvasStore> = {
  id: 'text',
  metadata: {
    label: 'Text',
    icon: RemoveFormatting,
    cursor: 'text',
  },
  modeConfig: {
    description: 'Inserts and edits text.',
  },
  toolDefinition: { order: 13, visibility: 'always-shown', toolGroup: 'creation' },
  handler: (_event, point, _target, context) => {
    const state = context.store.getState();
    const api = context.api as TextPluginApi;
    void api.addText(point.x, point.y, state.text?.text ?? '');
  },
  keyboardShortcuts: {
    Enter: () => {
      // Reserved for text tool specific keyboard interaction
    },
  },
  slices: [textSliceFactory],
  createApi: ({ store }) => ({
    addText: (x: number, y: number, text: string) => {
      return addText(x, y, text, store.getState);
    },
  }),
  expandablePanel: () => React.createElement(TextPanel, { hideTitle: true }),
  sidebarPanels: [createToolPanel('text', TextPanel)],
};


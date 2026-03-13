import { Bot } from 'lucide-react';
import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createLlmAssistantSlice } from './slice';
import { createSettingsPanel } from '../../utils/pluginFactories';

const LlmAssistantPanel = React.lazy(() =>
  import('./LlmAssistantPanel').then((module) => ({ default: module.LlmAssistantPanel }))
);
const LlmAssistantSettingsPanel = React.lazy(() =>
  import('./LlmAssistantSettingsPanel').then((module) => ({ default: module.LlmAssistantSettingsPanel }))
);

export const llmAssistantPlugin: PluginDefinition<CanvasStore> = {
  id: 'llmAssistant',
  metadata: {
    label: 'LLM Assistant',
    icon: Bot,
    cursor: 'default',
  },
  slices: [createLlmAssistantSlice],
  sidebarPanels: [
    {
      key: 'llm-assistant',
      condition: (ctx) =>
        ctx.llmAssistantConfigured === true &&
        !ctx.isInSpecialPanelMode &&
        (!ctx.activePlugin || ctx.activePlugin === 'select'),
      component: LlmAssistantPanel,
    },
    createSettingsPanel('llm-assistant-settings', LlmAssistantSettingsPanel, {
      title: 'LLM Assistant',
    }),
  ],
  handler: () => { },
};

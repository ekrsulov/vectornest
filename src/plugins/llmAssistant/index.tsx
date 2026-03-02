import { Bot } from 'lucide-react';
import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createLlmAssistantSlice } from './slice';

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
    {
      key: 'llm-assistant-settings',
      condition: (ctx) => ctx.showFilePanel,
      component: LlmAssistantSettingsPanel,
    },
  ],
  handler: () => { },
};

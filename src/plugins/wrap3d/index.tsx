import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createToolPanel } from '../../utils/pluginFactories';
import { createWrap3DSlice } from './slice';
import type { Wrap3DSlice } from './slice';
import React from 'react';
import { Wrap3DPanel } from './Wrap3DPanel';
import { Wrap3DPreviewLayer } from './Wrap3DPreviewLayer';
import { Box } from 'lucide-react';
import { pluginManager } from '../../utils/pluginManager';
import { selectionHasOnlyPaths } from '../../utils/selectionGuards';

const wrap3dSliceFactory = createPluginSlice(createWrap3DSlice);
 
export const wrap3dPlugin: PluginDefinition<CanvasStore> = {
  id: 'wrap3d',
  metadata: {
    label: 'Wrap 3D',
    icon: Box,
    cursor: 'default',
    disablePathInteraction: true,
  },
  behaviorFlags: () => ({
    hideSelectionOverlay: true,
  }),
  modeConfig: {
    description: '3D surface projection tool for wrapping paths onto various 3D shapes with rotation controls.',
    entry: ['clearSubpathSelection', 'clearSelectedCommands'],
    exit: ['deactivateWrap3DTool'],
  },
  toolDefinition: {
    order: 23,
    visibility: 'dynamic',
    toolGroup: 'advanced',
    isDisabled: (store) => {
      const state = store as CanvasStore & Wrap3DSlice;
      return !selectionHasOnlyPaths(state.selectedIds || [], state.elements || []);
    },
  },
  subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
  handler: (_event, _point, _target, context) => {
    const store = context.store;
    const state = store.getState() as CanvasStore & Wrap3DSlice;
    const activePlugin = state.activePlugin;

    // Auto-deactivate if plugin changed
    if (activePlugin !== 'wrap3d' && state.isActive) {
      state.deactivateWrap3DTool?.();
      return;
    }

    // Ensure tool initialized on first interaction
    if (!state.isActive) {
      state.activateWrap3DTool?.();
    }
  },
  keyboardShortcuts: {
    Escape: (_event, context) => {
      const store = context.store;
      const state = store.getState() as CanvasStore & Wrap3DSlice;

      if (state.isActive) {
        state.deactivateWrap3DTool?.();
        // Return to select mode
        state.setActivePlugin?.('select');
      }
    },
  },
  init: (context) => {
    // Clear state when entering wrap3d mode
    const unregisterModeEnter = pluginManager.registerLifecycleAction(
      'onModeEnter:wrap3d',
      () => {
        console.log('[Wrap3D] Mode entered - cleaning up and activating tool');
        const state = context.store.getState() as CanvasStore & Wrap3DSlice;

        // First deactivate to ensure clean state (handles any residual state)
        if (state.isActive || state.isLivePreview || state.originalPaths) {
          console.log('[Wrap3D] Found residual state, cleaning up first');
          state.deactivateWrap3DTool?.();
        }

        // Then activate fresh
        state.activateWrap3DTool?.();
      }
    );

    // Clean up when exiting wrap3d mode
    const unregisterModeExit = pluginManager.registerLifecycleAction(
      'onModeExit:wrap3d',
      () => {
        console.log('[Wrap3D] Mode exited - deactivating tool and clearing all state');
        const state = context.store.getState() as CanvasStore & Wrap3DSlice;
        state.deactivateWrap3DTool?.();
      }
    );

    return () => {
      unregisterModeEnter();
      unregisterModeExit();
    };
  },
  canvasLayers: [
    {
      id: 'wrap3d-preview',
      placement: 'midground',
      render: ({ viewport }) => {
        return <Wrap3DPreviewLayer viewport={viewport} />;
      },
    },
  ],
  slices: [wrap3dSliceFactory],
  expandablePanel: () => React.createElement(Wrap3DPanel, { hideTitle: true }),
  sidebarPanels: [createToolPanel('wrap3d', Wrap3DPanel)],
};


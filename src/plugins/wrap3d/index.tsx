import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createToolPanel } from '../../utils/pluginFactories';
import { createWrap3DSlice } from './slice';
import type { Wrap3DSlice } from './slice';
import { Wrap3DPanel } from './Wrap3DPanel';
import { Wrap3DPreviewLayer } from './Wrap3DPreviewLayer';
import { Box } from 'lucide-react';
import { pluginManager } from '../../utils/pluginManager';
import { selectionHasOnlyPaths } from '../../utils/selectionGuards';

const wrap3dSliceFactory = createPluginSlice(createWrap3DSlice);
// eslint-disable-next-line react-refresh/only-export-components
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
  contextMenuActions: [
    {
      id: 'wrap-3d',
      action: (context) => {
        // Wrap 3D is available for paths, groups, or mixed selections
        if (context.type !== 'path' && context.type !== 'group' && context.type !== 'multiselection') {
          return null;
        }

        const store = pluginManager.requireStoreApi();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = store.getState() as any;

        if (!state.canApplyWrap3D?.()) return null;

        return {
          id: 'wrap-3d',
          label: 'Wrap 3D',
          icon: Box,
          onClick: () => {
            // Switch to wrap3d mode
            state.setActivePlugin?.('wrap3d');
          },
        };
      },
    },
  ],
  slices: [wrap3dSliceFactory],
  sidebarPanels: [createToolPanel('wrap3d', Wrap3DPanel)],
};

// Export types and components
export type { Wrap3DSlice };
export { Wrap3DPanel };

// Legacy exports for backward compatibility
export type { Wrap3DSlice as SphereWrapSlice };
export { Wrap3DPanel as SphereWrapPanel };
// eslint-disable-next-line react-refresh/only-export-components
export const sphereWrapPlugin = wrap3dPlugin;

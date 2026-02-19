/**
 * Clipboard Plugin
 * Provides copy/cut/paste functionality for canvas elements
 * 
 * Features:
 * - Copy/Cut/Paste with keyboard shortcuts (Cmd/Ctrl + C/X/V)
 * - Paste in place (Cmd/Ctrl + Shift + V)
 * - Multi-format clipboard support (SVG, HTML, PNG, internal JSON)
 * - Cross-instance paste between VectorNest tabs/windows
 * - Cascading paste offset for consecutive pastes
 * - SVG sanitization for external content
 * - ID collision avoidance on paste
 */

import { Clipboard, Copy, Scissors, ClipboardPaste } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createSelectOrIdlePanel } from '../../utils/pluginFactories';
import { createClipboardSlice, type ClipboardSlice } from './slice';
import { ClipboardPanel } from './ClipboardPanel';
import { copySelectedElements, cutSelectedElements, pasteFromClipboard } from './actions';
import { pluginManager } from '../../utils/pluginManager';

const clipboardSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  const slice = createClipboardSlice(
    set as unknown as Parameters<typeof createClipboardSlice>[0],
    get as unknown as Parameters<typeof createClipboardSlice>[1],
    api as unknown as Parameters<typeof createClipboardSlice>[2]
  );
  return { state: slice };
};

// eslint-disable-next-line react-refresh/only-export-components
export const clipboardPlugin: PluginDefinition<CanvasStore> = {
  id: 'clipboard',
  metadata: {
    label: 'Clipboard',
    icon: Clipboard,
    cursor: 'default',
  },
  supportsMobile: false,
  keyboardShortcutScope: 'global',
  slices: [clipboardSliceFactory],
  
  // Keyboard shortcuts for copy/cut/paste
  keyboardShortcuts: {
    // Copy (Cmd/Ctrl + C)
    'meta+c': {
      handler: async (_event, { store }) => {
        const state = store.getState() as CanvasStore & ClipboardSlice;
        if (!state.clipboard?.enabled) return;
        await copySelectedElements(state);
      },
      options: { preventDefault: true },
    },
    'ctrl+c': {
      handler: async (_event, { store }) => {
        const state = store.getState() as CanvasStore & ClipboardSlice;
        if (!state.clipboard?.enabled) return;
        await copySelectedElements(state);
      },
      options: { preventDefault: true },
    },
    
    // Cut (Cmd/Ctrl + X)
    'meta+x': {
      handler: async (_event, { store }) => {
        const state = store.getState() as CanvasStore & ClipboardSlice;
        if (!state.clipboard?.enabled) return;
        await cutSelectedElements(state);
      },
      options: { preventDefault: true },
    },
    'ctrl+x': {
      handler: async (_event, { store }) => {
        const state = store.getState() as CanvasStore & ClipboardSlice;
        if (!state.clipboard?.enabled) return;
        await cutSelectedElements(state);
      },
      options: { preventDefault: true },
    },
    
    // Paste (Cmd/Ctrl + V)
    'meta+v': {
      handler: async (_event, { store }) => {
        const state = store.getState() as CanvasStore & ClipboardSlice;
        if (!state.clipboard?.enabled) return;
        await pasteFromClipboard(state, false);
      },
      options: { preventDefault: true },
    },
    'ctrl+v': {
      handler: async (_event, { store }) => {
        const state = store.getState() as CanvasStore & ClipboardSlice;
        if (!state.clipboard?.enabled) return;
        await pasteFromClipboard(state, false);
      },
      options: { preventDefault: true },
    },
    
    // Paste in place (Cmd/Ctrl + Shift + V)
    'meta+shift+v': {
      handler: async (_event, { store }) => {
        const state = store.getState() as CanvasStore & ClipboardSlice;
        if (!state.clipboard?.enabled) return;
        await pasteFromClipboard(state, true);
      },
      options: { preventDefault: true },
    },
    'ctrl+shift+v': {
      handler: async (_event, { store }) => {
        const state = store.getState() as CanvasStore & ClipboardSlice;
        if (!state.clipboard?.enabled) return;
        await pasteFromClipboard(state, true);
      },
      options: { preventDefault: true },
    },
  },
  
  // Sidebar panel - shows in select mode
  sidebarPanels: [createSelectOrIdlePanel('clipboard', ClipboardPanel)],
  
  // Context menu actions
  contextMenuActions: [
    {
      id: 'copy',
      action: () => {
        const state = useCanvasStore.getState() as CanvasStore & ClipboardSlice;
        if (state.selectedIds.length === 0) return null;
        
        return {
          id: 'copy',
          label: 'Copy',
          icon: Copy,
          onClick: async () => {
            await copySelectedElements(state);
          },
        };
      },
    },
    {
      id: 'cut',
      action: () => {
        const state = useCanvasStore.getState() as CanvasStore & ClipboardSlice;
        if (state.selectedIds.length === 0) return null;
        
        return {
          id: 'cut',
          label: 'Cut',
          icon: Scissors,
          onClick: async () => {
            await cutSelectedElements(state);
          },
        };
      },
    },
    {
      id: 'paste',
      action: () => {
        const state = useCanvasStore.getState() as CanvasStore & ClipboardSlice;
        
        // Check if there's content to paste
        const hasContent = state.clipboard?.hasInternalData || 
          localStorage.getItem('application/vnd.vectornest.selection+json');
        
        if (!hasContent) return null;
        
        return {
          id: 'paste',
          label: 'Paste',
          icon: ClipboardPaste,
          onClick: async () => {
            await pasteFromClipboard(state, false);
          },
        };
      },
    },
    {
      id: 'paste-in-place',
      action: () => {
        const state = useCanvasStore.getState() as CanvasStore & ClipboardSlice;
        
        // Check if there's content to paste
        const hasContent = state.clipboard?.hasInternalData || 
          localStorage.getItem('application/vnd.vectornest.selection+json');
        
        if (!hasContent) return null;
        
        return {
          id: 'paste-in-place',
          label: 'Paste in Place',
          icon: Clipboard,
          onClick: async () => {
            await pasteFromClipboard(state, true);
          },
        };
      },
    },
  ],
  
  // Plugin initialization
  init: (context) => {
    // Register lifecycle action to reset paste count when selection changes
    const unregisterSelectionChanged = pluginManager.registerLifecycleAction(
      'onSelectionChanged:clipboard',
      () => {
        // Reset paste count when selection changes
        const state = context.store.getState() as CanvasStore & ClipboardSlice;
        state.updateClipboardState?.({
          pasteCount: 0,
          lastPastePosition: null,
        });
      }
    );
    
    // Clear status message after a delay
    let statusTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const clearStatusMessage = () => {
      if (statusTimeout) {
        clearTimeout(statusTimeout);
      }
      statusTimeout = setTimeout(() => {
        const state = context.store.getState() as CanvasStore & ClipboardSlice;
        state.updateClipboardState?.({ statusMessage: null });
      }, 3000);
    };
    
    // Subscribe to status message changes
    const unsubscribe = context.store.subscribe((state) => {
      const clipState = (state as unknown as ClipboardSlice).clipboard;
      if (clipState?.statusMessage) {
        clearStatusMessage();
      }
    });
    
    return () => {
      unregisterSelectionChanged();
      unsubscribe();
      if (statusTimeout) {
        clearTimeout(statusTimeout);
      }
    };
  },
  
  // Expose public API for other plugins
  createApi: ({ store }) => ({
    copy: async () => {
      const state = store.getState() as CanvasStore & ClipboardSlice;
      await copySelectedElements(state);
    },
    cut: async () => {
      const state = store.getState() as CanvasStore & ClipboardSlice;
      await cutSelectedElements(state);
    },
    paste: async (inPlace = false) => {
      const state = store.getState() as CanvasStore & ClipboardSlice;
      await pasteFromClipboard(state, inPlace);
    },
    hasContent: () => {
      const state = store.getState() as CanvasStore & ClipboardSlice;
      return state.clipboard?.hasInternalData || 
        !!localStorage.getItem('application/vnd.vectornest.selection+json');
    },
  }),
};

// Import useCanvasStore for context menu actions
import { useCanvasStore } from '../../store/canvasStore';


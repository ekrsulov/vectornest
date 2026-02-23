/**
 * Animation Manager Plugin Definition
 *
 * A selection-centric, non-blocking panel for managing all animations
 * affecting the currently selected elements. Features:
 *
 * - Zone 1: Animation Map — auto-discovers direct + indirect animations
 * - Zone 2: Animation Editor — visual keyframe & easing editing
 * - Zone 3: Preset Catalog — unified searchable preset browser
 * - Batch actions — stagger, chain, apply-to-all for multi-selection
 */

import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { createAnimationManagerSlice } from './slice';
import { AnimationManagerPanel } from './AnimationManagerPanel';

// Persistence: favorites, recents, and settings survive page reloads.
// Selection/editor UI state uses temporal for undo/redo only.
registerStateKeys(
  'animationManager',
  ['animationManager'],
  'both',
);

export const animationManagerPlugin: PluginDefinition<CanvasStore> = {
  id: 'animationManager',
  metadata: {
    label: 'Animation Manager',
    cursor: 'default',
  },

  dependencies: ['animation-system'],

  // State slice
  slices: [createPluginSlice(createAnimationManagerSlice)],

  // Contribute panel to the Anim library tab
  relatedPluginPanels: [
    {
      id: 'animation-manager-panel',
      targetPlugin: 'animLibrary',
      component: AnimationManagerPanel,
      order: 10,
    },
  ],

  // Global keyboard shortcut to focus/scroll to the panel
  keyboardShortcutScope: 'global' as const,
  keyboardShortcuts: {
    'shift+a': (_event, { store }) => {
      const state = store.getState() as Record<string, unknown>;
      const mgr = state.animationManager as Record<string, unknown> | undefined;
      const update = state.updateAnimationManagerState as
        | ((val: Record<string, unknown>) => void)
        | undefined;
      if (update) {
        update({ isOpen: !(mgr?.isOpen ?? false) });
      }
    },
  },
};

export type { AnimationManagerSlice } from './types';

/**
 * Context Action Overlay Plugin
 * Shows a floating quick action bar near the selected element's bounding box.
 * Reduces the workflow from TAB → PANEL → ACTION to just SELECT → ACTION (0 extra clicks).
 *
 * Desktop: Bar floats above the selection bounding box
 * Mobile: Bar appears above the bottom toolbar
 */

import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { ContextActionOverlay } from './ContextActionOverlay';

export const contextActionsPlugin: PluginDefinition<CanvasStore> = {
  id: 'contextActions',
  metadata: {
    label: 'Context Actions',
    cursor: 'default',
  },
  supportsMobile: true,

  // Register as a canvas overlay so it receives viewport props and renders outside SVG
  canvasOverlays: [
    {
      id: 'context-action-overlay',
      component: ContextActionOverlay,
    },
  ],
};

export type { QuickAction } from './useContextActions';

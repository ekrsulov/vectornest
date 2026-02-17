import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import type { ElementMap } from '../canvas/geometry/CanvasGeometryService';
import type { CanvasElement } from '../types';
import { Hand } from 'lucide-react';
import React from 'react';
import { createToolPanel } from '../utils/pluginFactories';

import { PanPanel } from '../sidebar/panels/PanPanel';
import { LibraryRelatedPanels } from '../sidebar/panels/LibraryRelatedPanels';

// Helper function to check if all selected elements belong to the same group
export const getAllElementsShareSameParentGroup = (
  selectedIds: string[],
  elementMap: ElementMap
): string | null => {
  if (selectedIds.length === 0) return null;

  let sharedParentId: string | null = null;

  for (const selectedId of selectedIds) {
    // Find parent group of this element
    let parentId: string | null = null;

    for (const [elementId, element] of elementMap) {
      if (element.type === 'group') {
        const childIds = (element.data as { childIds: string[] }).childIds;
        if (childIds.includes(selectedId)) {
          parentId = elementId;
          break;
        }
      }
    }

    // First iteration - set the shared parent
    if (sharedParentId === null) {
      sharedParentId = parentId;
    } else {
      // If this element has a different parent (or no parent), they don't share the same group
      if (sharedParentId !== parentId) {
        return null;
      }
    }
  }

  return sharedParentId;
};

// Helper function to find the root group of an element
export const resolveRootGroup = (
  elementId: string,
  elements: CanvasElement[]
): string => {
  const element = elements.find(el => el.id === elementId);
  if (!element) return elementId;

  if (element.parentId) {
    let currentElement = element;
    while (currentElement.parentId) {
      const parent = elements.find(el => el.id === currentElement.parentId);
      if (!parent) break;
      currentElement = parent;
    }
    return currentElement.id;
  }
  return elementId;
};

export const panPlugin: PluginDefinition<CanvasStore> = {
  id: 'pan',
  metadata: {
    label: 'Pan',
    icon: Hand,
    cursor: 'grab',
  },
  modeConfig: {
    description: 'Mode for navigating the canvas.',
  },
  toolDefinition: { order: 5, visibility: 'always-shown', toolGroup: 'basic' },
  behaviorFlags: () => ({
    isPanMode: true,
  }),
  subscribedEvents: ['pointermove'],
  handler: (
    event,
    _point,
    _target,
    context
  ) => {
    if (event.type === 'pointermove' && event.buttons === 1) {
      const deltaX = (event as React.PointerEvent).movementX;
      const deltaY = (event as React.PointerEvent).movementY;
      context.store.getState().pan(deltaX, deltaY);
    }
  },
  sidebarPanels: [createToolPanel('pan', PanPanel)],
};

// Factory for creating simple sidebar plugins
const createSidebarPlugin = (
  id: string,
  label: string
): PluginDefinition<CanvasStore> => ({
  id,
  metadata: { label, cursor: 'default' },
  behaviorFlags: () => ({
    isSidebarPanelMode: true,
  }),
  subscribedEvents: ['pointerdown'],
  handler: (_event, _point, _target, context) => {
    context.store.getState().setMode('select');
  },
});

export const filePlugin = createSidebarPlugin('file', 'File');
export const settingsPlugin = createSidebarPlugin('settings', 'Settings');
export const libraryPlugin: PluginDefinition<CanvasStore> = {
  ...createSidebarPlugin('library', 'Library'),
  sidebarPanels: [
    // Library panel needs special handling - it should show when showLibraryPanel is true
    // but createGlobalPanel blocks all panels when isInSpecialPanelMode is true
    {
      key: 'library-related-panels',
      condition: (ctx) => ctx.showLibraryPanel,
      component: LibraryRelatedPanels,
    },
  ],
};

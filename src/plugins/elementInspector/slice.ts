import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export type InspectorTab = 'properties' | 'geometry' | 'style' | 'raw';

export interface ElementInspectorState extends Record<string, unknown> {
  activeTab: InspectorTab;
  showInherited: boolean;
  expandedSections: string[];
}

export interface ElementInspectorPluginSlice {
  elementInspector: ElementInspectorState;
  updateElementInspectorState: (state: Partial<ElementInspectorState>) => void;
}

export const createElementInspectorSlice: StateCreator<
  ElementInspectorPluginSlice,
  [],
  [],
  ElementInspectorPluginSlice
> = createSimplePluginSlice<'elementInspector', ElementInspectorState, ElementInspectorPluginSlice>(
  'elementInspector',
  {
    activeTab: 'properties',
    showInherited: false,
    expandedSections: ['geometry', 'style'],
  }
);

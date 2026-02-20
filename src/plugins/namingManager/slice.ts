import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface ElementLabel {
  id: string;
  currentName: string;
  newName: string;
  type: string;
}

export interface NamingManagerState extends Record<string, unknown> {
  prefix: string;
  suffix: string;
  separator: string;
  startNumber: number;
  pattern: 'prefix-number' | 'type-number' | 'custom';
  customPattern: string;
  labels: ElementLabel[];
  autoName: boolean;
}

export interface NamingManagerPluginSlice {
  namingManager: NamingManagerState;
  updateNamingManagerState: (state: Partial<NamingManagerState>) => void;
}

export const createNamingManagerSlice: StateCreator<
  NamingManagerPluginSlice,
  [],
  [],
  NamingManagerPluginSlice
> = createSimplePluginSlice<'namingManager', NamingManagerState, NamingManagerPluginSlice>(
  'namingManager',
  {
    prefix: 'element',
    suffix: '',
    separator: '-',
    startNumber: 1,
    pattern: 'prefix-number',
    customPattern: '{type}{sep}{n}',
    labels: [],
    autoName: false,
  }
);

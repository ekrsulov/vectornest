import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { Point } from '../../types';

export interface KnifeState extends Record<string, unknown> {
  enabled: boolean;
  cutPoints: Point[];
  isCutting: boolean;
  cutWidth: number;
}

export interface KnifePluginSlice {
  knife: KnifeState;
  updateKnifeState: (state: Partial<KnifeState>) => void;
}

export const createKnifePluginSlice: StateCreator<
  KnifePluginSlice,
  [],
  [],
  KnifePluginSlice
> = createSimplePluginSlice<'knife', KnifeState, KnifePluginSlice>(
  'knife',
  { enabled: true, cutPoints: [], isCutting: false, cutWidth: 2 }
);

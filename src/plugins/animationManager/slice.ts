/**
 * Animation Manager Plugin — Zustand State Slice
 */

import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';
import type { AnimationManagerState, AnimationManagerSlice } from './types';

const initialState: AnimationManagerState = {
  isOpen: false,
  selectedAnimationId: null,
  expandedGroups: [],
  editorMode: 'idle',
  catalogSearchQuery: '',
  catalogActiveTags: ['all'],
  catalogFavorites: [],
  catalogRecents: [],
  autoPlayOnEdit: false,
  defaultDuration: 1.5,
  miniTimelineZoom: 1,
  disabledAnimationIds: [],
};

export const createAnimationManagerSlice: StateCreator<
  AnimationManagerSlice,
  [],
  [],
  AnimationManagerSlice
> = createSimplePluginSlice<'animationManager', AnimationManagerState, AnimationManagerSlice>(
  'animationManager',
  initialState,
);

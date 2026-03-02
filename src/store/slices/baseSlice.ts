import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../canvasStore';
import {
  getInitialCanvasMode,
  transitionCanvasMode,
  type CanvasMode,
} from '../../canvas/modes/CanvasModeMachine';
import { DEFAULT_MODE } from '../../constants';
import { createBaseSliceActions } from './base/baseSliceActions';
import { createBaseInitialState } from './base/baseSliceDefaults';
import type { BaseSlice } from './base/baseSliceTypes';

export type { BaseSlice } from './base/baseSliceTypes';

export const createBaseSlice: StateCreator<BaseSlice> = (set, get, _api) => {
  const applyModeTransition = (requestedMode: string) => {
    const state = get() as CanvasStore;
    const initialMode = getInitialCanvasMode();
    const currentMode = (state.activePlugin ?? initialMode) as CanvasMode;
    const targetMode = (requestedMode || initialMode) as CanvasMode;

    const result = transitionCanvasMode(currentMode, targetMode);

    if (!result.changed) {
      return;
    }

    set({ activePlugin: result.mode });
  };

  return {
    ...createBaseInitialState(DEFAULT_MODE),
    ...createBaseSliceActions(set, get, applyModeTransition),
  };
};

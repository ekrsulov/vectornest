import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../canvasStore';
import {
  getCanvasModeMachine,
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
    const currentMode = (state.activePlugin ?? getCanvasModeMachine().initial) as CanvasMode;
    const targetMode = (requestedMode || getCanvasModeMachine().initial) as CanvasMode;

    const result = transitionCanvasMode(currentMode, {
      type: 'ACTIVATE',
      value: targetMode,
    });

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

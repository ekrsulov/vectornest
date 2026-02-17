import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import { createArrangeSliceActions } from './arrange/arrangeSliceActions';
import type { ArrangeSlice } from './arrange/arrangeSliceTypes';

export type { ArrangeSlice } from './arrange/arrangeSliceTypes';

export const createArrangeSlice: StateCreator<CanvasStore, [], [], ArrangeSlice> = (
  set,
  get
) => createArrangeSliceActions(set, get);

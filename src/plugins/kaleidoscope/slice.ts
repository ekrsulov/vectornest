import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export interface KaleidoscopeState extends Record<string, unknown> {
  /** Number of symmetry segments */
  segments: number;
  /** Center X in canvas coordinates */
  centerX: number;
  /** Center Y in canvas coordinates */
  centerY: number;
  /** Rotation offset in degrees */
  rotationOffset: number;
  /** Whether to also reflect (true kaleidoscope) or just rotate */
  reflect: boolean;
  /** Whether to delete the originals after generating */
  deleteOriginals: boolean;
}

export interface KaleidoscopePluginSlice {
  kaleidoscope: KaleidoscopeState;
  updateKaleidoscopeState: (state: Partial<KaleidoscopeState>) => void;
}

export const createKaleidoscopeSlice: StateCreator<
  KaleidoscopePluginSlice,
  [],
  [],
  KaleidoscopePluginSlice
> = createSimplePluginSlice<'kaleidoscope', KaleidoscopeState, KaleidoscopePluginSlice>(
  'kaleidoscope',
  {
    segments: 6,
    centerX: 250,
    centerY: 250,
    rotationOffset: 0,
    reflect: true,
    deleteOriginals: false,
  }
);

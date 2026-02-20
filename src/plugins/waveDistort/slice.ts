import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export interface WaveDistortState extends Record<string, unknown> {
  /** Wave type: sine, sawtooth, square, or triangle */
  waveType: 'sine' | 'sawtooth' | 'square' | 'triangle';
  /** Wave amplitude in canvas units */
  amplitude: number;
  /** Wave frequency — number of full cycles across the path */
  frequency: number;
  /** Phase offset in degrees (0-360) */
  phase: number;
  /** Whether to distort along the path normal or in X/Y direction */
  direction: 'normal' | 'x' | 'y';
  /** Resolution: number of points per wave cycle */
  resolution: number;
}

export interface WaveDistortPluginSlice {
  waveDistort: WaveDistortState;
  updateWaveDistortState: (state: Partial<WaveDistortState>) => void;
}

export const createWaveDistortSlice: StateCreator<
  WaveDistortPluginSlice,
  [],
  [],
  WaveDistortPluginSlice
> = createSimplePluginSlice<'waveDistort', WaveDistortState, WaveDistortPluginSlice>(
  'waveDistort',
  {
    waveType: 'sine',
    amplitude: 10,
    frequency: 5,
    phase: 0,
    direction: 'normal',
    resolution: 16,
  }
);

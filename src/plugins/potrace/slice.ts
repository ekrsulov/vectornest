import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface PotracePluginSlice {
  // State
  potrace: {
    // Potrace options
    threshold: number; // 0-255, default 128
    turnPolicy: 'black' | 'white' | 'left' | 'right' | 'minority' | 'majority'; // default 'minority'
    turdSize: number; // suppress speckles of this size, default 2
    optCurve: boolean; // curve optimization, default true
    optTolerance: number; // curve optimization tolerance, default 0.2
    alphaMax: number; // corner threshold parameter, default 1.0
    minPathSegments: number; // minimum path length in segments to keep, default 0
    // Rendering options
    renderScale: number; // scale for intermediate canvas, default 4
    // CSS Filter preprocessing (like SVGcode)
    brightness: number; // 0-200, default 100
    contrast: number; // 0-200, default 100
    grayscale: number; // 0-100, default 0 (0 = color, 100 = full grayscale)
    invert: number; // 0-100, default 0
    // Output mode
    colorMode: 'monochrome' | 'color'; // default 'monochrome'
  };

  // Actions
  updatePotraceState: (state: Partial<PotracePluginSlice['potrace']>) => void;
}

export const createPotracePluginSlice: StateCreator<PotracePluginSlice, [], [], PotracePluginSlice> = 
  createSimplePluginSlice<'potrace', PotracePluginSlice['potrace'], PotracePluginSlice>(
    'potrace',
    {
      threshold: 128,
      turnPolicy: 'minority',
      turdSize: 2,
      optCurve: true,
      optTolerance: 0.2,
      alphaMax: 1.0,
      minPathSegments: 0,
      renderScale: 4,
      brightness: 100,
      contrast: 100,
      grayscale: 0,
      invert: 0,
      colorMode: 'monochrome',
    }
  );

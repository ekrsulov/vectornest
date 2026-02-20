import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface ExtractedColor {
  hex: string;
  source: 'fill' | 'stroke';
  count: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export type SortMode = 'frequency' | 'hue' | 'lightness' | 'name';

export interface ColorPaletteState extends Record<string, unknown> {
  colors: ExtractedColor[];
  sortMode: SortMode;
  includeStrokes: boolean;
  includeFills: boolean;
  deduplicateNear: boolean;
  nearThreshold: number;
  scopeAll: boolean;
}

export interface ColorPalettePluginSlice {
  colorPalette: ColorPaletteState;
  updateColorPaletteState: (state: Partial<ColorPaletteState>) => void;
}

export const createColorPaletteSlice: StateCreator<
  ColorPalettePluginSlice,
  [],
  [],
  ColorPalettePluginSlice
> = createSimplePluginSlice<'colorPalette', ColorPaletteState, ColorPalettePluginSlice>(
  'colorPalette',
  {
    colors: [],
    sortMode: 'frequency',
    includeStrokes: true,
    includeFills: true,
    deduplicateNear: false,
    nearThreshold: 10,
    scopeAll: false,
  }
);

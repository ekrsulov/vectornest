import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export type HarmonyMode =
  | 'complementary'
  | 'triadic'
  | 'analogous'
  | 'splitComplementary'
  | 'tetradic'
  | 'monochromatic';

export interface ColorHarmonyState extends Record<string, unknown> {
  /** Base hue (0-360) */
  baseHue: number;
  /** Base saturation (0-100) */
  baseSaturation: number;
  /** Base lightness (0-100) */
  baseLightness: number;
  /** Harmony mode */
  mode: HarmonyMode;
  /** Analogous spread angle */
  analogousAngle: number;
  /** Apply as fill (true) or stroke (false) */
  applyAsFill: boolean;
}

export interface ColorHarmonyPluginSlice {
  colorHarmony: ColorHarmonyState;
  updateColorHarmonyState: (state: Partial<ColorHarmonyState>) => void;
}

export const createColorHarmonySlice: StateCreator<
  ColorHarmonyPluginSlice,
  [],
  [],
  ColorHarmonyPluginSlice
> = createSimplePluginSlice<'colorHarmony', ColorHarmonyState, ColorHarmonyPluginSlice>(
  'colorHarmony',
  {
    baseHue: 210,
    baseSaturation: 70,
    baseLightness: 50,
    mode: 'complementary',
    analogousAngle: 30,
    applyAsFill: true,
  }
);

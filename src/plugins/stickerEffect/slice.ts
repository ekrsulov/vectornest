import type { StateCreator } from 'zustand';

export type StickerStyle = 'outline' | 'shadow' | 'neon' | 'emboss';

export interface StickerEffectState extends Record<string, unknown> {
  style: StickerStyle;
  outlineWidth: number;
  outlineColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
  neonIntensity: number;
  neonColor: string;
}

export interface StickerEffectPluginSlice {
  stickerEffect: StickerEffectState;
  updateStickerEffectState: (state: Partial<StickerEffectState>) => void;
}

const initialState: StickerEffectState = {
  style: 'outline',
  outlineWidth: 3,
  outlineColor: '#ffffff',
  shadowOffsetX: 3,
  shadowOffsetY: 3,
  shadowBlur: 4,
  shadowColor: '#00000080',
  neonIntensity: 3,
  neonColor: '#00ffff',
};

export const createStickerEffectSlice: StateCreator<
  StickerEffectPluginSlice,
  [],
  [],
  StickerEffectPluginSlice
> = (set) => ({
  stickerEffect: { ...initialState },

  updateStickerEffectState: (updates) => {
    set((state) => ({
      stickerEffect: { ...state.stickerEffect, ...updates },
    }));
  },
});

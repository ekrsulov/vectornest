import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { WritingMode } from './types';

export interface NativeTextPluginSlice {
  nativeText: {
    text: string;
    richText?: string;
    spans?: Array<{
      text: string;
      line: number;
      fontWeight?: string;
      fontStyle?: 'normal' | 'italic';
      textDecoration?: 'none' | 'underline' | 'line-through';
      fontSize?: number;
      fillColor?: string;
    }>;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline' | 'line-through';
    textAnchor: 'start' | 'middle' | 'end';
    dominantBaseline?: 'alphabetic' | 'middle' | 'hanging' | 'ideographic';
    lineHeight: number;
    letterSpacing?: number;
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    writingMode?: WritingMode;
    lengthAdjust?: 'spacing' | 'spacingAndGlyphs';
    textLength?: number;
  };
  setNativeTextSettings: (updates: Partial<NativeTextPluginSlice['nativeText']>) => void;
}

export const createNativeTextSlice: StateCreator<CanvasStore, [], [], NativeTextPluginSlice> = (set) => ({
  nativeText: {
    text: 'Text',
    richText: '',
    spans: [],
    fontSize: 128,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAnchor: 'start',
    dominantBaseline: 'alphabetic',
    lineHeight: 1.2,
    letterSpacing: 0,
    textTransform: 'none',
    writingMode: 'horizontal-tb',
    lengthAdjust: undefined,
    textLength: undefined,
  },
  setNativeTextSettings: (updates) => set((state) => ({
    nativeText: {
      ...(state.nativeText ?? {}),
      ...updates,
    },
  })),
});

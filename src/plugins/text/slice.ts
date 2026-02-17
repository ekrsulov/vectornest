import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface TextPluginSlice {
  // State
  text: {
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
  };

  // Actions
  updateTextState: (state: Partial<TextPluginSlice['text']>) => void;
}

export const createTextPluginSlice: StateCreator<TextPluginSlice, [], [], TextPluginSlice> = 
  createSimplePluginSlice<'text', TextPluginSlice['text'], TextPluginSlice>(
    'text',
    {
      text: 'New',
      fontSize: 180,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontStyle: 'normal',
    }
  );
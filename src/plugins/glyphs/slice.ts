import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface GlyphInfo {
  /** Index of the glyph within the full text */
  index: number;
  /** The character */
  char: string;
  /** Span index this glyph belongs to */
  spanIndex: number;
  /** Index within the span string */
  indexInSpan: number;
  /** Current dx value */
  dx: number;
  /** Current dy value */
  dy: number;
  /** Current rotate value (degrees) */
  rotate: number;
  /** Canvas-space bounding box from SVG measurement */
  bbox: { x: number; y: number; width: number; height: number } | null;
}

export type DragMode = 'position' | 'rotate';

export interface GlyphsState extends Record<string, unknown> {
  /** Index of the selected glyph (null = none) */
  selectedGlyphIndex: number | null;
  /** Drag mode: move glyph position or rotate */
  dragMode: DragMode;
  /** Whether a drag is in progress */
  isDragging: boolean;
  /** Measured glyph info array (recomputed when element changes) */
  glyphs: GlyphInfo[];
  /** The element ID currently being edited */
  targetElementId: string | null;
  /** Show glyph index labels on overlay */
  showLabels: boolean;
}

export interface GlyphsPluginSlice {
  glyphs: GlyphsState;
  updateGlyphsState: (state: Partial<GlyphsState>) => void;
}

export const createGlyphsPluginSlice: StateCreator<
  GlyphsPluginSlice,
  [],
  [],
  GlyphsPluginSlice
> = createSimplePluginSlice<'glyphs', GlyphsState, GlyphsPluginSlice>(
  'glyphs',
  {
    selectedGlyphIndex: null,
    dragMode: 'position',
    isDragging: false,
    glyphs: [],
    targetElementId: null,
    showLabels: true,
  }
);

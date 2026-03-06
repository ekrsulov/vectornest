/**
 * useLibrarySearchResults - Searches library items (symbols, gradients, animations, etc.)
 * based on a query. Returns results grouped by type, only when query is non-empty.
 */

import { useMemo } from 'react';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import type { CanvasStore } from '../../store/canvasStore';
import type { ClippingPluginSlice } from '../clipping/slice';
import type { MarkersSlice } from '../markers/slice';
import type { SymbolPluginSlice } from '../symbols/slice';
import type { LibraryFiltersSlice } from '../libraryFilters/slice';
import type { GradientsSlice } from '../gradients/slice';
import type { PatternsSlice } from '../patterns/slice';
import type { MasksSlice } from '../masks/types';
import type { AnimationLibrarySlice } from '../animationLibrary/types';
import type { ClipDefinition } from '../clipping/slice';
import type { MarkerDefinition } from '../markers/slice';
import type { SymbolDefinition } from '../symbols/slice';
import type { FilterDefinition } from '../libraryFilters/slice';
import type { GradientDef } from '../gradients/slice';
import type { PatternDef } from '../patterns/slice';
import type { MaskDefinition } from '../masks/types';
import type { AnimationPreset } from '../animationLibrary/types';
import { TEXT_PATH_PRESETS } from '../textPathLibrary/presets';
import type { TextPathPreset } from '../textPathLibrary/presets';
import { TEXT_EFFECT_PRESETS } from '../textEffectsLibrary/presets';
import type { TextEffectPreset } from '../textEffectsLibrary/types';

// ─── Library type chip configuration ────────────────────────────────────────

export const LIBRARY_CHIP_ITEMS = [
  { key: 'animations', label: 'ANIM', category: 'LibAnimations' },
  { key: 'clips',      label: 'CLIP', category: 'LibClips' },
  { key: 'filters',    label: 'FILT', category: 'LibFilters' },
  { key: 'gradients',  label: 'GRAD', category: 'LibGradients' },
  { key: 'markers',    label: 'MARK', category: 'LibMarkers' },
  { key: 'masks',      label: 'MASK', category: 'LibMasks' },
  { key: 'patterns',   label: 'PAT',  category: 'LibPatterns' },
  { key: 'symbols',    label: 'SYM',  category: 'LibSymbols' },
  { key: 'textpaths',  label: 'TPATH', category: 'LibTextPaths' },
  { key: 'texteffects', label: 'TFXS', category: 'LibTextEffects' },
] as const;

export type LibraryItemType = (typeof LIBRARY_CHIP_ITEMS)[number]['key'];
export type LibraryCategory = (typeof LIBRARY_CHIP_ITEMS)[number]['category'];

/** Map from category string → lib type key */
export const CATEGORY_TO_LIB_KEY: Record<string, LibraryItemType> = Object.fromEntries(
  LIBRARY_CHIP_ITEMS.map((c) => [c.category, c.key])
) as Record<string, LibraryItemType>;

/** Map from lib type key → sidebar panel key */
export const LIB_PANEL_KEYS: Record<LibraryItemType, string> = {
  animations: 'sidebar:library:animations',
  clips:      'sidebar:library:clipping',
  filters:    'sidebar:library:filters',
  gradients:  'sidebar:library:gradients',
  markers:    'sidebar:library:markers',
  masks:      'sidebar:library:masks',
  patterns:   'sidebar:library:patterns',
  symbols:    'sidebar:library:symbols',
  textpaths:  'sidebar:library:textpath',
  texteffects: 'sidebar:library:text-effects',
};

/** Type label for display in section headers */
export const LIB_TYPE_LABELS: Record<LibraryItemType, string> = {
  animations: 'Animations',
  clips:      'Clips',
  filters:    'Filters',
  gradients:  'Gradients',
  markers:    'Markers',
  masks:      'Masks',
  patterns:   'Patterns',
  symbols:    'Symbols',
  textpaths:  'Textpaths',
  texteffects: 'Text Effects',
};

// ─── Item type unions ────────────────────────────────────────────────────────

export type LibraryItem =
  | { libType: 'animations'; data: AnimationPreset }
  | { libType: 'clips';      data: ClipDefinition }
  | { libType: 'filters';    data: FilterDefinition }
  | { libType: 'gradients';  data: GradientDef }
  | { libType: 'markers';    data: MarkerDefinition }
  | { libType: 'masks';      data: MaskDefinition & { name: string } }
  | { libType: 'patterns';   data: PatternDef }
  | { libType: 'symbols';    data: SymbolDefinition }
  | { libType: 'textpaths';  data: TextPathPreset }
  | { libType: 'texteffects'; data: TextEffectPreset };

export type LibraryResults = Record<LibraryItemType, LibraryItem[]>;

// ─── Store selector ──────────────────────────────────────────────────────────

const selectLibraryData = (state: CanvasStore) => {
  const s = state as CanvasStore &
    ClippingPluginSlice &
    MarkersSlice &
    SymbolPluginSlice &
    LibraryFiltersSlice &
    GradientsSlice &
    PatternsSlice &
    MasksSlice &
    AnimationLibrarySlice;

  return {
    clips:      (s.clips ?? []) as ClipDefinition[],
    markers:    (s.markers ?? []) as MarkerDefinition[],
    symbols:    (s.symbols ?? []) as SymbolDefinition[],
    filters:    (s.libraryFilters ?? []) as FilterDefinition[],
    gradients:  (s.gradients ?? []) as GradientDef[],
    patterns:   (s.patterns ?? []) as PatternDef[],
    masks:      (s.masks ?? []) as (MaskDefinition & { name?: string })[],
    animations: (s.animationPresets ?? []) as AnimationPreset[],
  };
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns library search results for all types, or null if query is empty.
 * Each result includes the typed item data and its library type.
 */
export function useLibrarySearchResults(query: string): LibraryResults | null {
  const raw = useShallowCanvasSelector(selectLibraryData);

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const normalizedMasks = raw.masks.map((m) => ({
      ...m,
      name: m.name ?? m.id,
    }));

    const match = (name: string) => name.toLowerCase().includes(q);

    return {
      animations: raw.animations.filter(i => match(i.name)).map(data => ({ libType: 'animations' as const, data })),
      clips:      raw.clips.filter(i => match(i.name)).map(data => ({ libType: 'clips' as const, data })),
      filters:    raw.filters.filter(i => match(i.name)).map(data => ({ libType: 'filters' as const, data })),
      gradients:  raw.gradients.filter(i => match(i.name)).map(data => ({ libType: 'gradients' as const, data })),
      markers:    raw.markers.filter(i => match(i.name)).map(data => ({ libType: 'markers' as const, data })),
      masks:      normalizedMasks.filter(i => match(i.name)).map(data => ({
        libType: 'masks' as const,
        data: data as MaskDefinition & { name: string },
      })),
      patterns:   raw.patterns.filter(i => match(i.name)).map(data => ({ libType: 'patterns' as const, data })),
      symbols:    raw.symbols.filter(i => match(i.name)).map(data => ({ libType: 'symbols' as const, data })),
      textpaths:  TEXT_PATH_PRESETS.filter(i => match(i.label)).map(data => ({ libType: 'textpaths' as const, data })),
      texteffects: TEXT_EFFECT_PRESETS.filter(i => match(i.label)).map(data => ({ libType: 'texteffects' as const, data })),
    };
  }, [query, raw]);
}

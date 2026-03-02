/**
 * useAnimationDiscovery — React hook that discovers all animations
 * affecting the current selection, including direct and indirect (via defs).
 */

import { useMemo } from 'react';
import type { CanvasStore } from '../../../store/canvasStore';
import type { AnimationPluginSlice } from '../../animationSystem/types';
import type { DiscoveredElementAnimations } from '../types';
import { discoverAnimationsForSelection } from '../utils/animationDiscovery';
import { shallow } from 'zustand/shallow';
import { useFrozenCanvasStoreValueDuringDrag } from '../../../hooks/useFrozenElementsDuringDrag';

interface DiscoveryStoreSlice {
  selectedIds: string[];
  elements: CanvasStore['elements'];
  animations: AnimationPluginSlice['animations'];
  gradients: unknown;
  patterns: unknown;
  filters: unknown;
  importedFilters: unknown;
  masks: unknown;
  markers: unknown;
  symbols: unknown;
}

const selectDiscoveryState = (state: CanvasStore): DiscoveryStoreSlice => {
  const slice = state as unknown as AnimationPluginSlice;
  const s = state as Record<string, unknown>;
  return {
    selectedIds: state.selectedIds,
    elements: state.elements,
    animations: slice.animations ?? [],
    gradients: s.gradients,
    patterns: s.patterns,
    filters: s.filters,
    importedFilters: s.importedFilters,
    masks: s.masks,
    markers: s.markers,
    symbols: s.symbols,
  };
};

/**
 * Hook that returns discovered animations for the current selection.
 * Automatically updates when selection or animations change.
 */
export function useAnimationDiscovery(): DiscoveredElementAnimations[] {
  const {
    selectedIds,
    elements,
    animations,
    gradients,
    patterns,
    filters,
    importedFilters,
    masks,
    markers,
    symbols,
  } = useFrozenCanvasStoreValueDuringDrag(selectDiscoveryState, shallow);

  return useMemo(() => {
    if (selectedIds.length === 0 || animations.length === 0) return [];

    const storeState: Record<string, unknown> = {
      gradients,
      patterns,
      filters,
      importedFilters,
      masks,
      markers,
      symbols,
    };

    return discoverAnimationsForSelection(
      selectedIds,
      elements,
      animations,
      storeState,
    );
  }, [selectedIds, elements, animations, gradients, patterns, filters, importedFilters, masks, markers, symbols]);
}

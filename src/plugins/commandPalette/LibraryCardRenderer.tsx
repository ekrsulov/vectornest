/**
 * LibraryCardRenderer - Renders the appropriate card component for a library item.
 * On click, opens a floating PanelModal with the specific library sub-panel
 * (detached mode, same as Gen/Audit panels), then scrolls to and selects the item.
 */

import React, { useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import { SymbolItemCard } from '../symbols/SymbolItemCard';
import { GradientItemCard } from '../gradients/GradientItemCard';
import { AnimationItemCard } from '../animationLibrary/AnimationItemCard';
import { ClipItemCard } from '../clipping/ClipItemCard';
import { MarkerItemCard } from '../markers/MarkerItemCard';
import { FilterItemCard } from '../libraryFilters/FilterItemCard';
import { PatternItemCard } from '../patterns/PatternItemCard';
import { MaskItemCard } from '../masks/MaskItemCard';

// Library sub-panel components
import { SymbolsPanel } from '../symbols/SymbolsPanel';
import { GradientsPanel } from '../gradients/GradientsPanel';
import { AnimationLibraryPanel } from '../animationLibrary/AnimationLibraryPanel';
import { ClippingPanel } from '../clipping/ClippingPanel';
import { MarkersPanel } from '../markers/MarkersPanel';
import { FiltersPanel } from '../libraryFilters/FiltersPanel';
import { PatternsPanel } from '../patterns/PatternsPanel';
import { MasksPanel } from '../masks/MasksPanel';

import { useCanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { CanvasStore } from '../../store/canvasStore';
import type { GradientsSlice } from '../gradients/slice';
import type { PatternsSlice } from '../patterns/slice';
import type { LibraryFiltersSlice } from '../libraryFilters/slice';
import type { ClippingPluginSlice } from '../clipping/slice';
import type { MarkersSlice } from '../markers/slice';
import type { SymbolPluginSlice } from '../symbols/slice';
import type { MasksSlice } from '../masks/types';
import type { AnimationLibrarySlice } from '../animationLibrary/types';
import type { LibraryItem, LibraryItemType } from './useLibrarySearchResults';
import { LIB_TYPE_LABELS } from './useLibrarySearchResults';
import type { ComponentType } from 'react';

interface LibraryCardRendererProps {
  item: LibraryItem;
  /** Close the palette */
  onClose: () => void;
  /**
   * Open a floating PanelModal with the given panel component.
   * `afterOpen` is called ~150 ms after mount — use it to scroll/select the item.
   */
  onOpenModal: (component: ComponentType, label: string, afterOpen?: () => void) => void;
}

/** Maps each library type to its standalone panel component */
const LIB_PANEL_COMPONENTS: Record<LibraryItemType, ComponentType> = {
  symbols:    SymbolsPanel,
  gradients:  GradientsPanel,
  animations: AnimationLibraryPanel,
  clips:      ClippingPanel,
  markers:    MarkersPanel,
  filters:    FiltersPanel,
  patterns:   PatternsPanel,
  masks:      MasksPanel,
};

export const LibraryCardRenderer: React.FC<LibraryCardRendererProps> = ({
  item,
  onClose: _onClose,
  onOpenModal,
}) => {
  const {
    selectSymbolFromSearch,
    selectGradientFromSearch,
    selectAnimationFromSearch,
    selectClipFromSearch,
    selectMarkerFromSearch,
    selectFilterFromSearch,
    selectPatternFromSearch,
    selectMaskFromSearch,
  } = useCanvasStore(
    useShallow((s) => ({
      selectSymbolFromSearch:    (s as CanvasStore & SymbolPluginSlice).selectFromSearch,
      selectGradientFromSearch:  (s as CanvasStore & GradientsSlice).selectFromSearch,
      selectAnimationFromSearch: (s as CanvasStore & AnimationLibrarySlice).selectFromSearch,
      selectClipFromSearch:      (s as CanvasStore & ClippingPluginSlice).selectFromSearch,
      selectMarkerFromSearch:    (s as CanvasStore & MarkersSlice).selectFromSearch,
      selectFilterFromSearch:    (s as CanvasStore & LibraryFiltersSlice).selectFromSearch,
      selectPatternFromSearch:   (s as CanvasStore & PatternsSlice).selectFromSearch,
      selectMaskFromSearch:      (s as CanvasStore & MasksSlice).selectFromSearch,
    }))
  );

  const handleClick = useCallback((libType: LibraryItemType, id: string) => {
    const PanelComponent = LIB_PANEL_COMPONENTS[libType];
    const label = LIB_TYPE_LABELS[libType];

    const selectors: Record<LibraryItemType, ((id: string) => void) | undefined> = {
      symbols:    selectSymbolFromSearch,
      gradients:  selectGradientFromSearch,
      animations: selectAnimationFromSearch,
      clips:      selectClipFromSearch,
      markers:    selectMarkerFromSearch,
      filters:    selectFilterFromSearch,
      patterns:   selectPatternFromSearch,
      masks:      selectMaskFromSearch,
    };

    // Open the modal, then once the panel has mounted, scroll-select the item
    onOpenModal(PanelComponent, label, () => {
      selectors[libType]?.(id);
    });
  }, [
    onOpenModal,
    selectSymbolFromSearch, selectGradientFromSearch, selectAnimationFromSearch,
    selectClipFromSearch, selectMarkerFromSearch, selectFilterFromSearch,
    selectPatternFromSearch, selectMaskFromSearch,
  ]);

  switch (item.libType) {
    case 'symbols':
      return (
        <SymbolItemCard
          symbol={item.data}
          onClick={() => handleClick('symbols', item.data.id)}
        />
      );
    case 'gradients':
      return (
        <GradientItemCard
          gradient={item.data}
          onClick={() => handleClick('gradients', item.data.id)}
        />
      );
    case 'animations':
      return (
        <Box cursor="pointer" onClick={() => handleClick('animations', item.data.id)}>
          <AnimationItemCard preset={item.data} isSelected={false} />
        </Box>
      );
    case 'clips':
      return (
        <ClipItemCard
          clip={item.data}
          onClick={() => handleClick('clips', item.data.id)}
        />
      );
    case 'markers':
      return (
        <MarkerItemCard
          marker={item.data}
          onClick={() => handleClick('markers', item.data.id)}
        />
      );
    case 'filters':
      return (
        <FilterItemCard
          filter={item.data}
          onClick={() => handleClick('filters', item.data.id)}
        />
      );
    case 'patterns':
      return (
        <PatternItemCard
          pattern={item.data}
          onClick={() => handleClick('patterns', item.data.id)}
        />
      );
    case 'masks':
      return (
        <Box cursor="pointer" onClick={() => handleClick('masks', item.data.id)}>
          <MaskItemCard mask={item.data} isSelected={false} />
        </Box>
      );
    default:
      return null;
  }
};

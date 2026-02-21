/**
 * Filters Panel - Library view for filters
 * Follows the same pattern as Markers, Gradients, Symbols, etc.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { HStack, Text, useColorModeValue } from '@chakra-ui/react';
import type { CanvasStore } from '../../store/canvasStore';
import type { LibraryFiltersSlice, FilterDefinition } from './slice';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { FILTER_PRESETS } from './presets';
import { FilterEffectEditor } from './FilterEffectEditor';
import { FilterItemCard } from './FilterItemCard';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';

// ... (previous imports)

// ... (inside FiltersPanel)


const EMPTY_FILTERS: FilterDefinition[] = [];

const selectFiltersPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & LibraryFiltersSlice;
  const hasSelection = state.selectedIds.length > 0;
  return {
    filters: slice.libraryFilters ?? EMPTY_FILTERS,
    addLibraryFilter: slice.addLibraryFilter,
    updateLibraryFilter: slice.updateLibraryFilter,
    removeLibraryFilter: slice.removeLibraryFilter,
    duplicateLibraryFilter: slice.duplicateLibraryFilter,
    applyFilterToSelection: slice.applyFilterToSelection,
    removeFilterFromSelection: slice.removeFilterFromSelection,
    hasSelection,
    selectedFromSearch: slice.selectedFromSearch ?? null,
    selectFromSearch: slice.selectFromSearch,
  };
};

export const FiltersPanel: React.FC = () => {
  const {
    filters,
    addLibraryFilter,
    updateLibraryFilter,
    removeLibraryFilter,
    duplicateLibraryFilter,
    applyFilterToSelection,
    removeFilterFromSelection,
    hasSelection,
    selectedFromSearch,
    selectFromSearch,
  } = useShallowCanvasSelector(selectFiltersPanelState);

  const detailsRef = React.useRef<HTMLDivElement | null>(null);
  const [detailsFlashKey, setDetailsFlashKey] = React.useState<string | number | null>(null);

  React.useEffect(() => {
    if (!selectedFromSearch) return;
    setEditingFilterId(selectedFromSearch);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    }, 0);
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const editingFilter = useMemo(
    () => filters.find((f) => f.id === editingFilterId) ?? null,
    [editingFilterId, filters]
  );

  // Auto-select first filter when list changes
  React.useEffect(() => {
    if (!editingFilterId && filters.length > 0) {
      setEditingFilterId(filters[0].id);
    } else if (editingFilterId && !filters.find((f) => f.id === editingFilterId)) {
      setEditingFilterId(filters[0]?.id ?? null);
    }
  }, [editingFilterId, filters]);

  const handleDuplicate = useCallback(() => {
    if (!editingFilterId) return;
    duplicateLibraryFilter?.(editingFilterId);
  }, [editingFilterId, duplicateLibraryFilter]);

  const handleAddAllPresets = useCallback(() => {
    FILTER_PRESETS.forEach((preset) => {
      const filterData = preset.createFilter();
      addLibraryFilter?.(filterData);
    });
  }, [addLibraryFilter]);

  const presetsLoadedRef = useRef(false);
  useEffect(() => {
    if (presetsLoadedRef.current) return;
    if (filters.length > 0) {
      presetsLoadedRef.current = true;
      return;
    }
    handleAddAllPresets();
    presetsLoadedRef.current = true;
  }, [filters.length, handleAddAllPresets]);

  const handleApplyToSelection = useCallback(() => {
    if (!editingFilterId || !hasSelection) return;
    applyFilterToSelection?.(editingFilterId);
  }, [editingFilterId, hasSelection, applyFilterToSelection]);

  const handleRemoveFromSelection = useCallback(() => {
    if (!hasSelection) return;
    removeFilterFromSelection?.();
  }, [hasSelection, removeFilterFromSelection]);

  const renderItem = (filter: FilterDefinition, isSelected: boolean) => (
    <FilterItemCard
      filter={filter}
      isSelected={isSelected}
    />
  );

  const handleItemDoubleClick = useCallback((filterId: string) => {
    if (!hasSelection) return;
    applyFilterToSelection?.(filterId);
    setEditingFilterId(filterId);
  }, [applyFilterToSelection, hasSelection, setEditingFilterId]);

  return (
    <LibraryPanelHelper
      title="Filters"
      items={filters}
      selectedId={editingFilterId}
      onSelect={setEditingFilterId}
      onItemDoubleClick={handleItemDoubleClick}
      // onAdd is not used here because we use presets instead
      onDuplicate={handleDuplicate}
      onDelete={(id) => removeLibraryFilter?.(id)}
      renderItem={renderItem}
      emptyMessage="No filters in library. Add presets below."
      Editor={
        editingFilter ? (
          <FilterEffectEditor
            filter={editingFilter}
            onUpdate={updateLibraryFilter}
          />
        ) : null
      }
      Actions={
        <>
          <Text fontSize="sm" fontWeight="normal">
            Apply to Selection
          </Text>
          <HStack spacing={2}>
            <PanelStyledButton
              size="sm"
              flex={1}
              onClick={handleApplyToSelection}
              isDisabled={!hasSelection || !editingFilter}
              colorScheme="blue"
            >
              Apply {editingFilter?.name}
            </PanelStyledButton>
            <PanelStyledButton
              size="sm"
              onClick={handleRemoveFromSelection}
              isDisabled={!hasSelection}
              colorScheme="red"
              variant="outline"
            >
              Clear
            </PanelStyledButton>
          </HStack>
          {!hasSelection && (
            <Text fontSize="xs" color={mutedColor} textAlign="center">
              Select elements to apply filters
            </Text>
          )}
        </>
      }
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
    />
  );
};

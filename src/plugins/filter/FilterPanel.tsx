import React, { useEffect, useMemo, useState } from 'react';
import { VStack, HStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { useCanvasStore } from '../../store/canvasStore';
import type { FilterSlice } from './slice';
import { buildFilterDefinition, type FilterType } from './filters';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { Trash } from 'lucide-react';
import type { CanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { SvgPreview } from '../../ui/SvgPreview';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'blur', label: 'Blur' },
  { value: 'glow', label: 'Glow' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'wave', label: 'Wave' },
];

const selectFilterPanelState = (state: CanvasStore) => {
  const selectedIds = state.selectedIds;
  const filters = (state as unknown as FilterSlice).filters;
  const updateElement = state.updateElement;
  const upsertFilter = (state as unknown as FilterSlice).upsertFilter;

  let selectedFilterId: string | null = null;
  for (const id of selectedIds) {
    const el = state.elements.find((e) => e.id === id);
    const filterId = (el as { data?: { filterId?: string } })?.data?.filterId;
    if (filterId) {
      selectedFilterId = filterId;
      break;
    }
  }

  return {
    selectedIds,
    filters,
    updateElement,
    upsertFilter,
    selectedFilterId,
  };
};

export const FilterPanel: React.FC = () => {
  const {
    selectedIds,
    filters,
    updateElement,
    upsertFilter,
    selectedFilterId,
  } = useShallowCanvasSelector(selectFilterPanelState);

  const hasSelection = selectedIds.length > 0;

  const [type, setType] = useState<FilterType>('blur');
  const [intensity, setIntensity] = useState<number>(40);

  useEffect(() => {
    if (!selectedFilterId) return;
    const current = filters[selectedFilterId];
    if (!current) return;
    setType(current.type);
    setIntensity(current.value);
  }, [selectedFilterId, filters]);

  // Generate SVG content for the filter preview
  const filterSvgContent = useMemo(() => {
    const def = buildFilterDefinition(type, intensity);
    // Wrap filter in a complete SVG with a preview shape
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${def.svg}
  </defs>
  <rect x="20" y="20" width="60" height="60" rx="8" fill="#4299E1" filter="url(#${def.id})"/>
</svg>`;
  }, [type, intensity]);

  const applyFilter = (override?: { type?: FilterType; intensity?: number }) => {
    if (!hasSelection || !updateElement) return;
    const nextType = override?.type ?? type;
    const nextIntensity = override?.intensity ?? intensity;
    const def = buildFilterDefinition(nextType, nextIntensity);
    upsertFilter(def);
    const { elements } = useCanvasStore.getState() as CanvasStore;
    selectedIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (!el) return;
      const data = (el as { data?: { filterId?: string } }).data;
      if (!data) return;
      updateElement(id, { data: { ...data, filterId: def.id } });
    });
  };

  const clearFilter = () => {
    if (!hasSelection || !updateElement) return;
    const { elements } = useCanvasStore.getState() as CanvasStore;
    selectedIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (!el) return;
      const data = (el as { data?: { filterId?: string } }).data;
      if (!data || !data.filterId) return;
      const newData = { ...data, filterId: undefined };
      updateElement(id, { data: newData });
    });
    // Reset current filter selection to avoid stale preview
    setIntensity(40);
    setType('blur');
  };

  return (
    <Panel
      title="Filters"
      hideHeader={false}
      isCollapsible={hasSelection}
      defaultOpen={false}
    >
      {hasSelection && (
        <VStack spacing={1} align="stretch">
          <HStack justify="space-between" align="center">
            <JoinedButtonGroup
              size="sm"
              value={type}
              onChange={(v) => {
                setType(v as FilterType);
                applyFilter({ type: v as FilterType });
              }}
              options={FILTER_OPTIONS}
            />
            <PanelActionButton
              label="Remove Filter"
              icon={Trash}
              variant="outline"
              onClick={clearFilter}
              isDisabled={!hasSelection}
            />
          </HStack>
          <SliderControl
            label="Intensity"
            value={intensity}
            min={0}
            max={100}
            step={1}
            onChange={(v) => {
              setIntensity(v);
              applyFilter({ intensity: v });
            }}
          />
          <SvgPreview
            content={filterSvgContent}
            title="SVG Code"
            height="60px"
            showVisualPreview={true}
          />
        </VStack>
      )}
    </Panel>
  );
};

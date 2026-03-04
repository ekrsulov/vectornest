import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { VStack, HStack, Text } from '@chakra-ui/react';
import { MousePointer } from 'lucide-react';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import type { CanvasStore } from '../../store/canvasStore';
import type { TextPathLibrarySlice } from './slice';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';
import { TextPathItemCard } from './TextPathItemCard';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { useCanvasStore } from '../../store/canvasStore';
import { isPathElement, type PathElement } from '../../types';
import {
  TEXT_PATH_PRESETS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type TextPathPreset,
  type TextPathCategory,
} from './presets';

type PresetItem = TextPathPreset & { name: string };
const PRESET_ITEMS: PresetItem[] = TEXT_PATH_PRESETS.map((p) => ({ ...p, name: p.label }));

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All' },
  ...CATEGORY_ORDER.map((cat) => ({ value: cat, label: CATEGORY_LABELS[cat] })),
];

const selectPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & TextPathLibrarySlice;
  const selectedIds = state.selectedIds;
  const elements = state.elements;
  const hasPathSelection = selectedIds.some((id) => {
    const el = elements.find((e) => e.id === id);
    return isPathElement(el as never);
  });
  return {
    placingPresetId: slice.placingTextPathPresetId ?? null,
    setPlacingPresetId: slice.setPlacingTextPathPresetId,
    selectedFromSearch: slice.selectedFromSearch ?? null,
    selectFromSearch: slice.selectFromSearch,
    hasPathSelection,
    selectedPath: selectedIds.length > 0
      ? (elements.find((el) => selectedIds.includes(el.id) && isPathElement(el as never)) as PathElement | undefined) ?? null
      : null,
  };
};

export const TextPathLibraryPanel: React.FC = () => {
  const {
    placingPresetId,
    setPlacingPresetId,
    selectedFromSearch,
    selectFromSearch,
    hasPathSelection,
    selectedPath,
  } = useShallowCanvasSelector(selectPanelState);

  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [detailsFlashKey, setDetailsFlashKey] = useState<string | number | null>(null);

  useEffect(() => {
    if (!selectedFromSearch) return;
    setActivePresetId(selectedFromSearch);
    queueMicrotask(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    });
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);

  const [activePresetId, setActivePresetId] = useState<string | null>(PRESET_ITEMS[0]?.id ?? null);
  const [category, setCategory] = useState<TextPathCategory | 'all'>('all');
  const [text, setText] = useState('Text on path');
  const [fontSize, setFontSize] = useState(24);
  const [startOffset, setStartOffset] = useState(0);

  const filteredItems = useMemo(
    () => category === 'all' ? PRESET_ITEMS : PRESET_ITEMS.filter((p) => p.category === category),
    [category]
  );

  const activePreset = useMemo(
    () => PRESET_ITEMS.find((p) => p.id === activePresetId) ?? null,
    [activePresetId]
  );

  const handleSelect = useCallback((id: string | null) => {
    setActivePresetId(id);
    const preset = PRESET_ITEMS.find((p) => p.id === id);
    if (preset) {
      setStartOffset(preset.defaultStartOffset);
    }
  }, []);

  const handleApplyToSelected = useCallback(() => {
    if (!selectedPath || !activePreset) return;
    const state = useCanvasStore.getState();
    const storeStyle = state.style;
    const fillColor = storeStyle?.fillColor === 'none' ? '#000000' : (storeStyle?.fillColor ?? '#000000');
    state.updateElement(selectedPath.id, {
      data: {
        ...selectedPath.data,
        textPath: {
          text, fontSize, fontFamily: 'Arial', fontWeight: 'normal',
          fontStyle: 'normal' as const, textAnchor: 'start', startOffset, fillColor,
          fillOpacity: storeStyle?.fillOpacity ?? 1, strokeColor: 'none',
          strokeWidth: 0, strokeOpacity: 1, dominantBaseline: 'alphabetic' as const,
        },
      },
    });
  }, [selectedPath, activePreset, text, fontSize, startOffset]);

  const placementActive = Boolean(activePresetId && placingPresetId === activePresetId);

  const handleTogglePlacement = useCallback(() => {
    if (!activePresetId) return;
    if (placementActive) {
      setPlacingPresetId?.(null);
    } else {
      setPlacingPresetId?.(activePresetId);
    }
  }, [activePresetId, placementActive, setPlacingPresetId]);

  useEffect(() => {
    setPlacingPresetId?.(null);
  }, [activePresetId, setPlacingPresetId]);

  const renderItem = (item: PresetItem, isSelected: boolean) => (
    <TextPathItemCard preset={item} isSelected={isSelected} />
  );

  return (
    <LibraryPanelHelper
      title="Textpath"
      items={filteredItems}
      selectedId={activePresetId}
      onSelect={handleSelect}
      emptyMessage="No presets match the current filter."
      renderItem={renderItem}
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
      ExtraContent={
        <CustomSelect
          value={category}
          onChange={(val) => setCategory(val as TextPathCategory | 'all')}
          options={CATEGORY_OPTIONS}
          flex="1"
        />
      }
      Editor={
        activePreset ? (
          <VStack spacing={1} align="stretch">
            <HStack w="100%" spacing={1}>
              <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} minW="55px" flexShrink={0}>Text</Text>
              <PanelTextInput
                value={text}
                onChange={(val) => setText(val)}
                placeholder="Text on path"
                width="100%"
              />
            </HStack>
            <SliderControl label="Font size" value={fontSize} min={6} max={200} onChange={setFontSize} />
            <SliderControl label="Offset" value={startOffset} min={0} max={100} onChange={setStartOffset} />
          </VStack>
        ) : null
      }
      Actions={
        activePreset ? (
          <VStack spacing={1} align="stretch">
            <PanelStyledButton
              onClick={handleTogglePlacement}
              leftIcon={<MousePointer size={11} />}
              colorScheme={placementActive ? 'blue' : 'gray'}
              size="xs"
              width="100%"
            >
              {placementActive ? 'Click canvas to place...' : 'Place on canvas'}
            </PanelStyledButton>
            {hasPathSelection && (
              <PanelStyledButton onClick={handleApplyToSelected} variant="outline" size="xs" width="100%">
                Apply to selected path
              </PanelStyledButton>
            )}
          </VStack>
        ) : null
      }
    />
  );
};

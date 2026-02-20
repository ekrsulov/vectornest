import React, { useCallback, useMemo } from 'react';
import { Box, HStack, Text, VStack, SimpleGrid } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { CustomSelect } from '../../ui/CustomSelect';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ColorPalettePluginSlice, SortMode } from './slice';
import { extractColors, buildPalette, formatPaletteCSS } from './paletteUtils';
import type { CanvasElement } from '../../types';

type PaletteStore = CanvasStore & ColorPalettePluginSlice;

const sortOptions = [
  { label: 'Frequency', value: 'frequency' },
  { label: 'Hue', value: 'hue' },
  { label: 'Lightness', value: 'lightness' },
  { label: 'Hex Name', value: 'name' },
];

export const ColorPalettePanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as PaletteStore;
      return {
        state: st.colorPalette,
        update: st.updateColorPaletteState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const targetElements = useMemo(() => {
    if (!state) return [];
    if (state.scopeAll) return elements.filter((el: CanvasElement) => el.type === 'path');
    return elements.filter((el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path');
  }, [state, selectedIds, elements]);

  const handleExtract = useCallback(() => {
    if (!state || !update) return;

    const colorMap = extractColors(targetElements, {
      includeStrokes: state.includeStrokes,
      includeFills: state.includeFills,
    });

    const colors = buildPalette(colorMap, {
      deduplicateNear: state.deduplicateNear,
      nearThreshold: state.nearThreshold,
      sortMode: state.sortMode,
    });

    update({ colors });
  }, [state, update, targetElements]);

  const handleCopyCSS = useCallback(async () => {
    if (!state?.colors.length) return;
    const css = `:root {\n${formatPaletteCSS(state.colors)}\n}`;
    try {
      await navigator.clipboard.writeText(css);
    } catch {
      // clipboard API might not be available
    }
  }, [state?.colors]);

  const handleCopyHexList = useCallback(async () => {
    if (!state?.colors.length) return;
    const hexList = state.colors.map((c) => c.hex).join('\n');
    try {
      await navigator.clipboard.writeText(hexList);
    } catch {
      // clipboard API might not be available
    }
  }, [state?.colors]);

  if (!state || !update) return null;

  return (
    <Panel title="Color Palette" isCollapsible defaultOpen={false}>
      <PanelToggle
        isChecked={state.includeFills}
        onChange={(e) => update({ includeFills: e.target.checked })}
      >
        Include Fill Colors
      </PanelToggle>

      <PanelToggle
        isChecked={state.includeStrokes}
        onChange={(e) => update({ includeStrokes: e.target.checked })}
      >
        Include Stroke Colors
      </PanelToggle>

      <PanelToggle
        isChecked={state.scopeAll}
        onChange={(e) => update({ scopeAll: e.target.checked })}
      >
        All Elements (not just selection)
      </PanelToggle>

      <PanelToggle
        isChecked={state.deduplicateNear}
        onChange={(e) => update({ deduplicateNear: e.target.checked })}
      >
        Merge Similar Colors
      </PanelToggle>

      {state.deduplicateNear && (
        <SliderControl
          label="Similarity Threshold"
          value={state.nearThreshold}
          min={1}
          max={50}
          step={1}
          onChange={(val) => update({ nearThreshold: val })}
        />
      )}

      <CustomSelect
        size="sm"
        placeholder="Sort By"
        value={state.sortMode}
        onChange={(val) => update({ sortMode: val as SortMode })}
        options={sortOptions}
      />

      <PanelStyledButton
        onClick={handleExtract}
        isDisabled={targetElements.length === 0}
        size="sm"
        width="full"
      >
        Extract ({targetElements.length} elements)
      </PanelStyledButton>

      {state.colors.length > 0 && (
        <>
          <SectionHeader title={`Palette (${state.colors.length} colors)`} />

          <SimpleGrid columns={6} gap={1} px={2} mb={2}>
            {state.colors.map((color, i) => (
              <Box
                key={`${color.hex}-${i}`}
                position="relative"
                title={`${color.hex} (${color.source}, ×${color.count})`}
              >
                <Box
                  w="full"
                  h={6}
                  borderRadius="sm"
                  bg={color.hex}
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  cursor="pointer"
                  _hover={{ borderColor: 'whiteAlpha.600' }}
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(color.hex); } catch { /* noop */ }
                  }}
                />
                {color.count > 1 && (
                  <Text
                    position="absolute"
                    top={-0.5}
                    right={-0.5}
                    fontSize="2xs"
                    bg="gray.700"
                    borderRadius="full"
                    px={1}
                    lineHeight="1.2"
                    color="gray.300"
                  >
                    {color.count}
                  </Text>
                )}
              </Box>
            ))}
          </SimpleGrid>

          {/* Color details */}
          <VStack gap={0} align="stretch" px={1} maxH="200px" overflowY="auto">
            {state.colors.slice(0, 20).map((color, i) => (
              <HStack key={`detail-${i}`} gap={1} py={0.5} px={1}>
                <Box w={3} h={3} borderRadius="sm" bg={color.hex} flexShrink={0} border="1px solid" borderColor="whiteAlpha.200" />
                <Text fontSize="2xs" fontFamily="mono" color="gray.300" flex={1}>{color.hex}</Text>
                <Text fontSize="2xs" color="gray.500">{color.source}</Text>
                <Text fontSize="2xs" color="gray.400" fontWeight="bold">×{color.count}</Text>
                <Text fontSize="2xs" color="gray.500">H{color.hue}°</Text>
              </HStack>
            ))}
            {state.colors.length > 20 && (
              <Text fontSize="2xs" color="gray.500" px={1}>
                +{state.colors.length - 20} more...
              </Text>
            )}
          </VStack>

          <HStack gap={1} px={2} mt={1}>
            <PanelStyledButton onClick={handleCopyCSS} size="sm" flex={1}>
              Copy CSS
            </PanelStyledButton>
            <PanelStyledButton onClick={handleCopyHexList} size="sm" flex={1}>
              Copy Hex List
            </PanelStyledButton>
          </HStack>
        </>
      )}

      {state.colors.length === 0 && targetElements.length === 0 && (
        <Text fontSize="xs" color="gray.500" px={2} py={2}>
          Select elements or enable "All Elements" to extract colors
        </Text>
      )}
    </Panel>
  );
};

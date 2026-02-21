import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { VStack, HStack, Text, Flex, Box } from '@chakra-ui/react';
import { X } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { SectionHeader } from '../../ui/SectionHeader';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { NumberInput } from '../../ui/NumberInput';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { MultiPaintPicker } from '../../ui/MultiPaintPicker';
import { ToggleButton } from '../../ui/ToggleButton';
import { ARTBOARD_PRESETS_BY_CATEGORY } from './presets';
import type { ArtboardCategory } from './types';

const CATEGORY_OPTIONS: Array<{ value: ArtboardCategory; label: string }> = [
  { value: 'paper', label: 'Paper' },
  { value: 'social', label: 'Social Media' },
  { value: 'print', label: 'Print' },
  { value: 'video', label: 'Video' },
  { value: 'screens', label: 'Screens' },
];

/** Panel for artboard configuration */
export const ArtboardPanel: React.FC = () => {
  const artboard = useCanvasStore(state => state.artboard);
  const updateArtboardState = useCanvasStore(state => state.updateArtboardState);
  const setArtboardPreset = useCanvasStore(state => state.setArtboardPreset);
  const setCustomArtboard = useCanvasStore(state => state.setCustomArtboard);
  const toggleArtboard = useCanvasStore(state => state.toggleArtboard);

  const [selectedCategory, setSelectedCategory] = useState<ArtboardCategory>('paper');
  const backgroundPickerSlotRef = useRef<HTMLDivElement>(null);

  // Migration: reset centered artboards to top-left origin (0, 0)
  useEffect(() => {
    if (artboard?.exportBounds) {
      const { minX, minY, width, height } = artboard.exportBounds;
      // If bounds are centered (negative minX/minY), migrate to top-left origin
      if (minX < 0 || minY < 0) {
        updateArtboardState?.({
          exportBounds: {
            minX: 0,
            minY: 0,
            width,
            height,
          },
        });
      }
    }
  }, [artboard?.exportBounds, updateArtboardState]);

  const enabled = artboard?.enabled ?? false;
  const selectedPresetId = artboard?.selectedPresetId ?? null;
  const customWidth = artboard?.customWidth ?? 1920;
  const customHeight = artboard?.customHeight ?? 1080;
  const showMargins = artboard?.showMargins ?? false;
  const marginSize = artboard?.marginSize ?? 20;
  const showSizes = artboard?.showSizes ?? false;
  const backgroundColor = artboard?.backgroundColor ?? 'none';
  const defaultBackgroundColor = '#FFFFFF';

  // Build preset options for selected category
  const presetOptions = useMemo(() => {
    return (ARTBOARD_PRESETS_BY_CATEGORY[selectedCategory] ?? []).map(preset => ({
      value: preset.id,
      label: preset.label,
      description: preset.description,
    }));
  }, [selectedCategory]);

  // Handle enable toggle
  const handleEnableToggle = useCallback(() => {
    toggleArtboard();
  }, [toggleArtboard]);

  // Handle category change
  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value as ArtboardCategory);
  }, []);

  // Handle preset change
  const handlePresetChange = useCallback((value: string) => {
    setArtboardPreset?.(value);
  }, [setArtboardPreset]);

  // Handle custom width change
  const handleCustomWidthChange = useCallback((value: number) => {
    setCustomArtboard?.(value, customHeight);
  }, [customHeight, setCustomArtboard]);

  // Handle custom height change
  const handleCustomHeightChange = useCallback((value: number) => {
    setCustomArtboard?.(customWidth, value);
  }, [customWidth, setCustomArtboard]);

  // Handle margins toggle
  const handleMarginsToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateArtboardState?.({ showMargins: e.target.checked });
  }, [updateArtboardState]);

  // Handle sizes toggle
  const handleSizesToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateArtboardState?.({ showSizes: e.target.checked });
  }, [updateArtboardState]);

  const handleBackgroundColorChange = useCallback((value: string) => {
    updateArtboardState?.({ backgroundColor: value });
  }, [updateArtboardState]);

  const handleBackgroundNone = useCallback(() => {
    updateArtboardState?.({ backgroundColor: 'none' });
  }, [updateArtboardState]);

  // Handle margin size change
  const handleMarginSizeChange = useCallback((value: number) => {
    updateArtboardState?.({ marginSize: value });
  }, [updateArtboardState]);

  // Swap dimensions (orientation flip)
  const handleSwapDimensions = useCallback(() => {
    setCustomArtboard?.(customHeight, customWidth);
  }, [customHeight, customWidth, setCustomArtboard]);

  return (
    <Panel
      title="Artboard"
      isCollapsible={enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={enabled}
          onChange={handleEnableToggle}
          title="Enable Artboard"
          aria-label="Enable Artboard"
        />
      }
    >
      {enabled ? (
        <VStack spacing={1} align="stretch">
          {/* Category Selector */}
          <SectionHeader
            title="Preset Category"
            titleTransform="uppercase"
            titleFontWeight="medium"
          />
          <CustomSelect
            value={selectedCategory}
            onChange={handleCategoryChange}
            options={CATEGORY_OPTIONS}
            size="sm"
          />

          {/* Preset Selector */}
          <CustomSelect
            value={selectedPresetId ?? ''}
            onChange={handlePresetChange}
            options={presetOptions}
            size="sm"
            placeholder="Select a preset"
          />

          {/* Custom Size */}
          <SectionHeader
            title="Custom Size"
            titleTransform="uppercase"
            titleFontWeight="medium"
          />
          <HStack spacing={2}>
            <NumberInput
              label="Width"
              value={customWidth}
              min={100}
              max={10000}
              onChange={handleCustomWidthChange}
              suffix="px"
            />
            <NumberInput
              label="Height"
              value={customHeight}
              min={100}
              max={10000}
              onChange={handleCustomHeightChange}
              suffix="px"
            />
          </HStack>

          {/* Swap Button */}
          <PanelStyledButton onClick={handleSwapDimensions}>
            Swap dimensions
          </PanelStyledButton>

          {/* Info */}
          <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
            Export will use this fixed size
          </Text>

          {/* Options Section */}
          <SectionHeader
            title="Options"
            titleTransform="uppercase"
            titleFontWeight="medium"
          />
          <VStack spacing={2} align="stretch">

            {/* Background Fill */}
            <VStack spacing={0} align="stretch">
              <Flex align="center" justify="space-between" w="100%">
                <Text fontSize="12px" fontWeight="400" color="gray.600" _dark={{ color: 'gray.400' }}>
                  Background fill
                </Text>
                <HStack spacing={1}>
                  <ToggleButton
                    isActive={backgroundColor === 'none'}
                    onClick={handleBackgroundNone}
                    aria-label="Set background color to none (transparent)"
                    variant="icon"
                    icon={<X size={12} />}
                    sx={{ borderRadius: 'full' }}
                  />
                  <Box flex="0 0 auto" minW="24px" display="flex" justifyContent="flex-end">
                    <ConditionalTooltip label="Select artboard background">
                      <MultiPaintPicker
                        label="Artboard Background"
                        value={backgroundColor === 'none' ? defaultBackgroundColor : backgroundColor}
                        onChange={handleBackgroundColorChange}
                        defaultColor={defaultBackgroundColor}
                        mode="fill"
                        floatingContainerRef={backgroundPickerSlotRef}
                        fullWidth={true}
                      />
                    </ConditionalTooltip>
                  </Box>
                </HStack>
              </Flex>
              <Box ref={backgroundPickerSlotRef} w="100%" />
            </VStack>

            {/* Show safe margins */}
            <Flex align="center" justify="space-between" w="100%">
              <Text fontSize="12px" fontWeight="400" color="gray.600" _dark={{ color: 'gray.400' }}>
                Show safe margins
              </Text>
              <PanelSwitch
                isChecked={showMargins}
                onChange={handleMarginsToggle}
                aria-label="Toggle safe margins"
              />
            </Flex>
            {showMargins && (
              <NumberInput
                label="Margin size"
                value={marginSize}
                min={0}
                max={200}
                onChange={handleMarginSizeChange}
                suffix="px"
              />
            )}

            {/* Show size on canvas */}
            <Flex align="center" justify="space-between" w="100%">
              <Text fontSize="12px" fontWeight="400" color="gray.600" _dark={{ color: 'gray.400' }}>
                Show size on canvas
              </Text>
              <PanelSwitch
                isChecked={showSizes}
                onChange={handleSizesToggle}
                aria-label="Toggle size labels"
              />
            </Flex>
          </VStack>
        </VStack>
      ) : null}
    </Panel>
  );
};

import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  ChevronDown,
  ChevronRight,
  Pipette
} from 'lucide-react';
import {
  VStack,
  HStack,
  IconButton as ChakraIconButton,
  Text,
  Box,
  Collapse,
  useColorMode,
  useColorModeValue
} from '@chakra-ui/react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { SliderControl } from '../../ui/SliderControl';
import { PercentSliderControl } from '../../ui/PercentSliderControl';
import { PresetButton } from '../../ui/FillAndStrokePresetButton';
import { getFillAndStrokePresets, type Preset } from '../../utils/fillAndStrokePresets';
import { useSelectedPathProperty } from '../../utils/pathPropertyUtils';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { paintTypeRegistry } from '../../utils/paintTypeRegistry';

// Sub-components
import { EditorColorControls } from './editor/EditorColorControls';
import { EditorStrokeControls } from './editor/EditorStrokeControls';

export const EditorPanel: React.FC = () => {
  // Use specific selectors instead of destructuring the entire store
  // Style properties are now in the centralized StyleSlice
  const style = useCanvasStore(state => state.style);
  const updateStyle = useCanvasStore(state => state.updateStyle);
  const updateSelectedPaths = useCanvasStore(state => state.updateSelectedPaths);
  const styleEyedropper = useCanvasStore(state => state.styleEyedropper);
  const activateStyleEyedropper = useCanvasStore(state => state.activateStyleEyedropper);
  const deactivateStyleEyedropper = useCanvasStore(state => state.deactivateStyleEyedropper);
  const defaultStrokeColor = useCanvasStore(state => state.settings.defaultStrokeColor);
  const { colorMode } = useColorMode();
  const presets = React.useMemo(() => getFillAndStrokePresets(colorMode), [colorMode]);
  const labelColor = useColorModeValue('gray.600', 'gray.300');

  // Colors for active style eyedropper button
  const activeButtonBg = useColorModeValue('gray.800', 'gray.200');
  const activeButtonColor = useColorModeValue('white', 'gray.900');
  const activeButtonHoverBg = useColorModeValue('gray.800', 'gray.200');

  // Calculate selected paths count - only re-renders if the count changes (not when positions change)
  const selectedStylableCount = useCanvasStore(state => {
    const selectedSet = new Set(state.selectedIds);
    return state.elements.filter(el => selectedSet.has(el.id) && el.type !== 'group').length;
  });

  // Handler for style eyedropper button
  const handleStyleEyedropper = () => {
    if (styleEyedropper.isActive) {
      deactivateStyleEyedropper();
    } else if (selectedStylableCount === 1) {
      activateStyleEyedropper();
    }
  };

  // Helper to update selected paths or fall back to style defaults
  const updatePathProperty = <T,>(property: string, value: T) => {
    // Allows updating properties for groups as well (e.g. opacity)
    const selectedCount = useCanvasStore.getState().selectedIds.length;
    if (selectedCount > 0) {
      updateSelectedPaths?.({ [property]: value });
    } else {
      updateStyle?.({ [property]: value });
    }
  };

  // Pencil properties handlers
  const handleStrokeWidthChange = (value: number) => {
    updatePathProperty('strokeWidth', value);
  };

  const handleStrokeColorChange = (value: string) => {
    updatePathProperty('strokeColor', value);
  };

  const handleStrokeNone = () => {
    updatePathProperty('strokeColor', 'none');
  };

  const handleOpacityChange = (value: number) => {
    updatePathProperty('strokeOpacity', value);
  };

  const handleGlobalOpacityChange = (value: number) => {
    updatePathProperty('opacity', value);
  };

  const handleFillColorChange = (value: string) => {
    updatePathProperty('fillColor', value);
  };

  const handleFillNone = () => {
    updatePathProperty('fillColor', 'none');
  };

  const handleFillOpacityChange = (value: number) => {
    updatePathProperty('fillOpacity', value);
  };

  const handlePresetSelect = (preset: Preset) => {
    const store = useCanvasStore.getState();
    const ensurePaintDefinition = (paintDef?: Preset['fillPaint']) => {
      paintTypeRegistry.ensureDefinition(paintDef, store);
    };

    ensurePaintDefinition(preset.fillPaint);
    ensurePaintDefinition(preset.strokePaint);

    if (selectedStylableCount > 0) {
      updateSelectedPaths?.({
        strokeWidth: preset.strokeWidth,
        strokeColor: preset.strokeColor,
        strokeOpacity: preset.strokeOpacity,
        fillColor: preset.fillColor,
        fillOpacity: preset.fillOpacity
      });
    } else {
      updateStyle?.({
        strokeWidth: preset.strokeWidth,
        strokeColor: preset.strokeColor,
        strokeOpacity: preset.strokeOpacity,
        fillColor: preset.fillColor,
        fillOpacity: preset.fillOpacity
      });
    }
  };

  // Handlers for new stroke properties
  const handleStrokeLinecapChange = (value: 'butt' | 'round' | 'square') => {
    updatePathProperty('strokeLinecap', value);
  };

  const handleStrokeLinejoinChange = (value: 'miter' | 'round' | 'bevel') => {
    updatePathProperty('strokeLinejoin', value);
  };

  const handleFillRuleChange = (value: 'nonzero' | 'evenodd') => {
    updatePathProperty('fillRule', value);
  };

  const handleStrokeDasharrayChange = (value: string) => {
    updatePathProperty('strokeDasharray', value);
  };

  // Get current values from selected elements or style defaults
  const currentStrokeWidth = useSelectedPathProperty('strokeWidth', style?.strokeWidth ?? 4);
  const currentStrokeColor = useSelectedPathProperty('strokeColor', style?.strokeColor ?? defaultStrokeColor);
  const currentOpacity = useSelectedPathProperty('strokeOpacity', style?.strokeOpacity ?? 1);
  const currentFillColor = useSelectedPathProperty('fillColor', style?.fillColor ?? 'none');
  const currentFillOpacity = useSelectedPathProperty('fillOpacity', style?.fillOpacity ?? 1);
  const currentStrokeLinecap = useSelectedPathProperty('strokeLinecap', style?.strokeLinecap ?? 'round');
  const currentStrokeLinejoin = useSelectedPathProperty('strokeLinejoin', style?.strokeLinejoin ?? 'round');
  const currentFillRule = useSelectedPathProperty('fillRule', style?.fillRule ?? 'nonzero');
  const currentStrokeDasharray = useSelectedPathProperty('strokeDasharray', style?.strokeDasharray ?? 'none');
  const currentGlobalOpacity = useSelectedPathProperty('opacity', style?.opacity !== undefined ? style.opacity : 1, true);

  const isColorControlsOpen = useCanvasStore((state) => state.editorColorControlsOpen);
  const setIsColorControlsOpen = useCanvasStore((state) => state.setEditorColorControlsOpen);

  const onColorControlsToggle = () => setIsColorControlsOpen(!isColorControlsOpen);

  return (
    <Box position="relative">
      <RenderCountBadgeWrapper componentName="EditorPanel" position="top-right" />
      {/* Pencil Properties Section */}
      <VStack spacing={0} align="stretch">
        {/* Color Presets */}
        <HStack minH="24px">
          {/* Style Eyedropper Button */}
          <ConditionalTooltip label={selectedStylableCount !== 1 ? 'Select exactly one element to copy its style' : styleEyedropper.isActive ? 'Click on another element to apply style' : 'Copy style from selected element'}>
            <ChakraIconButton
              aria-label={styleEyedropper.isActive ? "Cancel Style Copy" : "Copy Style"}
              icon={<Pipette size={12} />}
              onClick={handleStyleEyedropper}
              variant="ghost"
              size="xs"
              h="20px"
              minW="20px"
              borderRadius="full"
              flexShrink={0}
              bg={styleEyedropper.isActive ? activeButtonBg : "transparent"}
              color={styleEyedropper.isActive ? activeButtonColor : undefined}
              _hover={styleEyedropper.isActive ? { bg: activeButtonHoverBg } : undefined}
              isDisabled={!styleEyedropper.isActive && selectedStylableCount !== 1}
            />
          </ConditionalTooltip>
          <Box
            display="flex"
            justifyContent="flex-start"
            flex="1 1 0"
            minW={0}
          >
            <Box
              display="flex"
              gap={1}
              overflowX="auto"
              px={1}
              py={1}
              flex="1 1 0"
              minW={0}
              maxW="100%"
              alignItems="center"
              sx={{
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}
            >
              {presets.map((preset) => (
                <PresetButton
                  key={preset.id}
                  preset={preset}
                  onClick={handlePresetSelect}
                />
              ))}
            </Box>
          </Box>
          <ConditionalTooltip label={isColorControlsOpen ? "Collapse Color Controls" : "Expand Color Controls"}>
            <ChakraIconButton
              aria-label={isColorControlsOpen ? "Collapse Color Controls" : "Expand Color Controls"}
              icon={isColorControlsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              onClick={onColorControlsToggle}
              variant="ghost"
              size="xs"
              h="20px"
              minW="20px"
              borderRadius="full"
              flexShrink={0}
              bg="transparent"
            />
          </ConditionalTooltip>
        </HStack>

        {/* Color Controls */}
        <Collapse in={isColorControlsOpen} animateOpacity>
          <EditorColorControls
            labelColor={labelColor}
            defaultStrokeColor={defaultStrokeColor}
            currentFillOpacity={currentFillOpacity}
            handleFillOpacityChange={handleFillOpacityChange}
            currentFillColor={currentFillColor}
            handleFillNone={handleFillNone}
            handleFillColorChange={handleFillColorChange}
            currentStrokeOpacity={currentOpacity}
            handleOpacityChange={handleOpacityChange}
            currentStrokeColor={currentStrokeColor}
            handleStrokeNone={handleStrokeNone}
            handleStrokeColorChange={handleStrokeColorChange}
          />
          {/* Global Opacity */}
          <HStack minH="24px" justify="flex-start" spacing={1.5}>
            <Text fontSize="12px" fontWeight="400" color={labelColor} minW="50px" h="24px" display="flex" alignItems="center">
              Opacity
            </Text>
            <Box flex={1} minW="120px" pr={0.5}>
              <PercentSliderControl
                value={currentGlobalOpacity}
                onChange={handleGlobalOpacityChange}
                title="Global Opacity"
                minWidth="50px"
                valueWidth="40px"
                inline={true}
                gap="4px"
              />
            </Box>
          </HStack>
          {/* Stroke Width */}
          <HStack minH="24px" justify="flex-start" spacing={1.5}>
            <Text fontSize="12px" fontWeight="400" color={labelColor} minW="50px" h="24px" display="flex" alignItems="center">
              Width
            </Text>
            <Box flex={1} minW="120px" pr={0.5}>
              <SliderControl
                value={currentStrokeWidth}
                min={0}
                max={5}
                step={0.1}
                stepFunction={(value) => value < 1 ? 0.1 : 1}
                onChange={handleStrokeWidthChange}
                formatter={(value) => {
                  if (value === 0) return '0px';
                  if (Number.isInteger(value)) return `${value}px`;
                  return `${value.toFixed(1)}px`;
                }}
                title="Stroke Width"
                inline={true}
                minWidth="50px"
                valueWidth="40px"
                gap="4px"
              />
            </Box>
          </HStack>
          <EditorStrokeControls
            labelColor={labelColor}
            currentStrokeLinecap={currentStrokeLinecap ?? 'round'}
            handleStrokeLinecapChange={handleStrokeLinecapChange}
            currentStrokeLinejoin={currentStrokeLinejoin ?? 'round'}
            handleStrokeLinejoinChange={handleStrokeLinejoinChange}
            currentFillRule={currentFillRule ?? 'nonzero'}
            handleFillRuleChange={handleFillRuleChange}
            currentStrokeDasharray={currentStrokeDasharray ?? 'none'}
            handleStrokeDasharrayChange={handleStrokeDasharrayChange}
          />
        </Collapse>
      </VStack>

    </Box>
  );
};

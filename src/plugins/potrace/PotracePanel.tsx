import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Input,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { SectionHeader } from '../../ui/SectionHeader';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { applyPotraceToSelection } from './actions';
import { createPropertyUpdater, createPropertyGetters } from '../../utils/panelHelpers';

interface PotracePanelProps { 
  hideTitle?: boolean;
}

export const PotracePanel: React.FC<PotracePanelProps> = ({ hideTitle = false }) => {
  // Get potrace state and update function
  const { potrace, updatePotraceState, selectedIds } = useCanvasStore(
    useShallow((state) => ({
      potrace: state.potrace,
      updatePotraceState: state.updatePotraceState,
      selectedIds: state.selectedIds,
    }))
  );

  // Create property updater and current values helper
  const updateProperty = createPropertyUpdater(updatePotraceState);
  const current = createPropertyGetters(potrace, {
    threshold: 128,
    turnPolicy: 'minority' as const,
    turdSize: 2,
    optCurve: true,
    optTolerance: 0.2,
    alphaMax: 1.0,
    minPathSegments: 0,
    renderScale: 1,
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    invert: 0,
    colorMode: 'monochrome' as const,
  });

  const hasSelection = selectedIds.length > 0;

  const handleApplyPotrace = async () => {
    const getState = useCanvasStore.getState;
    await applyPotraceToSelection(getState);
  };

  const handleReset = () => {
    updatePotraceState({
      threshold: 128,
      turnPolicy: 'minority',
      turdSize: 2,
      optCurve: true,
      optTolerance: 0.2,
      alphaMax: 1.0,
      minPathSegments: 0,
      renderScale: 1,
      brightness: 100,
      contrast: 100,
      grayscale: 0,
      invert: 0,
      colorMode: 'monochrome',
    });
  };

  return (
    <Panel title="Potrace Vectorization" hideHeader={hideTitle}>
      <VStack spacing={0} align="stretch">

        {/* Output Mode Section */}
        <VStack spacing={0} align="stretch">
          {/* Color Mode selector */}
          <VStack spacing={1} align="stretch">
            <CustomSelect
              value={current.colorMode}
              onChange={(value) => updateProperty('colorMode')(value as 'monochrome' | 'color')}
              options={[
                { value: 'monochrome', label: 'Monochrome' },
                { value: 'color', label: 'Color (extract colors)' },
              ]}
            />
          </VStack>
        </VStack>

 
       {/* Image Preprocessing Section */}
        <VStack spacing={0} align="stretch" mt={2}>
          <SectionHeader title="Image Preprocessing" />

          {/* Brightness */}
          <SliderControl
            label="Brightness"
            value={current.brightness}
            onChange={updateProperty('brightness')}
            min={0}
            max={200}
            step={1}
            formatter={(value) => `${value}%`}
          />

          {/* Contrast */}
          <SliderControl
            label="Contrast"
            value={current.contrast}
            onChange={updateProperty('contrast')}
            min={0}
            max={200}
            step={1}
            formatter={(value) => `${value}%`}
          />

          {/* Grayscale */}
          <VStack spacing={1} align="stretch">
            <SliderControl
              label="Grayscale"
              value={current.grayscale}
              onChange={updateProperty('grayscale')}
              min={0}
              max={100}
              step={1}
              formatter={(value) => `${value}%`}
            />
          </VStack>

          {/* Invert */}
          <SliderControl
            label="Invert"
            value={current.invert}
            onChange={updateProperty('invert')}
            min={0}
            max={100}
            step={1}
            formatter={(value) => `${value}%`}
          />
        </VStack>
       {/* 
        {/* Potrace Options Section */}
        <VStack spacing={0} align="stretch" mt={2}>
          <SectionHeader title="Potrace Options" />

          {/* Threshold control */}
          <VStack spacing={1} align="stretch">
            <SliderControl
              label="Threshold"
              value={current.threshold}
              onChange={updateProperty('threshold')}
              min={0}
              max={255}
              step={1}
            />
          </VStack>

          {/* Speckle Size (Turd Size) */}
          <HStack spacing={2} align="center" py={1} w="full" justify="space-between">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} minW="40px" flexShrink={0}>
              Suppress Speckles
            </Text>
            <Input
              value={current.turdSize.toString()}
              onChange={(e) => {
                const numValue = parseInt(e.target.value, 10);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                  updateProperty('turdSize')(numValue);
                }
              }}
              type="number"
              min={0}
              max={100}
              step={1}
              textAlign="right"
              fontSize="11px"
              h="20px"
              w="50px"
              px={2}
              borderRadius="0"
              borderColor="gray.300"
              bg="white"
              _dark={{
                borderColor: 'whiteAlpha.300',
                bg: 'gray.800'
              }}
              _focus={{
                borderColor: 'gray.600',
                boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
              }}
            />
          </HStack>

          {/* Turn Policy */}
          <VStack spacing={1} align="stretch">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} minW="40px" flexShrink={0}>
              Turn Policy
            </Text>
            <CustomSelect
              value={current.turnPolicy}
              onChange={(value) => updateProperty('turnPolicy')(value as typeof current.turnPolicy)}
              options={[
                { value: 'minority', label: 'Minority' },
                { value: 'majority', label: 'Majority' },
                { value: 'black', label: 'Black' },
                { value: 'white', label: 'White' },
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </VStack>

          {/* Optimization Tolerance */}
          <VStack spacing={0} align="stretch">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} minW="40px" flexShrink={0}>
              Curve Optimization
            </Text>
            <SliderControl
              value={current.optTolerance}
              onChange={updateProperty('optTolerance')}
              min={0}
              max={5}
              step={0.1}
              formatter={(value) => value.toFixed(2)}
            />
          </VStack>

          {/* Alpha Max (Corner Threshold) */}
          <VStack spacing={0} align="stretch">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} minW="40px" flexShrink={0}>
              Corner Threshold
            </Text>
            <SliderControl
              value={current.alphaMax}
              onChange={updateProperty('alphaMax')}
              min={0}
              max={2}
              step={0.1}
              formatter={(value) => value.toFixed(2)}
            />
          </VStack>

          {/* Min Path Segments */}
          <VStack spacing={0} align="stretch">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} minW="40px" flexShrink={0}>
              Min Path Length
            </Text>
            <SliderControl
              value={current.minPathSegments}
              onChange={updateProperty('minPathSegments')}
              min={0}
              max={30}
              step={1}
              formatter={(value) => `${value}`}
            />
          </VStack>

          {/* Render Scale */}
          <SliderControl
            label="Render Scale"
            value={current.renderScale}
            onChange={updateProperty('renderScale')}
            min={1}
            max={4}
            step={1}
          />
        </VStack>

        {/* Reset and Apply Buttons */}
        <HStack spacing={2} pt={2}>
          <PanelStyledButton onClick={handleReset} flex={1}>
            Reset
          </PanelStyledButton>

          <PanelStyledButton
            onClick={handleApplyPotrace}
            isDisabled={!hasSelection}
            flex={1}
          >
            Apply
          </PanelStyledButton>
        </HStack>

        {!hasSelection && (
          <Text fontSize="xs" color="orange.400" textAlign="center">
            ⚠️ Select elements to convert
          </Text>
        )}
      </VStack>
    </Panel>
  );
};

import React from 'react';
import { VStack, HStack, IconButton, Text, Box, Flex } from '@chakra-ui/react';
import { Trash2, Lock, Unlock } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggleGroup } from '../../ui/PanelToggleGroup';
import { NumberInput } from '../../ui/NumberInput';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';
import type { ManualGuide } from './types';

const GuidelinesPanelComponent: React.FC = () => {
  const guidelines = useCanvasStore(state => state.guidelines);
  const updateGuidelinesState = useCanvasStore(state => state.updateGuidelinesState);
  const removeManualGuide = useCanvasStore(state => state.removeManualGuide);
  const updateManualGuide = useCanvasStore(state => state.updateManualGuide);
  const clearManualGuides = useCanvasStore(state => state.clearManualGuides);

  const { createToggleHandler } = usePanelToggleHandlers(updateGuidelinesState ?? (() => {}));
  
  const handleToggleGuidelines = createToggleHandler('enabled');
  const handleToggleDistanceGuidelines = createToggleHandler('distanceEnabled');
  const handleToggleSizeMatching = createToggleHandler('sizeMatchingEnabled');
  const handleToggleManualGuides = createToggleHandler('manualGuidesEnabled');
  const handleToggleDebugMode = createToggleHandler('debugMode');
  
  const handleToggleSnapToPath = createToggleHandler('snapToPath');
  const handleToggleSnapToCenters = createToggleHandler('snapToCenters');
  const handleToggleSnapToManualGuides = createToggleHandler('snapToManualGuides');
  const handleToggleSnapToViewportCenter = createToggleHandler('snapToViewportCenter');

  const handleThresholdChange = (value: number) => {
    updateGuidelinesState?.({ snapThreshold: value });
  };

  const handleGuidePositionChange = (guide: ManualGuide, position: number) => {
    updateManualGuide?.(guide.id, { position });
  };

  const handleToggleGuideLock = (guide: ManualGuide) => {
    updateManualGuide?.(guide.id, { locked: !guide.locked });
  };

  const handleDeleteGuide = (guideId: string) => {
    removeManualGuide?.(guideId);
  };

  return (
    <Panel 
      title="Guidelines"
      isCollapsible={guidelines?.enabled ?? false}
      defaultOpen={false}
      headerActions={
        <PanelSwitch 
          isChecked={guidelines?.enabled ?? false} 
          onChange={handleToggleGuidelines} 
          title="Enable Guidelines" 
          aria-label="Enable Guidelines" 
        />
      }
    >
      {guidelines?.enabled ? (
        <VStack spacing={2} align="stretch">
          {/* Row 1: Distance + Size + Manual + Angles */}
          <PanelToggleGroup
            toggles={[
              { label: 'Dist', isChecked: guidelines?.distanceEnabled ?? false, onChange: handleToggleDistanceGuidelines },
              { label: 'Size', isChecked: guidelines?.sizeMatchingEnabled ?? false, onChange: handleToggleSizeMatching },
              { label: 'Manual', isChecked: guidelines?.manualGuidesEnabled ?? false, onChange: handleToggleManualGuides },
            ]}
            spacing={1}
          />

          {/* Row 2: Snap options */}
          <PanelToggleGroup
            toggles={[
              { label: 'Path', isChecked: guidelines?.snapToPath ?? true, onChange: handleToggleSnapToPath },
              { label: 'Center', isChecked: guidelines?.snapToCenters ?? true, onChange: handleToggleSnapToCenters },
              { label: 'Guide', isChecked: guidelines?.snapToManualGuides ?? true, onChange: handleToggleSnapToManualGuides, isDisabled: !guidelines?.manualGuidesEnabled },
              { label: 'View', isChecked: guidelines?.snapToViewportCenter ?? true, onChange: handleToggleSnapToViewportCenter },
            ]}
            spacing={1}
          />

          {/* Row 3: Thresholds side by side */}
          <Flex gap={2}>
            <NumberInput
              label="Snap"
              value={guidelines?.snapThreshold ?? 5}
              onChange={handleThresholdChange}
              min={1}
              max={50}
              step={1}
              suffix="px"
              labelWidth="32px"
            />
            {/* Angle snapping removed */}
          </Flex>

          {/* Manual guides list - compact */}
          {guidelines?.manualGuidesEnabled && guidelines?.manualGuides?.length > 0 && (
            <VStack spacing={1} align="stretch">
              <HStack justify="space-between" h="20px">
                <Text fontSize="2xs" color="gray.500">
                  Guides ({guidelines.manualGuides.length})
                </Text>
                <IconButton
                  aria-label="Clear all"
                  icon={<Trash2 size={12} />}
                  size="xs"
                  variant="ghost"
                  h="18px"
                  minW="18px"
                  onClick={() => clearManualGuides?.()}
                />
              </HStack>
              
              <VStack spacing={0} align="stretch" maxH="100px" overflowY="auto">
                {guidelines.manualGuides.map((guide: ManualGuide) => (
                  <HStack key={guide.id} spacing={1} py={0.5}>
                    <Box w="2px" h="16px" bg={guide.color || '#00BFFF'} borderRadius="sm" />
                    <Text fontSize="2xs" color="gray.500" w="10px">{guide.type === 'horizontal' ? 'H' : 'V'}</Text>
                    <NumberInput
                      label=""
                      value={Math.round(guide.position)}
                      onChange={(v) => handleGuidePositionChange(guide, v)}
                      labelWidth="0px"
                      inputWidth="45px"
                    />
                    <IconButton
                      aria-label={guide.locked ? 'Unlock' : 'Lock'}
                      icon={guide.locked ? <Lock size={12} /> : <Unlock size={12} />}
                      size="xs"
                      variant="ghost"
                      h="18px"
                      minW="18px"
                      onClick={() => handleToggleGuideLock(guide)}
                    />
                    <IconButton
                      aria-label="Delete"
                      icon={<Trash2 size={12} />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      h="18px"
                      minW="18px"
                      onClick={() => handleDeleteGuide(guide.id)}
                      isDisabled={guide.locked}
                    />
                  </HStack>
                ))}
              </VStack>
            </VStack>
          )}

          {/* Debug mode inline */}
          {import.meta.env.DEV && (
            <PanelToggleGroup toggles={[{ label: 'Debug', isChecked: guidelines?.debugMode ?? false, onChange: handleToggleDebugMode }]} spacing={1} />
          )}
        </VStack>
      ) : null}
    </Panel>
  );
};

export const GuidelinesPanel = React.memo(GuidelinesPanelComponent);

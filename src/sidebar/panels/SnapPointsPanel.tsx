import React from 'react';
import { VStack, Box } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggleGroup } from '../../ui/PanelToggleGroup';
import { PercentSliderControl } from '../../ui/PercentSliderControl';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore } from '../../store/canvasStore';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';

export const SnapPointsPanel: React.FC = () => {
  const snapPoints = useCanvasStore((state) => state.snapPoints);
  const updateSnapPointsState = useCanvasStore((state) => state.updateSnapPointsState);
  const { createToggleHandler } = usePanelToggleHandlers(updateSnapPointsState);

  const handleToggleShowSnapPoints = createToggleHandler('showSnapPoints');
  const handleToggleAnchors = createToggleHandler('snapToAnchors');
  const handleToggleMidpoints = createToggleHandler('snapToMidpoints');
  const handleTogglePath = createToggleHandler('snapToPath');
  const handleToggleBBoxCorners = createToggleHandler('snapToBBoxCorners');
  const handleToggleBBoxCenter = createToggleHandler('snapToBBoxCenter');
  const handleToggleIntersections = createToggleHandler('snapToIntersections');

  const handleSnapPointsOpacityChange = (value: number) => {
    updateSnapPointsState?.({ snapPointsOpacity: Math.round(value * 100) });
  };

  const handleSnapThresholdChange = (value: number) => {
    updateSnapPointsState?.({ snapThreshold: value });
  };

  return (
    <Panel
      title="Snap Points"
      isCollapsible={snapPoints?.showSnapPoints ?? false}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={snapPoints?.showSnapPoints ?? false}
          onChange={handleToggleShowSnapPoints}
          title="Show Snap Points"
          aria-label="Show Snap Points"
        />
      }
    >
      {snapPoints?.showSnapPoints ? (
        <VStack spacing={1} align="stretch" pb={0.5}>
          <PanelToggleGroup
            toggles={[
              { label: 'Anchor', isChecked: snapPoints?.snapToAnchors ?? true, onChange: handleToggleAnchors },
              { label: 'Midpoint', isChecked: snapPoints?.snapToMidpoints ?? true, onChange: handleToggleMidpoints },
              { label: 'Path', isChecked: snapPoints?.snapToPath ?? true, onChange: handleTogglePath },
            ]}
            spacing={3}
          />
          <PanelToggleGroup
            toggles={[
              { label: 'Corner', isChecked: snapPoints?.snapToBBoxCorners ?? true, onChange: handleToggleBBoxCorners },
              { label: 'Center', isChecked: snapPoints?.snapToBBoxCenter ?? true, onChange: handleToggleBBoxCenter },
              { label: 'Intersection', isChecked: snapPoints?.snapToIntersections ?? true, onChange: handleToggleIntersections },
            ]}
            spacing={3}
          />
          <Box pr={0.5}>
            <PercentSliderControl
              label="Opacity"
              value={(snapPoints?.snapPointsOpacity ?? 50) / 100}
              step={0.1}
              decimals={0}
              onChange={handleSnapPointsOpacityChange}
              labelWidth="60px"
              valueWidth="45px"
              marginBottom="0"
            />
          </Box>
          <Box mt={1} pr={0.5}>
            <SliderControl
              label="Threshold"
              value={snapPoints?.snapThreshold ?? 10}
              min={4}
              max={20}
              step={1}
              onChange={handleSnapThresholdChange}
              labelWidth="60px"
              valueWidth="45px"
              marginBottom="0"
            />
          </Box>
        </VStack>
      ) : null}
    </Panel>
  );
};

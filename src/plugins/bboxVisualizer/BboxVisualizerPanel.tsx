import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { BboxVisualizerPluginSlice } from './slice';
import { computeBBoxes, computeOverlaps, formatArea } from './bboxUtils';
import type { CanvasElement } from '../../types';

type BboxStore = CanvasStore & BboxVisualizerPluginSlice;

export const BboxVisualizerPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as BboxStore;
      return {
        state: st.bboxVisualizer,
        update: st.updateBboxVisualizerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const handleAnalyze = useCallback(() => {
    if (!state || !update) return;
    const targetEls = state.showAllElements
      ? elements
      : elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    const bboxes = computeBBoxes(targetEls);
    const overlaps = computeOverlaps(bboxes);
    const totalArea = bboxes.reduce((s, b) => s + b.area, 0);
    const totalOverlapArea = overlaps.reduce((s, o) => s + o.overlapArea, 0);
    update({ bboxes, overlaps, totalArea, totalOverlapArea });
  }, [state, update, selectedIds, elements]);

  if (!state || !update) return null;

  return (
    <Panel
      title="Bounding Boxes"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle bounding box overlay"
        />
      }
    >
      {state.enabled && (
        <>
          <PanelToggle
            isChecked={state.showDimensions}
            onChange={(e) => update({ showDimensions: e.target.checked })}
          >
            Show Dimensions
          </PanelToggle>

          <PanelToggle
            isChecked={state.showArea}
            onChange={(e) => update({ showArea: e.target.checked })}
          >
            Show Area
          </PanelToggle>

          <PanelToggle
            isChecked={state.showOverlaps}
            onChange={(e) => update({ showOverlaps: e.target.checked })}
          >
            Highlight Overlaps
          </PanelToggle>

          <PanelToggle
            isChecked={state.showAllElements}
            onChange={(e) => update({ showAllElements: e.target.checked })}
          >
            All Elements (not just selection)
          </PanelToggle>

          <PanelStyledButton onClick={handleAnalyze}>
            Refresh Analysis
          </PanelStyledButton>

          {state.bboxes.length > 0 && (
            <>
              <SectionHeader title="Statistics" />

              <HStack justify="space-between" px={2} py={1}>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Elements</Text>
                <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }}>{state.bboxes.length}</Text>
              </HStack>

              <HStack justify="space-between" px={2} py={1}>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Total Bounding Area</Text>
                <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }}>{formatArea(state.totalArea)}</Text>
              </HStack>

              {state.overlaps.length > 0 && (
                <>
                  <HStack justify="space-between" px={2} py={1}>
                    <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Overlap Regions</Text>
                    <Text fontSize="xs" color="red.400">{state.overlaps.length}</Text>
                  </HStack>

                  <HStack justify="space-between" px={2} py={1}>
                    <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Overlap Area</Text>
                    <Text fontSize="xs" color="red.700" _dark={{ color: 'red.300' }}>{formatArea(state.totalOverlapArea)}</Text>
                  </HStack>
                </>
              )}

              <SectionHeader title="Elements" />

              <VStack gap={1} align="stretch" maxH="200px" overflowY="auto" px={2}>
                {state.bboxes.map((bbox) => (
                  <Box
                    key={bbox.id}
                    p={2}
                    bg="whiteAlpha.50"
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{ bg: 'whiteAlpha.100' }}
                    onClick={() => {
                      const store = useCanvasStore.getState();
                      store.selectElements([bbox.id]);
                    }}
                  >
                    <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }} fontWeight="bold" mb={1}>
                      {bbox.id.slice(0, 12)}...
                    </Text>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>
                        {bbox.width.toFixed(1)} × {bbox.height.toFixed(1)}
                      </Text>
                      <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>
                        {formatArea(bbox.area)}
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </>
          )}
        </>
      )}
    </Panel>
  );
};

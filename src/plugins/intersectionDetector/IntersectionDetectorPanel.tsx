import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { IntersectionDetectorPluginSlice } from './slice';
import { detectIntersections } from './intersectionUtils';
import type { CanvasElement } from '../../types';

type IStore = CanvasStore & IntersectionDetectorPluginSlice;

export const IntersectionDetectorPanel: React.FC = () => {
  const { state, update, selectedIds, elements, selectElements } = useCanvasStore(
    useShallow((s) => {
      const st = s as IStore;
      return {
        state: st.intersectionDetector,
        update: st.updateIntersectionDetectorState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        selectElements: s.selectElements,
      };
    })
  );

  const handleDetect = useCallback(() => {
    if (!state || !update) return;
    const target = selectedIds.length > 0
      ? elements.filter((el: CanvasElement) => selectedIds.includes(el.id))
      : elements;
    const intersections = detectIntersections(target as CanvasElement[], state.tolerance, state.selfIntersections);
    update({ intersections });
  }, [state, update, selectedIds, elements]);

  if (!state || !update) return null;

  return (
    <Panel
      title="Intersections"
      isCollapsible={state.showOverlay}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.showOverlay}
          onChange={(e) => update({ showOverlay: e.target.checked })}
          aria-label="Toggle intersection overlay"
        />
      }
    >
      {state.showOverlay && (
        <>
          <SliderControl
            label="Tolerance"
            value={state.tolerance}
            min={0.5}
            max={10}
            step={0.5}
            onChange={(v) => update({ tolerance: v })}
            formatter={(v) => `${v}px`}
          />

          <PanelToggle
            isChecked={state.selfIntersections}
            onChange={(e) => update({ selfIntersections: e.target.checked })}
          >
            Self Intersections
          </PanelToggle>

          <PanelStyledButton onClick={handleDetect}>
            Detect Intersections
          </PanelStyledButton>

          {state.intersections.length > 0 && (
            <>
              <SectionHeader title={`Found (${state.intersections.length})`} />
              <VStack gap={1} align="stretch" maxH="260px" overflowY="auto" px={2}>
                {state.intersections.map((pt, i) => (
                  <Box
                    key={i}
                    p={1.5}
                    borderRadius="sm"
                    bg="whiteAlpha.50"
                    cursor="pointer"
                    _hover={{ bg: 'whiteAlpha.100' }}
                    onClick={() => {
                      const ids = new Set([pt.elementIdA, pt.elementIdB]);
                      selectElements(Array.from(ids));
                    }}
                    borderLeft="3px solid"
                    borderColor="red.400"
                  >
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }} isTruncated maxW="130px">
                        {pt.labelA} ✕ {pt.labelB}
                      </Text>
                      <Text fontSize="xs" fontFamily="mono" color="gray.600" _dark={{ color: 'gray.500' }}>
                        ({pt.x}, {pt.y})
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </>
          )}

          {state.intersections.length === 0 && (
            <Box px={2}>
              <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>
                No intersections detected. Click the button above to analyze.
              </Text>
            </Box>
          )}
        </>
      )}
    </Panel>
  );
};

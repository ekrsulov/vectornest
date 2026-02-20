import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { DistanceMatrixPluginSlice } from './slice';
import { computeDistanceMatrix } from './distanceUtils';
import type { CanvasElement } from '../../types';

type DStore = CanvasStore & DistanceMatrixPluginSlice;

export const DistanceMatrixPanel: React.FC = () => {
  const { state, update, selectedIds, elements, selectElements } = useCanvasStore(
    useShallow((s) => {
      const st = s as DStore;
      return {
        state: st.distanceMatrix,
        update: st.updateDistanceMatrixState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        selectElements: s.selectElements,
      };
    })
  );

  const handleCompute = useCallback(() => {
    if (!update) return;
    const target = selectedIds.length >= 2
      ? elements.filter((el: CanvasElement) => selectedIds.includes(el.id))
      : elements;
    const result = computeDistanceMatrix(target as CanvasElement[]);
    update(result);
  }, [update, selectedIds, elements]);

  if (!state || !update) return null;

  return (
    <Panel title="Distance Matrix" isCollapsible defaultOpen={false}>
      <PanelStyledButton onClick={handleCompute}>
        Compute Distances
      </PanelStyledButton>

      {state.pairs.length > 0 && (
        <>
          {/* Summary stats */}
          <HStack gap={2} px={2} justify="space-between">
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Nearest</Text>
              <Text fontSize="xs" color="green.400" fontFamily="mono">
                {state.nearestPair?.distance ?? '—'}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Average</Text>
              <Text fontSize="xs" color="blue.300" fontFamily="mono">
                {state.avgDistance}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Farthest</Text>
              <Text fontSize="xs" color="red.400" fontFamily="mono">
                {state.farthestPair?.distance ?? '—'}
              </Text>
            </Box>
          </HStack>

          <SectionHeader title={`Pairs (${state.pairs.length})`} />
          <VStack gap={1} align="stretch" maxH="280px" overflowY="auto" px={2}>
            {state.pairs.map((p, i) => {
              const isNearest = p === state.nearestPair || (state.nearestPair && p.distance === state.nearestPair.distance);
              const isFarthest = p === state.farthestPair || (state.farthestPair && p.distance === state.farthestPair.distance);
              return (
                <Box
                  key={i}
                  p={1.5}
                  borderRadius="sm"
                  bg="whiteAlpha.50"
                  cursor="pointer"
                  _hover={{ bg: 'whiteAlpha.100' }}
                  onClick={() => selectElements([p.idA, p.idB])}
                  borderLeft="3px solid"
                  borderColor={isNearest ? 'green.400' : isFarthest ? 'red.400' : 'gray.600'}
                >
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="gray.300" isTruncated maxW="140px">
                      {p.labelA} ↔ {p.labelB}
                    </Text>
                    <Text fontSize="xs" fontFamily="mono" color="blue.300">
                      {p.distance}px
                    </Text>
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        </>
      )}
    </Panel>
  );
};

import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { GradientMapperPluginSlice } from './slice';
import type { GradientsSlice } from '../gradients/slice';
import { analyzeGradients } from './gradientUtils';

type GStore = CanvasStore & GradientMapperPluginSlice & GradientsSlice;

export const GradientMapperPanel: React.FC = () => {
  const { state, update, gradients, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as GStore;
      return {
        state: st.gradientMapper,
        update: st.updateGradientMapperState,
        gradients: st.gradients ?? [],
        elements: s.elements,
      };
    })
  );

  const handleAnalyze = useCallback(() => {
    if (!update) return;
    const result = analyzeGradients(gradients, elements);
    update(result);
  }, [update, gradients, elements]);

  if (!state || !update) return null;

  return (
    <Panel title="Gradient Mapper" isCollapsible defaultOpen={false}>
      <PanelStyledButton onClick={handleAnalyze}>
        Map Gradients
      </PanelStyledButton>

      {state.totalGradients > 0 && (
        <>
          {/* Summary */}
          <HStack gap={2} px={2} justify="space-between">
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Total</Text>
              <Text fontSize="xs" color="blue.300" fontFamily="mono">{state.totalGradients}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Linear</Text>
              <Text fontSize="xs" color="green.400" fontFamily="mono">{state.linearCount}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Radial</Text>
              <Text fontSize="xs" color="purple.400" fontFamily="mono">{state.radialCount}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Avg Stops</Text>
              <Text fontSize="xs" color="gray.300" fontFamily="mono">{state.avgStopCount}</Text>
            </Box>
          </HStack>

          {/* Similar pairs */}
          {state.similarPairs.length > 0 && (
            <>
              <SectionHeader title={`Similar (${state.similarPairs.length})`} />
              <VStack gap={1} align="stretch" px={2}>
                {state.similarPairs.map((p, i) => (
                  <Box key={i} p={1.5} borderRadius="sm" bg="orange.900">
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="orange.300" isTruncated maxW="130px">
                        {p.nameA} ↔ {p.nameB}
                      </Text>
                      <Text fontSize="xs" fontFamily="mono" color="orange.200">
                        {Math.round(p.similarity * 100)}%
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </>
          )}

          {/* Gradient list */}
          <SectionHeader title="Gradients" />
          <VStack gap={1} align="stretch" maxH="260px" overflowY="auto" px={2}>
            {state.gradientInfos.map((g) => (
              <Box
                key={g.gradientId}
                p={1.5}
                borderRadius="sm"
                bg="whiteAlpha.50"
                borderLeft="3px solid"
                borderColor={g.type === 'linear' ? 'green.400' : 'purple.400'}
              >
                <HStack justify="space-between">
                  <Text fontSize="xs" color="gray.300" isTruncated maxW="100px">
                    {g.name}
                  </Text>
                  <Text fontSize="9px" color="gray.500">{g.type}</Text>
                </HStack>
                {/* Color preview */}
                <HStack gap={0} mt={1}>
                  {g.colors.map((color, idx) => (
                    <Box
                      key={idx}
                      w="14px"
                      h="10px"
                      bg={color}
                      borderRadius={idx === 0 ? '2px 0 0 2px' : idx === g.colors.length - 1 ? '0 2px 2px 0' : '0'}
                    />
                  ))}
                </HStack>
                <HStack justify="space-between" mt={0.5}>
                  <Text fontSize="9px" color="gray.500">
                    {g.stopCount} stops
                  </Text>
                  <Text fontSize="9px" color="gray.500">
                    {g.usedByElements.length} elements
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </>
      )}
    </Panel>
  );
};

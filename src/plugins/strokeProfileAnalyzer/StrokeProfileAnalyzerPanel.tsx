import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { StrokeProfileAnalyzerPluginSlice } from './slice';
import { analyzeStrokeProfiles } from './strokeUtils';
import type { CanvasElement } from '../../types';

type SStore = CanvasStore & StrokeProfileAnalyzerPluginSlice;

export const StrokeProfileAnalyzerPanel: React.FC = () => {
  const { state, update, elements, selectElements } = useCanvasStore(
    useShallow((s) => {
      const st = s as SStore;
      return {
        state: st.strokeProfileAnalyzer,
        update: st.updateStrokeProfileAnalyzerState,
        elements: s.elements,
        selectElements: s.selectElements,
      };
    })
  );

  const handleAnalyze = useCallback(() => {
    if (!update) return;
    const result = analyzeStrokeProfiles(elements as CanvasElement[]);
    update(result);
  }, [update, elements]);

  if (!state || !update) return null;

  const scoreColor = state.consistencyScore >= 80 ? 'green.400'
    : state.consistencyScore >= 50 ? 'yellow.400' : 'red.400';

  return (
    <Panel title="Stroke Profiles" isCollapsible defaultOpen={false}>
      <PanelStyledButton onClick={handleAnalyze}>
        Analyze Strokes
      </PanelStyledButton>

      {state.profiles.length > 0 && (
        <>
          {/* Summary */}
          <HStack gap={2} px={2} justify="space-between">
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Stroked</Text>
              <Text fontSize="xs" color="blue.300" fontFamily="mono">{state.totalStroked}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Unstroked</Text>
              <Text fontSize="xs" color="gray.400" fontFamily="mono">{state.totalUnstroked}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Widths</Text>
              <Text fontSize="xs" color="gray.300" fontFamily="mono">{state.uniqueWidths}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="9px" color="gray.500">Consistency</Text>
              <Text fontSize="xs" color={scoreColor} fontFamily="mono">{state.consistencyScore}%</Text>
            </Box>
          </HStack>

          <SectionHeader title={`Profiles (${state.profiles.length})`} />
          <VStack gap={1} align="stretch" maxH="280px" overflowY="auto" px={2}>
            {state.profiles.map((p, i) => (
              <Box
                key={i}
                p={1.5}
                borderRadius="sm"
                bg="whiteAlpha.50"
                cursor="pointer"
                _hover={{ bg: 'whiteAlpha.100' }}
                onClick={() => selectElements(p.elementIds)}
                borderLeft="3px solid"
                borderColor={i === 0 ? 'green.400' : 'gray.600'}
              >
                <HStack justify="space-between">
                  <HStack gap={1}>
                    <Box w="12px" h="12px" borderRadius="sm" bg={p.color} border="1px solid" borderColor="whiteAlpha.300" />
                    <Text fontSize="xs" color="gray.300" fontFamily="mono">
                      {p.width}px
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="blue.300" fontFamily="mono">
                    {p.elementCount} elem{p.elementCount > 1 ? 's' : ''}
                  </Text>
                </HStack>
                <HStack gap={2} mt={0.5}>
                  <Text fontSize="9px" color="gray.500">
                    cap: {p.linecap}
                  </Text>
                  <Text fontSize="9px" color="gray.500">
                    join: {p.linejoin}
                  </Text>
                  {p.dasharray !== 'none' && (
                    <Text fontSize="9px" color="purple.400">
                      dashed
                    </Text>
                  )}
                </HStack>
              </Box>
            ))}
          </VStack>
        </>
      )}
    </Panel>
  );
};

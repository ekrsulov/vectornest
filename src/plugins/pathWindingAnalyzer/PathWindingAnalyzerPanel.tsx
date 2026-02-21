import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { PathWindingAnalyzerPluginSlice } from './slice';
import { analyzeWinding } from './windingUtils';
import type { CanvasElement } from '../../types';

type WStore = CanvasStore & PathWindingAnalyzerPluginSlice;

export const PathWindingAnalyzerPanel: React.FC = () => {
  const { state, update, selectedIds, elements, selectElements } = useCanvasStore(
    useShallow((s) => {
      const st = s as WStore;
      return {
        state: st.pathWindingAnalyzer,
        update: st.updatePathWindingAnalyzerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        selectElements: s.selectElements,
      };
    })
  );

  const handleAnalyze = useCallback(() => {
    if (!update) return;
    const target = selectedIds.length > 0
      ? elements.filter((el: CanvasElement) => selectedIds.includes(el.id))
      : elements;
    const results = analyzeWinding(target as CanvasElement[]);
    update({ results });
  }, [update, selectedIds, elements]);

  if (!state || !update) return null;

  const conflicts = state.results.filter((r) => r.hasConflict);

  return (
    <Panel title="Path Winding" isCollapsible defaultOpen={false}>
      <PanelStyledButton onClick={handleAnalyze}>
        Analyze Winding
      </PanelStyledButton>

      {state.results.length > 0 && (
        <>
          {conflicts.length > 0 && (
            <Box bg="orange.900" borderRadius="sm" px={2} py={1} mx={2}>
              <Text fontSize="xs" color="orange.700" _dark={{ color: 'orange.300' }}>
                {conflicts.length} path{conflicts.length > 1 ? 's' : ''} with mixed winding + nonzero fill
              </Text>
            </Box>
          )}

          <SectionHeader title={`Paths (${state.results.length})`} />
          <VStack gap={1} align="stretch" maxH="300px" overflowY="auto" px={2}>
            {state.results.map((r) => (
              <Box
                key={r.elementId}
                p={1.5}
                borderRadius="sm"
                bg="whiteAlpha.50"
                cursor="pointer"
                _hover={{ bg: 'whiteAlpha.100' }}
                onClick={() => selectElements([r.elementId])}
                borderLeft="3px solid"
                borderColor={r.hasConflict ? 'orange.400' : 'green.400'}
              >
                <HStack justify="space-between">
                  <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }} isTruncated maxW="100px">
                    {r.label}
                  </Text>
                  <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }} fontFamily="mono">
                    fill-rule: {r.fillRule}
                  </Text>
                </HStack>
                <HStack gap={1} mt={0.5} flexWrap="wrap">
                  {r.subPathWindings.map((sp) => (
                    <Box
                      key={sp.index}
                      px={1}
                      py={0.5}
                      borderRadius="sm"
                      bg={sp.direction === 'CW' ? 'blue.900' : 'purple.900'}
                    >
                      <Text fontSize="xs" color={sp.direction === 'CW' ? 'blue.300' : 'purple.300'}>
                        {sp.direction} ({sp.area})
                      </Text>
                    </Box>
                  ))}
                </HStack>
              </Box>
            ))}
          </VStack>
        </>
      )}
    </Panel>
  );
};

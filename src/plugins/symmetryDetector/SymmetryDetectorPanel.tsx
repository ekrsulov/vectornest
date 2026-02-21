import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { SymmetryDetectorPluginSlice } from './slice';
import { detectSymmetry } from './symmetryUtils';
import type { CanvasElement } from '../../types';

type SymStore = CanvasStore & SymmetryDetectorPluginSlice;

function SymBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'green.400' : value >= 40 ? 'orange.400' : 'red.400';
  return (
    <Box>
      <HStack justify="space-between">
        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>{label}</Text>
        <Text fontSize="xs" color={color}>{value}%</Text>
      </HStack>
      <Box h="4px" borderRadius="full" bg="whiteAlpha.100" overflow="hidden">
        <Box h="100%" w={`${value}%`} bg={color} borderRadius="full" />
      </Box>
    </Box>
  );
}

export const SymmetryDetectorPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as SymStore;
      return {
        state: st.symmetryDetector,
        update: st.updateSymmetryDetectorState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const handleDetect = useCallback(() => {
    if (!state || !update) return;
    const target = selectedIds.length > 0
      ? elements.filter((el: CanvasElement) => selectedIds.includes(el.id))
      : elements;
    const results = detectSymmetry(target, state.tolerance);
    const avgSymmetry = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.bestScore, 0) / results.length)
      : 0;
    update({ results, avgSymmetry });
  }, [state, update, selectedIds, elements]);

  if (!state || !update) return null;

  const axisLabels = { horizontal: 'H', vertical: 'V', rotational: 'R', none: '—' };
  const axisColors = { horizontal: 'blue.400', vertical: 'green.400', rotational: 'purple.400', none: 'gray.500' };

  return (
    <Panel title="Symmetry Detector" isCollapsible defaultOpen={false}>
      <SliderControl
        label="Tolerance"
        value={state.tolerance}
        min={1}
        max={30}
        step={1}
        onChange={(val) => update({ tolerance: val })}
        formatter={(v) => `${v}px`}
      />

      <PanelStyledButton onClick={handleDetect}>
        Detect Symmetry
      </PanelStyledButton>

      {state.results.length > 0 && (
        <>
          <SectionHeader title="Overview" />
          <HStack justify="space-between" px={2} py={1}>
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Average Symmetry</Text>
            <Text fontSize="sm" fontWeight="bold" color={state.avgSymmetry >= 60 ? 'green.400' : 'orange.400'}>
              {state.avgSymmetry}%
            </Text>
          </HStack>

          <SectionHeader title={`Elements (${state.results.length})`} />
          <VStack gap={1} align="stretch" maxH="300px" overflowY="auto" px={2}>
            {state.results.map((r) => (
              <Box
                key={r.elementId}
                p={2}
                bg="whiteAlpha.50"
                borderRadius="md"
                cursor="pointer"
                _hover={{ bg: 'whiteAlpha.100' }}
                onClick={() => useCanvasStore.getState().selectElements([r.elementId])}
              >
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }}>{r.elementId.slice(0, 12)}...</Text>
                  <HStack gap={1}>
                    <Box
                      px={1.5}
                      py={0.5}
                      borderRadius="sm"
                      bg={axisColors[r.bestAxis]}
                      fontSize="xs"
                      fontWeight="bold"
                      color="white"
                    >
                      {axisLabels[r.bestAxis]}
                    </Box>
                    <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>{r.bestScore}%</Text>
                  </HStack>
                </HStack>
                <VStack gap={0.5} align="stretch">
                  <SymBar label="Horizontal" value={r.horizontal} />
                  <SymBar label="Vertical" value={r.vertical} />
                  <SymBar label="Rotational 180°" value={r.rotational180} />
                </VStack>
              </Box>
            ))}
          </VStack>
        </>
      )}
    </Panel>
  );
};

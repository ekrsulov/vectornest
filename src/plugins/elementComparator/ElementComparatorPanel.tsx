import React, { useCallback, useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ElementComparatorPluginSlice, ComparisonDiff } from './slice';
import { compareElements } from './compareUtils';
import type { CanvasElement } from '../../types';

type CmpStore = CanvasStore & ElementComparatorPluginSlice;

const categoryColors = { geometry: 'blue.400', style: 'purple.400', structure: 'teal.400' };

export const ElementComparatorPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as CmpStore;
      return {
        state: st.elementComparator,
        update: st.updateElementComparatorState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const handleCompare = useCallback(() => {
    if (!state || !update || selectedIds.length < 2) return;
    const elA = elements.find((e: CanvasElement) => e.id === selectedIds[0]);
    const elB = elements.find((e: CanvasElement) => e.id === selectedIds[1]);
    if (!elA || !elB) return;
    const diffs = compareElements(elA, elB);
    const matching = diffs.filter((d) => !d.isDifferent).length;
    const matchPercent = diffs.length > 0 ? Math.round((matching / diffs.length) * 100) : 0;
    update({ diffs, idA: selectedIds[0], idB: selectedIds[1], matchPercent });
  }, [state, update, selectedIds, elements]);

  // Group diffs by category
  const grouped = useMemo(() => {
    if (!state) return new Map<string, ComparisonDiff[]>();
    const items = state.showOnlyDiffs ? state.diffs.filter((d) => d.isDifferent) : state.diffs;
    const map = new Map<string, ComparisonDiff[]>();
    for (const d of items) {
      const existing = map.get(d.category);
      if (existing) existing.push(d);
      else map.set(d.category, [d]);
    }
    return map;
  }, [state]);

  if (!state || !update) return null;

  const diffCount = state.diffs.filter((d) => d.isDifferent).length;

  return (
    <Panel title="Element Comparator" isCollapsible defaultOpen={false}>
      {selectedIds.length < 2 ? (
        <Box px={2} py={3} textAlign="center">
          <Text fontSize="xs" color="gray.500">Select exactly 2 elements to compare</Text>
        </Box>
      ) : (
        <>
          <PanelStyledButton onClick={handleCompare}>
            Compare Selected Elements
          </PanelStyledButton>

          {state.diffs.length > 0 && (
            <>
              <SectionHeader title="Summary" />
              <HStack justify="space-between" px={2} py={1}>
                <Text fontSize="xs" color="gray.400">Match Score</Text>
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color={state.matchPercent >= 80 ? 'green.400' : state.matchPercent >= 50 ? 'orange.400' : 'red.400'}
                >
                  {state.matchPercent}%
                </Text>
              </HStack>
              <HStack justify="space-between" px={2} py={1}>
                <Text fontSize="xs" color="gray.400">Differences</Text>
                <Text fontSize="xs" color={diffCount > 0 ? 'red.400' : 'green.400'} fontWeight="bold">
                  {diffCount}
                </Text>
              </HStack>

              <PanelToggle
                isChecked={state.showOnlyDiffs}
                onChange={(e) => update({ showOnlyDiffs: e.target.checked })}
              >
                Show Only Differences
              </PanelToggle>

              {/* Column headers */}
              <HStack px={2} py={1} justify="space-between">
                <Text fontSize="xs" color="gray.500" flex={1}>Property</Text>
                <Text fontSize="xs" color="blue.300" w="80px" textAlign="center">
                  A ({state.idA.slice(0, 6)})
                </Text>
                <Text fontSize="xs" color="green.300" w="80px" textAlign="center">
                  B ({state.idB.slice(0, 6)})
                </Text>
              </HStack>

              <VStack gap={1} align="stretch" maxH="300px" overflowY="auto" px={2}>
                {[...grouped.entries()].map(([cat, items]) => (
                  <Box key={cat}>
                    <Text fontSize="xs" fontWeight="bold" color={categoryColors[cat as keyof typeof categoryColors] || 'gray.400'} mb={1}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                    {items.map((d, i) => (
                      <HStack
                        key={i}
                        justify="space-between"
                        py={0.5}
                        px={1}
                        bg={d.isDifferent ? 'rgba(127, 29, 29, 0.15)' : 'transparent'}
                        borderRadius="sm"
                      >
                        <Text fontSize="xs" color="gray.400" flex={1}>{d.property}</Text>
                        <Text fontSize="xs" color={d.isDifferent ? 'red.300' : 'gray.300'} w="80px" textAlign="center" fontFamily="mono">
                          {d.valueA.length > 10 ? d.valueA.slice(0, 10) + '…' : d.valueA}
                        </Text>
                        <Text fontSize="xs" color={d.isDifferent ? 'red.300' : 'gray.300'} w="80px" textAlign="center" fontFamily="mono">
                          {d.valueB.length > 10 ? d.valueB.slice(0, 10) + '…' : d.valueB}
                        </Text>
                      </HStack>
                    ))}
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

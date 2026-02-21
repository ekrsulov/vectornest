import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { CustomSelect } from '../../ui/CustomSelect';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { PathComplexityScorerPluginSlice, PathComplexityResult } from './slice';
import { scorePathComplexity } from './complexityUtils';
import type { CanvasElement } from '../../types';

type PCStore = CanvasStore & PathComplexityScorerPluginSlice;

const GRADE_COLORS: Record<PathComplexityResult['grade'], string> = {
  simple: '#38A169',
  moderate: '#D69E2E',
  complex: '#DD6B20',
  'very-complex': '#E53E3E',
};

const sortOptions = [
  { value: 'score', label: 'Score' },
  { value: 'points', label: 'Points' },
  { value: 'curves', label: 'Curves' },
];

export const PathComplexityScorerPanel: React.FC = () => {
  const { state, update, selectedIds, elements, selectElements } = useCanvasStore(
    useShallow((s) => {
      const st = s as PCStore;
      return {
        state: st.pathComplexityScorer,
        update: st.updatePathComplexityScorerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        selectElements: s.selectElements,
      };
    })
  );

  const handleScore = useCallback(() => {
    if (!state || !update) return;
    const target = state.scopeAll
      ? elements
      : elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    const results = scorePathComplexity(target as CanvasElement[]);
    update({ results });
  }, [state, update, selectedIds, elements]);

  if (!state || !update) return null;

  const sorted = [...state.results].sort((a, b) => {
    const key = state.sortBy as keyof PathComplexityResult;
    return (b[key] as number) - (a[key] as number);
  });

  return (
    <Panel title="Complexity Scorer" isCollapsible defaultOpen={false}>
      <PanelToggle
        isChecked={state.scopeAll}
        onChange={(e) => update({ scopeAll: e.target.checked })}
      >
        All Elements
      </PanelToggle>

      <Box px={2} py={1}>
        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>Sort By</Text>
        <CustomSelect
          size="sm"
          placeholder="Sort"
          value={state.sortBy}
          onChange={(val) => update({ sortBy: val as PathComplexityScorerPluginSlice['pathComplexityScorer']['sortBy'] })}
          options={sortOptions}
        />
      </Box>

      <PanelStyledButton onClick={handleScore}>
        Score Complexity
      </PanelStyledButton>

      {sorted.length > 0 && (
        <>
          <SectionHeader title={`Results (${sorted.length})`} />
          <VStack gap={1} align="stretch" maxH="300px" overflowY="auto" px={2}>
            {sorted.map((r) => (
              <Box
                key={r.elementId}
                p={1.5}
                borderRadius="sm"
                bg="whiteAlpha.50"
                cursor="pointer"
                _hover={{ bg: 'whiteAlpha.100' }}
                onClick={() => selectElements([r.elementId])}
              >
                <HStack justify="space-between" mb={0.5}>
                  <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }} isTruncated maxW="120px">
                    {r.label}
                  </Text>
                  <HStack gap={1}>
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      color={GRADE_COLORS[r.grade]}
                    >
                      {r.score}
                    </Text>
                    <Text
                      fontSize="xs"
                      px={1}
                      borderRadius="sm"
                      bg={GRADE_COLORS[r.grade]}
                      color="white"
                    >
                      {r.grade}
                    </Text>
                  </HStack>
                </HStack>
                <Box h="3px" bg="whiteAlpha.100" borderRadius="full" overflow="hidden">
                  <Box
                    h="100%"
                    w={`${r.score}%`}
                    bg={GRADE_COLORS[r.grade]}
                    borderRadius="full"
                  />
                </Box>
                <HStack mt={0.5} gap={2}>
                  <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>pts:{r.points}</Text>
                  <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>crv:{r.curves}</Text>
                  <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>cusp:{r.cusps}</Text>
                  <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>sp:{r.subPaths}</Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </>
      )}
    </Panel>
  );
};

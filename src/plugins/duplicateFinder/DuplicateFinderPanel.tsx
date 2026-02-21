import React, { useCallback, useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { DuplicateFinderPluginSlice, DuplicateGroup } from './slice';
import { findDuplicates } from './duplicateUtils';
import type { CanvasElement } from '../../types';

type DupStore = CanvasStore & DuplicateFinderPluginSlice;

const matchTypeColors: Record<string, string> = {
  'exact-shape': 'red.400',
  'similar-shape': 'orange.400',
  'same-style': 'blue.400',
  'overlapping': 'purple.400',
};

const matchTypeLabels: Record<string, string> = {
  'exact-shape': 'Exact Shape Match',
  'similar-shape': 'Similar Shape',
  'same-style': 'Same Style',
  'overlapping': 'Overlapping',
};

export const DuplicateFinderPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as DupStore;
      return {
        state: st.duplicateFinder,
        update: st.updateDuplicateFinderState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const targetElements = useMemo(() => {
    if (!state) return [];
    if (state.scopeAll) return elements;
    return elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
  }, [state, selectedIds, elements]);

  const handleSearch = useCallback(() => {
    if (!state || !update) return;
    const groups = findDuplicates(targetElements, {
      shapeTolerance: state.shapeTolerance,
      positionTolerance: state.positionTolerance,
      checkShape: state.checkShape,
      checkStyle: state.checkStyle,
      checkOverlap: state.checkOverlap,
    });
    const totalDuplicates = groups.reduce((sum, g) => sum + g.elementIds.length - 1, 0);
    update({ groups, totalDuplicates });
  }, [state, update, targetElements]);

  const handleSelectGroup = useCallback((group: DuplicateGroup) => {
    const store = useCanvasStore.getState();
    store.selectElements(group.elementIds);
  }, []);

  // Group by match type
  const groupsByType = useMemo(() => {
    if (!state) return new Map<string, DuplicateGroup[]>();
    const map = new Map<string, DuplicateGroup[]>();
    for (const group of state.groups) {
      const existing = map.get(group.matchType);
      if (existing) {
        existing.push(group);
      } else {
        map.set(group.matchType, [group]);
      }
    }
    return map;
  }, [state]);

  if (!state || !update) return null;

  return (
    <Panel title="Duplicate Finder" isCollapsible defaultOpen={false}>
      <PanelToggle
        isChecked={state.scopeAll}
        onChange={(e) => update({ scopeAll: e.target.checked })}
      >
        Search All Elements
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkShape}
        onChange={(e) => update({ checkShape: e.target.checked })}
      >
        Find Shape Duplicates
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkStyle}
        onChange={(e) => update({ checkStyle: e.target.checked })}
      >
        Find Style Duplicates
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkOverlap}
        onChange={(e) => update({ checkOverlap: e.target.checked })}
      >
        Find Overlapping Duplicates
      </PanelToggle>

      <SliderControl
        label="Shape Tolerance"
        value={state.shapeTolerance}
        min={0}
        max={20}
        step={1}
        onChange={(val) => update({ shapeTolerance: val })}
        formatter={(v) => `${v}px`}
        stacked
      />

      <SliderControl
        label="Position Tolerance"
        value={state.positionTolerance}
        min={0}
        max={10}
        step={0.5}
        onChange={(val) => update({ positionTolerance: val })}
        formatter={(v) => `${v}px`}
        stacked
      />

      <PanelStyledButton onClick={handleSearch}>
        Search ({targetElements.length} elements)
      </PanelStyledButton>

      {state.groups.length > 0 && (
        <>
          <SectionHeader title="Results" />

          <HStack justify="space-between" px={2} py={1}>
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
              Duplicate Groups
            </Text>
            <Text fontSize="xs" color="orange.700" _dark={{ color: 'orange.300' }} fontWeight="bold">
              {state.groups.length}
            </Text>
          </HStack>

          <HStack justify="space-between" px={2} py={1}>
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
              Total Duplicates
            </Text>
            <Text fontSize="xs" color="red.300" fontWeight="bold">
              {state.totalDuplicates}
            </Text>
          </HStack>

          <VStack gap={1} align="stretch" maxH="300px" overflowY="auto" px={2}>
            {[...groupsByType.entries()].map(([matchType, groups]) => (
              <Box key={matchType}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color={matchTypeColors[matchType] || 'gray.400'}
                  mb={1}
                >
                  {matchTypeLabels[matchType] || matchType} ({groups.length})
                </Text>

                {groups.map((group, gi) => (
                  <Box
                    key={gi}
                    p={2}
                    mb={1}
                    bg="whiteAlpha.50"
                    borderRadius="md"
                    borderLeft="3px solid"
                    borderColor={matchTypeColors[group.matchType] || 'gray.400'}
                    cursor="pointer"
                    _hover={{ bg: 'whiteAlpha.100' }}
                    onClick={() => handleSelectGroup(group)}
                  >
                    <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }}>
                      {group.description}
                    </Text>
                    <HStack justify="space-between" mt={1}>
                      <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>
                        {group.elementIds.length} elements
                      </Text>
                      <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>
                        {group.similarity}% match
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </Box>
            ))}
          </VStack>
        </>
      )}

      {state.groups.length === 0 && state.totalDuplicates === 0 && (
        <Box px={2} py={3} textAlign="center">
          <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }}>
            Click Search to find duplicates
          </Text>
        </Box>
      )}
    </Panel>
  );
};

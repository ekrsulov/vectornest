import React, { useEffect, useMemo } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatRow } from '../../ui/StatRow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { SelectionStatisticsPluginSlice } from './slice';
import { computeSelectionStats } from './selStatsUtils';
import type { CanvasElement } from '../../types';

type SSStore = CanvasStore & SelectionStatisticsPluginSlice;

export const SelectionStatisticsPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as SSStore;
      return {
        state: st.selectionStatistics,
        update: st.updateSelectionStatisticsState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const selectedElements = useMemo(() =>
    elements.filter((el: CanvasElement) => selectedIds.includes(el.id)),
    [elements, selectedIds]
  );

  useEffect(() => {
    if (!state?.autoUpdate || !update) return;
    if (selectedElements.length === 0) {
      update({ stats: null });
      return;
    }
    const stats = computeSelectionStats(selectedElements);
    update({ stats });
  }, [selectedElements, state?.autoUpdate, update]);

  if (!state || !update) return null;

  const s = state.stats;

  return (
    <Panel title="Selection Stats" isCollapsible defaultOpen={false}>
      <PanelToggle
        isChecked={state.autoUpdate}
        onChange={(e) => update({ autoUpdate: e.target.checked })}
      >
        Auto-update
      </PanelToggle>

      {selectedIds.length === 0 && (
        <Box px={2} py={3}>
          <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }} textAlign="center">
            Select elements to see statistics
          </Text>
        </Box>
      )}

      {s && (
        <>
          <SectionHeader title="Composition" />
          <StatRow label="Total Elements" value={s.count} color="blue.600" darkColor="blue.300" />
          <StatRow label="Paths" value={s.pathCount} />
          <StatRow label="Groups" value={s.groupCount} />
          {s.otherCount > 0 && <StatRow label="Other" value={s.otherCount} />}
          <StatRow label="Closed Paths" value={s.closedPaths} />
          <StatRow label="Open Paths" value={s.openPaths} />

          <SectionHeader title="Dimensions" />
          <StatRow label="Total Area" value={`${s.totalArea.toLocaleString()} px²`} />
          <StatRow label="Total Perimeter" value={`${s.totalPerimeter.toLocaleString()} px`} />
          <StatRow label="Avg Width" value={`${s.avgWidth} px`} />
          <StatRow label="Avg Height" value={`${s.avgHeight} px`} />
          <HStack px={2} py={0.5} justify="space-between">
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Width Range</Text>
            <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
              {s.minWidth} – {s.maxWidth} px
            </Text>
          </HStack>
          <HStack px={2} py={0.5} justify="space-between">
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Height Range</Text>
            <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
              {s.minHeight} – {s.maxHeight} px
            </Text>
          </HStack>

          <SectionHeader title="Complexity" />
          <StatRow label="Total Points" value={s.totalPoints} />
          <StatRow label="Total Segments" value={s.totalSegments} />
          <StatRow
            label="Avg Points/Path"
            value={s.pathCount > 0 ? Math.round(s.totalPoints / s.pathCount * 10) / 10 : '—'}
          />
        </>
      )}
    </Panel>
  );
};

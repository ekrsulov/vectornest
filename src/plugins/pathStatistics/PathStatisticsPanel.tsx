import React, { useCallback } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { PathStatisticsPluginSlice } from './slice';
import { computePathStats } from './statsUtils';
import type { CanvasElement } from '../../types';

type StatsStore = CanvasStore & PathStatisticsPluginSlice;

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <HStack justify="space-between" px={2} py={0.5}>
      <Text fontSize="xs" color="gray.400">{label}</Text>
      <Text fontSize="xs" color={color || 'gray.300'} fontFamily="mono">{value}</Text>
    </HStack>
  );
}

export const PathStatisticsPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as StatsStore;
      return {
        state: st.pathStatistics,
        update: st.updatePathStatisticsState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const handleAnalyze = useCallback(() => {
    if (!state || !update) return;
    const target = state.scopeAll
      ? elements
      : elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    const stats = computePathStats(target);
    update({ stats });
  }, [state, update, selectedIds, elements]);

  if (!state || !update) return null;

  const s = state.stats;
  const effColor = s ? (s.efficiencyScore >= 70 ? 'green.400' : s.efficiencyScore >= 40 ? 'orange.400' : 'red.400') : 'gray.400';

  return (
    <Panel title="Path Statistics" isCollapsible defaultOpen={false}>
      <PanelToggle
        isChecked={state.scopeAll}
        onChange={(e) => update({ scopeAll: e.target.checked })}
      >
        All Elements
      </PanelToggle>

      <PanelStyledButton onClick={handleAnalyze}>
        Compute Statistics
      </PanelStyledButton>

      {s && (
        <>
          <SectionHeader title="Overview" />
          <StatRow label="Total Paths" value={s.totalPaths} />
          <StatRow label="Total Sub-Paths" value={s.totalSubPaths} />
          <StatRow label="Total Points" value={s.totalPoints} />
          <StatRow label="Total Segments" value={s.totalSegments} />

          <SectionHeader title="Segment Types" />
          <StatRow label="Line Segments" value={s.lineSegments} />
          <StatRow label="Curve Segments" value={s.curveSegments} />
          <StatRow label="Close Commands" value={s.closeCommands} />
          <StatRow label="Curve Ratio" value={`${s.curveRatio}%`} />

          {/* Visual curve/line bar */}
          <Box px={2} py={1}>
            <HStack h="8px" borderRadius="full" overflow="hidden" bg="whiteAlpha.100">
              <Box h="100%" w={`${s.curveRatio}%`} bg="purple.400" />
              <Box h="100%" flex={1} bg="blue.400" />
            </HStack>
            <HStack justify="space-between" mt={0.5}>
              <Text fontSize="xs" color="purple.400">Curves</Text>
              <Text fontSize="xs" color="blue.400">Lines</Text>
            </HStack>
          </Box>

          <SectionHeader title="Length" />
          <StatRow label="Total Path Length" value={`${s.totalPathLength}px`} />
          <StatRow label="Average Length" value={`${s.avgPathLength}px`} />
          <StatRow label="Shortest" value={`${s.shortestPath}px`} />
          <StatRow label="Longest" value={`${s.longestPath}px`} />

          <SectionHeader title="Metrics" />
          <StatRow label="Avg Points/Path" value={s.avgPointsPerPath} />
          <StatRow label="Avg Segments/Path" value={s.avgSegmentsPerPath} />
          <StatRow label="Node Density" value={`${s.nodeDensity}/100px`} />

          <HStack justify="space-between" px={2} py={1}>
            <Text fontSize="xs" color="gray.400">Efficiency Score</Text>
            <Text fontSize="sm" fontWeight="bold" color={effColor}>{s.efficiencyScore}%</Text>
          </HStack>
          <Box px={2} py={1}>
            <Box h="6px" borderRadius="full" bg="whiteAlpha.100" overflow="hidden">
              <Box h="100%" w={`${s.efficiencyScore}%`} bg={effColor} borderRadius="full" />
            </Box>
          </Box>
        </>
      )}
    </Panel>
  );
};

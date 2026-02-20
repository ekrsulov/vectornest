import React, { useMemo } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { PathAnatomyPluginSlice } from './slice';
import { analyzePathAnatomy } from './anatomyUtils';
import type { CanvasElement } from '../../types';

type AnatomyStore = CanvasStore & PathAnatomyPluginSlice;

const MetricRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <HStack justify="space-between" px={2} py={0.5}>
    <Text fontSize="xs" color="gray.400">{label}</Text>
    <Text fontSize="xs" fontWeight="bold" color="gray.200" fontFamily="mono">{value}</Text>
  </HStack>
);

export const PathAnatomyPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as AnatomyStore;
      return {
        state: st.pathAnatomy,
        update: st.updatePathAnatomyState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const metrics = useMemo(() => {
    if (!state?.enabled || selectedIds.length === 0) return null;
    const selected = elements.filter(
      (el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path'
    );
    if (selected.length === 0) return null;

    // Merge metrics across all selected paths
    const allMetrics = selected.map((el: CanvasElement) => {
      if (el.type !== 'path') return null;
      return analyzePathAnatomy(el.data.subPaths);
    }).filter(Boolean);

    if (allMetrics.length === 0) return null;
    if (allMetrics.length === 1) return allMetrics[0]!;

    // Aggregate
    return allMetrics.reduce((acc, m) => ({
      totalLength: acc!.totalLength + m!.totalLength,
      nodeCount: acc!.nodeCount + m!.nodeCount,
      subPathCount: acc!.subPathCount + m!.subPathCount,
      lineSegments: acc!.lineSegments + m!.lineSegments,
      curveSegments: acc!.curveSegments + m!.curveSegments,
      moveCommands: acc!.moveCommands + m!.moveCommands,
      closeCommands: acc!.closeCommands + m!.closeCommands,
      estimatedArea: acc!.estimatedArea + m!.estimatedArea,
      boundingBox: null,
    }));
  }, [state?.enabled, selectedIds, elements]);

  if (!state || !update) return null;

  return (
    <Panel
      title="Path Anatomy"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle path anatomy"
        />
      }
    >
      {state.enabled && (
        <>
          <PanelToggle
            isChecked={state.highlightSegments}
            onChange={(e) => update({ highlightSegments: e.target.checked })}
          >
            Highlight Segment Types
          </PanelToggle>

          <PanelToggle
            isChecked={state.showNodeTypes}
            onChange={(e) => update({ showNodeTypes: e.target.checked })}
          >
            Show Node Markers
          </PanelToggle>

          <PanelToggle
            isChecked={state.showLengths}
            onChange={(e) => update({ showLengths: e.target.checked })}
          >
            Show Segment Lengths
          </PanelToggle>

          {metrics && (
            <>
              <SectionHeader title="Metrics" />
              <Box bg="whiteAlpha.50" borderRadius="md" py={1} mb={1}>
                <MetricRow label="Total Length" value={`${metrics.totalLength.toFixed(1)} px`} />
                <MetricRow label="Nodes" value={metrics.nodeCount} />
                <MetricRow label="Sub-paths" value={metrics.subPathCount} />
                <MetricRow label="Line Segments" value={metrics.lineSegments} />
                <MetricRow label="Curve Segments" value={metrics.curveSegments} />
                <MetricRow label="Close Commands" value={metrics.closeCommands} />
                <MetricRow label="Est. Area" value={`${metrics.estimatedArea.toFixed(0)} px²`} />
                {metrics.boundingBox && (
                  <>
                    <MetricRow
                      label="Bounding Box"
                      value={`${(metrics.boundingBox.maxX - metrics.boundingBox.minX).toFixed(0)} × ${(metrics.boundingBox.maxY - metrics.boundingBox.minY).toFixed(0)}`}
                    />
                  </>
                )}
              </Box>

              <SectionHeader title="Segment Breakdown" />
              <HStack gap={2} px={2} pb={1}>
                <Box flex={1} textAlign="center">
                  <Box w={3} h={3} bg={state.lineColor} borderRadius="sm" mx="auto" mb={0.5} />
                  <Text fontSize="2xs" color="gray.400">Lines</Text>
                  <Text fontSize="xs" fontWeight="bold">{metrics.lineSegments}</Text>
                </Box>
                <Box flex={1} textAlign="center">
                  <Box w={3} h={3} bg={state.curveColor} borderRadius="full" mx="auto" mb={0.5} />
                  <Text fontSize="2xs" color="gray.400">Curves</Text>
                  <Text fontSize="xs" fontWeight="bold">{metrics.curveSegments}</Text>
                </Box>
                <Box flex={1} textAlign="center">
                  <Box w={3} h={3} bg={state.moveColor} borderRadius="full" mx="auto" mb={0.5} />
                  <Text fontSize="2xs" color="gray.400">Moves</Text>
                  <Text fontSize="xs" fontWeight="bold">{metrics.moveCommands}</Text>
                </Box>
              </HStack>
            </>
          )}

          {!metrics && selectedIds.length === 0 && (
            <Text fontSize="xs" color="gray.500" px={2} py={2}>
              Select a path element to analyze
            </Text>
          )}
        </>
      )}
    </Panel>
  );
};

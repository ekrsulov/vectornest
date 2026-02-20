import React, { useCallback, useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { CustomSelect } from '../../ui/CustomSelect';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { SvgSizeAnalyzerPluginSlice, SizeSortMode } from './slice';
import { analyzeElementSizes, formatBytes, getComplexityColor } from './sizeUtils';
import type { CanvasElement } from '../../types';

type SizeStore = CanvasStore & SvgSizeAnalyzerPluginSlice;

const sortOptions = [
  { label: 'By Size (largest first)', value: 'size' },
  { label: 'By Point Count', value: 'points' },
  { label: 'By Complexity', value: 'complexity' },
];

const complexityOrder = { 'very-high': 0, 'high': 1, 'medium': 2, 'low': 3 };

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <HStack justify="space-between" px={2} py={0.5}>
    <Text fontSize="xs" color="gray.400">{label}</Text>
    <Text fontSize="xs" fontWeight="bold" fontFamily="mono" color={color ?? 'gray.200'}>{value}</Text>
  </HStack>
);

export const SvgSizeAnalyzerPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as SizeStore;
      return {
        state: st.svgSizeAnalyzer,
        update: st.updateSvgSizeAnalyzerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const targetElements = useMemo(() => {
    if (!state) return [];
    if (state.scopeSelection) {
      return elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    }
    return elements;
  }, [state, selectedIds, elements]);

  const handleAnalyze = useCallback(() => {
    if (!state || !update) return;

    const weights = analyzeElementSizes(targetElements);

    // Sort
    switch (state.sortMode) {
      case 'size':
        weights.sort((a, b) => b.estimatedBytes - a.estimatedBytes);
        break;
      case 'points':
        weights.sort((a, b) => b.points - a.points);
        break;
      case 'complexity':
        weights.sort((a, b) =>
          (complexityOrder[a.complexity] ?? 4) - (complexityOrder[b.complexity] ?? 4)
        );
        break;
    }

    const totalBytes = weights.reduce((s, w) => s + w.estimatedBytes, 0);
    const totalPoints = weights.reduce((s, w) => s + w.points, 0);

    update({
      weights,
      totalBytes,
      totalPoints,
      totalElements: weights.length,
    });
  }, [state, update, targetElements]);

  const sortedWeights = useMemo(() => {
    if (!state) return [];
    const sorted = [...state.weights];
    switch (state.sortMode) {
      case 'size':
        sorted.sort((a, b) => b.estimatedBytes - a.estimatedBytes);
        break;
      case 'points':
        sorted.sort((a, b) => b.points - a.points);
        break;
      case 'complexity':
        sorted.sort((a, b) =>
          (complexityOrder[a.complexity] ?? 4) - (complexityOrder[b.complexity] ?? 4)
        );
        break;
    }
    return sorted;
  }, [state]);

  if (!state || !update) return null;

  return (
    <Panel title="SVG Size Analyzer" isCollapsible defaultOpen={false}>
      <PanelToggle
        isChecked={state.scopeSelection}
        onChange={(e) => update({ scopeSelection: e.target.checked })}
      >
        Selection Only
      </PanelToggle>

      <CustomSelect
        size="sm"
        placeholder="Sort By"
        value={state.sortMode}
        onChange={(val) => update({ sortMode: val as SizeSortMode })}
        options={sortOptions}
      />

      <PanelStyledButton
        onClick={handleAnalyze}
        isDisabled={targetElements.length === 0}
        size="sm"
        width="full"
      >
        Analyze ({targetElements.length} elements)
      </PanelStyledButton>

      {state.totalBytes > 0 && (
        <>
          <SectionHeader title="Summary" />
          <Box bg="whiteAlpha.50" borderRadius="md" py={1} mb={1}>
            <StatRow label="Total Elements" value={String(state.totalElements)} />
            <StatRow label="Total Points" value={String(state.totalPoints)} />
            <StatRow label="Estimated Size" value={formatBytes(state.totalBytes)} />
            <StatRow
              label="Avg per Element"
              value={formatBytes(Math.round(state.totalBytes / Math.max(1, state.totalElements)))}
            />
          </Box>

          {/* Complexity distribution */}
          <SectionHeader title="Complexity Breakdown" />
          <HStack gap={1} px={2} mb={1}>
            {(['low', 'medium', 'high', 'very-high'] as const).map((level) => {
              const count = sortedWeights.filter((w) => w.complexity === level).length;
              return (
                <Box key={level} flex={1} textAlign="center">
                  <Box
                    w="full"
                    h={1.5}
                    borderRadius="full"
                    bg={getComplexityColor(level)}
                    opacity={count > 0 ? 1 : 0.2}
                    mb={0.5}
                  />
                  <Text fontSize="2xs" color="gray.400">{level}</Text>
                  <Text fontSize="2xs" fontWeight="bold" color="gray.300">{count}</Text>
                </Box>
              );
            })}
          </HStack>

          {/* Element list */}
          <SectionHeader title="Elements by Weight" />
          <VStack gap={0} align="stretch" px={1} maxH="250px" overflowY="auto">
            {sortedWeights.slice(0, 50).map((w, i) => (
              <HStack
                key={w.id}
                py={0.5}
                px={1}
                borderRadius="sm"
                _hover={{ bg: 'whiteAlpha.50' }}
              >
                <Text fontSize="2xs" color="gray.500" w={4} textAlign="right">{i + 1}.</Text>
                <Box
                  w={2}
                  h={2}
                  borderRadius="full"
                  bg={getComplexityColor(w.complexity)}
                  flexShrink={0}
                />
                <Text fontSize="2xs" color="gray.300" flex={1} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {w.type}
                </Text>
                <Text fontSize="2xs" color="gray.500">{w.points}pts</Text>
                <Text fontSize="2xs" fontFamily="mono" fontWeight="bold" color="gray.200">
                  {formatBytes(w.estimatedBytes)}
                </Text>
                {/* Bar representing percentage */}
                <Box w="40px" h={1.5} bg="whiteAlpha.100" borderRadius="full" overflow="hidden">
                  <Box
                    h="full"
                    w={`${Math.min(100, w.percentOfTotal)}%`}
                    bg={getComplexityColor(w.complexity)}
                    borderRadius="full"
                  />
                </Box>
              </HStack>
            ))}
            {sortedWeights.length > 50 && (
              <Text fontSize="2xs" color="gray.500" px={1}>
                +{sortedWeights.length - 50} more elements
              </Text>
            )}
          </VStack>
        </>
      )}

      {state.totalBytes === 0 && targetElements.length === 0 && (
        <Text fontSize="xs" color="gray.500" px={2} py={2}>
          No elements to analyze
        </Text>
      )}
    </Panel>
  );
};

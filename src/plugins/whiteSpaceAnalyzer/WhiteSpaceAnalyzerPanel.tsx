import React, { useCallback } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { WhiteSpaceAnalyzerPluginSlice } from './slice';
import { analyzeWhiteSpace } from './whiteSpaceUtils';
import type { CanvasElement } from '../../types';

type WSStore = CanvasStore & WhiteSpaceAnalyzerPluginSlice;

function MetricRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <HStack justify="space-between" px={2} py={0.5}>
      <Text fontSize="xs" color="gray.400">{label}</Text>
      <Text fontSize="xs" color={color || 'gray.300'} fontFamily="mono">{value}</Text>
    </HStack>
  );
}

function BalanceBar({ label, value }: { label: string; value: number }) {
  const offset = value - 50;
  const barColor = Math.abs(offset) < 5 ? 'green.400' : Math.abs(offset) < 15 ? 'orange.400' : 'red.400';
  return (
    <Box px={2} py={1}>
      <HStack justify="space-between" mb={0.5}>
        <Text fontSize="xs" color="gray.400">{label}</Text>
        <Text fontSize="xs" fontFamily="mono" color={barColor}>{value}%</Text>
      </HStack>
      <Box position="relative" h="8px" bg="whiteAlpha.100" borderRadius="full" overflow="hidden">
        {/* Center marker */}
        <Box position="absolute" left="50%" top={0} bottom={0} w="1px" bg="whiteAlpha.300" zIndex={1} />
        {/* Balance indicator */}
        <Box
          position="absolute"
          left={offset >= 0 ? '50%' : `${value}%`}
          w={`${Math.abs(offset)}%`}
          h="100%"
          bg={barColor}
          borderRadius="full"
        />
      </Box>
    </Box>
  );
}

export const WhiteSpaceAnalyzerPanel: React.FC = () => {
  const { state, update, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as WSStore;
      return {
        state: st.whiteSpaceAnalyzer,
        update: st.updateWhiteSpaceAnalyzerState,
        elements: s.elements,
      };
    })
  );

  const handleAnalyze = useCallback(() => {
    if (!state || !update) return;
    const metrics = analyzeWhiteSpace(
      elements as CanvasElement[],
      state.canvasWidth,
      state.canvasHeight,
      state.autoDetectBounds
    );
    update({ metrics });
  }, [state, update, elements]);

  if (!state || !update) return null;

  const m = state.metrics;
  const utilColor = m ? (m.utilization > 60 ? 'orange.400' : m.utilization > 30 ? 'green.400' : 'blue.400') : 'gray.400';

  return (
    <Panel title="White Space" isCollapsible defaultOpen={false}>
      <PanelToggle
        isChecked={state.autoDetectBounds}
        onChange={(e) => update({ autoDetectBounds: e.target.checked })}
      >
        Auto-detect Bounds
      </PanelToggle>

      {!state.autoDetectBounds && (
        <>
          <SliderControl
            label="Canvas Width"
            value={state.canvasWidth}
            min={100}
            max={4000}
            step={50}
            onChange={(v) => update({ canvasWidth: v })}
            formatter={(v) => `${v}px`}
          />
          <SliderControl
            label="Canvas Height"
            value={state.canvasHeight}
            min={100}
            max={4000}
            step={50}
            onChange={(v) => update({ canvasHeight: v })}
            formatter={(v) => `${v}px`}
          />
        </>
      )}

      <PanelStyledButton onClick={handleAnalyze}>
        Analyze White Space
      </PanelStyledButton>

      {m && (
        <>
          <SectionHeader title="Area Distribution" />
          <MetricRow label="Canvas Area" value={`${m.canvasArea.toLocaleString()} px²`} />
          <MetricRow label="Elements Area" value={`${m.elementsArea.toLocaleString()} px²`} />
          <MetricRow label="White Space" value={`${m.whiteSpaceArea.toLocaleString()} px²`} />

          {/* Visual distribution bar */}
          <Box px={2} py={1}>
            <HStack h="12px" borderRadius="full" overflow="hidden" bg="whiteAlpha.100">
              <Box h="100%" w={`${m.utilization}%`} bg="teal.400" />
              <Box h="100%" flex={1} bg="whiteAlpha.200" />
            </HStack>
            <HStack justify="space-between" mt={0.5}>
              <Text fontSize="xs" color="teal.400">Filled {m.utilization}%</Text>
              <Text fontSize="xs" color="gray.400">Empty {m.whiteSpacePercent}%</Text>
            </HStack>
          </Box>

          <SectionHeader title="Metrics" />
          <MetricRow label="Utilization" value={`${m.utilization}%`} color={utilColor} />
          <MetricRow label="Density" value={`${m.density} el/10k px²`} />

          <SectionHeader title="Balance" />
          <BalanceBar label="Horizontal" value={m.balanceH} />
          <BalanceBar label="Vertical" value={m.balanceV} />
          <Box px={2} py={1}>
            <Text fontSize="xs" color="gray.500" fontStyle="italic">
              50% = perfectly centered
            </Text>
          </Box>
        </>
      )}
    </Panel>
  );
};

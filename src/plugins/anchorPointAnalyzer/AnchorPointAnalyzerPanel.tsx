import React, { useCallback } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatRow } from '../../ui/StatRow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { AnchorPointAnalyzerPluginSlice } from './slice';
import { analyzeAnchorPoints } from './anchorUtils';
import type { CanvasElement } from '../../types';

type APStore = CanvasStore & AnchorPointAnalyzerPluginSlice;

function TypeBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <Box px={2} py={0.5}>
      <HStack justify="space-between" mb={0.5}>
        <Text fontSize="xs" color={color}>{label}</Text>
        <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">{count} ({Math.round(pct)}%)</Text>
      </HStack>
      <Box h="4px" bg="whiteAlpha.100" borderRadius="full" overflow="hidden">
        <Box h="100%" w={`${pct}%`} bg={color} borderRadius="full" />
      </Box>
    </Box>
  );
}

export const AnchorPointAnalyzerPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as APStore;
      return {
        state: st.anchorPointAnalyzer,
        update: st.updateAnchorPointAnalyzerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const handleAnalyze = useCallback(() => {
    if (!state || !update) return;
    const target = selectedIds.length > 0
      ? elements.filter((el: CanvasElement) => selectedIds.includes(el.id))
      : elements;
    const analysis = analyzeAnchorPoints(
      target as CanvasElement[],
      state.smoothThreshold,
      state.shortHandleThreshold,
      state.longHandleMultiplier
    );
    update({ analysis });
  }, [state, update, selectedIds, elements]);

  if (!state || !update) return null;

  const a = state.analysis;

  return (
    <Panel title="Anchor Points" isCollapsible defaultOpen={false}>
      <SliderControl
        label="Smooth Threshold"
        value={state.smoothThreshold}
        min={1}
        max={45}
        step={1}
        onChange={(v) => update({ smoothThreshold: v })}
        formatter={(v) => `${v}°`}
      />
      <SliderControl
        label="Short Handle Threshold"
        value={state.shortHandleThreshold}
        min={0.5}
        max={10}
        step={0.5}
        onChange={(v) => update({ shortHandleThreshold: v })}
        formatter={(v) => `${v}px`}
        stacked
      />

      <PanelStyledButton onClick={handleAnalyze}>
        Analyze Anchors
      </PanelStyledButton>

      {a && (
        <>
          <SectionHeader title="Overview" />
          <StatRow label="Total Anchors" value={a.totalAnchors} color="blue.600" darkColor="blue.300" />

          <SectionHeader title="Anchor Types" />
          <TypeBar label="Smooth" count={a.smoothCount} total={a.totalAnchors} color="#38A169" />
          <TypeBar label="Corner" count={a.cornerCount} total={a.totalAnchors} color="#D69E2E" />
          <TypeBar label="Cusp" count={a.cuspCount} total={a.totalAnchors} color="#E53E3E" />
          <TypeBar label="Endpoint" count={a.endpointCount} total={a.totalAnchors} color="#805AD5" />

          <SectionHeader title="Handle Quality" />
          <StatRow label="Avg Handle Length" value={`${a.avgHandleLength} px`} />
          <StatRow 
            label="Short Handles" 
            value={a.shortHandles} 
            color={a.shortHandles > 0 ? 'orange.400' : 'green.400'} 
          />
          <StatRow 
            label="Long Handles" 
            value={a.longHandles} 
            color={a.longHandles > 0 ? 'orange.400' : 'green.400'} 
          />

          {(a.shortHandles > 0 || a.longHandles > 0) && (
            <Box px={2} py={1}>
              <Text fontSize="xs" color="orange.400" fontStyle="italic">
                {a.shortHandles > 0 && `${a.shortHandles} very short handle(s) may cause rendering artifacts. `}
                {a.longHandles > 0 && `${a.longHandles} very long handle(s) may cause unexpected curves.`}
              </Text>
            </Box>
          )}

          {a.cuspCount > 0 && (
            <Box px={2} py={1}>
              <Text fontSize="xs" color="red.400" fontStyle="italic">
                {a.cuspCount} cusp point(s) detected — handles pointing in similar directions.
              </Text>
            </Box>
          )}
        </>
      )}
    </Panel>
  );
};

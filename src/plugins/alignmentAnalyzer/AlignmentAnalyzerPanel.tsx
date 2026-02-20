import React, { useCallback, useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { SliderControl } from '../../ui/SliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { AlignmentAnalyzerPluginSlice, AlignmentIssue } from './slice';
import { analyzeAlignments } from './alignmentUtils';
import type { CanvasElement } from '../../types';

type AnalyzerStore = CanvasStore & AlignmentAnalyzerPluginSlice;

const issueColor: Record<string, string> = {
  'near-align-h': '#E53E3E',
  'near-align-v': '#DD6B20',
  'near-same-width': '#805AD5',
  'near-same-height': '#3182CE',
  'near-equal-gap': '#D69E2E',
};

const issueLabel: Record<string, string> = {
  'near-align-h': '↔ H-Align',
  'near-align-v': '↕ V-Align',
  'near-same-width': '⇔ Width',
  'near-same-height': '⇕ Height',
  'near-equal-gap': '⇄ Gap',
};

export const AlignmentAnalyzerPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as AnalyzerStore;
      return {
        state: st.alignmentAnalyzer,
        update: st.updateAlignmentAnalyzerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const selectedEls = useMemo(() => {
    return elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
  }, [selectedIds, elements]);

  const handleAnalyze = useCallback(() => {
    if (!state || !update || selectedEls.length < 2) return;
    const result = analyzeAlignments(selectedEls, state.tolerance);
    update({ issues: result.issues });
  }, [state, update, selectedEls]);

  // Group issues by type
  const issueGroups = useMemo(() => {
    if (!state) return new Map<string, AlignmentIssue[]>();
    const groups = new Map<string, AlignmentIssue[]>();
    for (const issue of state.issues) {
      const existing = groups.get(issue.type);
      if (existing) {
        existing.push(issue);
      } else {
        groups.set(issue.type, [issue]);
      }
    }
    return groups;
  }, [state]);

  if (!state || !update) return null;

  return (
    <Panel
      title="Alignment Analyzer"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle alignment analyzer"
        />
      }
    >
      {state.enabled && (
        <>
          <SliderControl
            label="Tolerance"
            value={state.tolerance}
            min={0.5}
            max={10}
            step={0.5}
            onChange={(val) => update({ tolerance: val })}
            formatter={(v) => `${v} px`}
          />

          <PanelToggle
            isChecked={state.showNearMisses}
            onChange={(e) => update({ showNearMisses: e.target.checked })}
          >
            Show Near-Miss Lines (red)
          </PanelToggle>

          <PanelToggle
            isChecked={state.showPerfectAligns}
            onChange={(e) => update({ showPerfectAligns: e.target.checked })}
          >
            Show Perfect Alignments (green)
          </PanelToggle>

          <PanelStyledButton
            onClick={handleAnalyze}
            isDisabled={selectedEls.length < 2}
            size="sm"
            width="full"
          >
            Analyze ({selectedIds.length} elements)
          </PanelStyledButton>

          {state.issues.length > 0 && (
            <>
              <SectionHeader title={`Issues (${state.issues.length})`} />

              {/* Summary by type */}
              <HStack gap={1} px={2} mb={1} flexWrap="wrap">
                {Array.from(issueGroups.entries()).map(([type, items]) => (
                  <Box
                    key={type}
                    px={1.5}
                    py={0.5}
                    borderRadius="sm"
                    bg="whiteAlpha.100"
                    border="1px solid"
                    borderColor={issueColor[type] ?? 'gray.500'}
                  >
                    <Text fontSize="2xs" color={issueColor[type] ?? 'gray.400'}>
                      {issueLabel[type] ?? type}: {items.length}
                    </Text>
                  </Box>
                ))}
              </HStack>

              <VStack gap={0} align="stretch" px={1} maxH="200px" overflowY="auto">
                {state.issues.slice(0, 30).map((issue, i) => (
                  <HStack
                    key={i}
                    py={0.5}
                    px={1}
                    borderRadius="sm"
                    _hover={{ bg: 'whiteAlpha.50' }}
                  >
                    <Box w={2} h={2} borderRadius="full" bg={issueColor[issue.type] ?? 'gray.500'} flexShrink={0} />
                    <Text fontSize="2xs" color="gray.300" flex={1}>{issue.description}</Text>
                    <Text fontSize="2xs" fontFamily="mono" color="orange.300">{issue.offset.toFixed(1)}px</Text>
                  </HStack>
                ))}
                {state.issues.length > 30 && (
                  <Text fontSize="2xs" color="gray.500" px={1}>
                    +{state.issues.length - 30} more issues
                  </Text>
                )}
              </VStack>
            </>
          )}

          {state.issues.length === 0 && selectedIds.length >= 2 && (
            <Text fontSize="xs" color="green.300" px={2} py={1}>
              No near-miss alignment issues detected
            </Text>
          )}

          {selectedIds.length < 2 && (
            <Text fontSize="xs" color="gray.500" px={2} py={2}>
              Select at least 2 elements to analyze alignment
            </Text>
          )}
        </>
      )}
    </Panel>
  );
};

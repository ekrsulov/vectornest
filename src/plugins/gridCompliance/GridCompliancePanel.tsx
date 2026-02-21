import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { GridCompliancePluginSlice } from './slice';
import { analyzeGridCompliance } from './complianceUtils';
import type { CanvasElement } from '../../types';

type ComplianceStore = CanvasStore & GridCompliancePluginSlice;

export const GridCompliancePanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as ComplianceStore;
      return {
        state: st.gridCompliance,
        update: st.updateGridComplianceState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const targetElements = React.useMemo(() => {
    if (selectedIds.length > 0) {
      return elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    }
    return elements;
  }, [selectedIds, elements]);

  const handleAnalyze = useCallback(() => {
    if (!state || !update) return;
    const result = analyzeGridCompliance(targetElements, {
      gridSize: state.gridSize,
      tolerance: state.tolerance,
      checkPositions: state.checkPositions,
      checkDimensions: state.checkDimensions,
    });
    const compliancePercent = result.totalChecks > 0
      ? Math.round((result.passedChecks / result.totalChecks) * 100)
      : 100;
    update({
      issues: result.issues,
      totalChecks: result.totalChecks,
      passedChecks: result.passedChecks,
      compliancePercent,
    });
  }, [state, update, targetElements]);

  if (!state || !update) return null;

  const complianceColor = state.compliancePercent >= 90
    ? 'green.400'
    : state.compliancePercent >= 60
      ? 'yellow.400'
      : 'red.400';

  // Group issues by element
  const byElement = new Map<string, typeof state.issues>();
  for (const issue of state.issues) {
    const existing = byElement.get(issue.elementId);
    if (existing) {
      existing.push(issue);
    } else {
      byElement.set(issue.elementId, [issue]);
    }
  }

  return (
    <Panel title="Grid Compliance" isCollapsible defaultOpen={false}>
      <SliderControl
        label="Grid Size"
        value={state.gridSize}
        min={1}
        max={64}
        step={1}
        onChange={(val) => update({ gridSize: val })}
        formatter={(v) => `${v}px`}
      />

      <SliderControl
        label="Tolerance"
        value={state.tolerance}
        min={0}
        max={5}
        step={0.1}
        onChange={(val) => update({ tolerance: val })}
        formatter={(v) => `${v.toFixed(1)}px`}
      />

      <PanelToggle
        isChecked={state.checkPositions}
        onChange={(e) => update({ checkPositions: e.target.checked })}
      >
        Check Positions
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkDimensions}
        onChange={(e) => update({ checkDimensions: e.target.checked })}
      >
        Check Dimensions
      </PanelToggle>

      <PanelStyledButton onClick={handleAnalyze}>
        Analyze ({targetElements.length} elements)
      </PanelStyledButton>

      {state.totalChecks > 0 && (
        <>
          <SectionHeader title="Results" />

          <HStack justify="space-between" px={2} py={1}>
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
              Compliance Score
            </Text>
            <Text fontSize="sm" fontWeight="bold" color={complianceColor}>
              {state.compliancePercent}%
            </Text>
          </HStack>

          <HStack justify="space-between" px={2} py={1}>
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
              Checks Passed
            </Text>
            <Text fontSize="xs" color="gray.700" _dark={{ color: 'gray.300' }}>
              {state.passedChecks} / {state.totalChecks}
            </Text>
          </HStack>

          {/* Compliance bar */}
          <Box px={2} py={1}>
            <Box
              h="6px"
              borderRadius="full"
              bg="whiteAlpha.100"
              overflow="hidden"
            >
              <Box
                h="100%"
                w={`${state.compliancePercent}%`}
                bg={complianceColor}
                borderRadius="full"
                transition="width 0.3s"
              />
            </Box>
          </Box>

          {state.issues.length > 0 && (
            <>
              <SectionHeader title={`Issues (${state.issues.length})`} />

              <VStack gap={1} align="stretch" maxH="250px" overflowY="auto" px={2}>
                {[...byElement.entries()].map(([elId, elIssues]) => (
                  <Box
                    key={elId}
                    p={2}
                    bg="whiteAlpha.50"
                    borderRadius="md"
                    borderLeft="3px solid"
                    borderColor="red.400"
                  >
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" _dark={{ color: 'gray.300' }} mb={1}>
                      {elId.slice(0, 12)}...
                    </Text>
                    {elIssues.map((issue, i) => (
                      <HStack key={i} justify="space-between">
                        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                          {issue.type.replace('off-grid-', '').toUpperCase()}
                        </Text>
                        <Text fontSize="xs" color="red.300">
                          {issue.offset > 0 ? '+' : ''}{issue.offset}px
                        </Text>
                      </HStack>
                    ))}
                  </Box>
                ))}
              </VStack>
            </>
          )}

          {state.issues.length === 0 && (
            <Box px={2} py={3} textAlign="center">
              <Text fontSize="xs" color="green.400">
                All elements are on grid!
              </Text>
            </Box>
          )}
        </>
      )}
    </Panel>
  );
};

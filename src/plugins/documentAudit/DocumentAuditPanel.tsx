import React, { useCallback, useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { DocumentAuditPluginSlice, AuditIssue, IssueSeverity } from './slice';
import { auditDocument } from './auditUtils';

type AuditStore = CanvasStore & DocumentAuditPluginSlice;

const severityColors: Record<IssueSeverity, string> = {
  error: 'red.400',
  warning: 'orange.400',
  info: 'blue.400',
};

const severityIcons: Record<IssueSeverity, string> = {
  error: '●',
  warning: '▲',
  info: 'ℹ',
};

const categoryLabels: Record<string, string> = {
  'empty-group': 'Empty Groups',
  'zero-size': 'Zero Size',
  'invisible': 'Invisible',
  'out-of-bounds': 'Out of Bounds',
  'excessive-complexity': 'High Complexity',
  'missing-style': 'Missing Style',
  'redundant': 'Redundant',
  'unreachable': 'Unreachable',
};

export const DocumentAuditPanel: React.FC = () => {
  const { state, update, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as AuditStore;
      return {
        state: st.documentAudit,
        update: st.updateDocumentAuditState,
        elements: s.elements,
      };
    })
  );

  const handleAudit = useCallback(() => {
    if (!state || !update) return;
    const result = auditDocument(elements, {
      checkEmptyGroups: state.checkEmptyGroups,
      checkZeroSize: state.checkZeroSize,
      checkInvisible: state.checkInvisible,
      checkOutOfBounds: state.checkOutOfBounds,
      checkComplexity: state.checkComplexity,
      checkMissingStyle: state.checkMissingStyle,
      complexityThreshold: state.complexityThreshold,
      boundsLimit: state.boundsLimit,
    });
    update({ issues: result.issues, summary: result.summary });
  }, [state, update, elements]);

  const handleSelectElement = useCallback((id: string) => {
    const store = useCanvasStore.getState();
    store.selectElements([id]);
  }, []);

  // Group issues by category
  const issuesByCategory = useMemo(() => {
    if (!state) return new Map<string, AuditIssue[]>();
    const map = new Map<string, AuditIssue[]>();
    for (const issue of state.issues) {
      const existing = map.get(issue.category);
      if (existing) {
        existing.push(issue);
      } else {
        map.set(issue.category, [issue]);
      }
    }
    return map;
  }, [state]);

  if (!state || !update) return null;

  return (
    <Panel title="Document Audit" isCollapsible defaultOpen={false}>
      <PanelToggle
        isChecked={state.checkEmptyGroups}
        onChange={(e) => update({ checkEmptyGroups: e.target.checked })}
      >
        Check Empty Groups
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkZeroSize}
        onChange={(e) => update({ checkZeroSize: e.target.checked })}
      >
        Check Zero-Size Elements
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkInvisible}
        onChange={(e) => update({ checkInvisible: e.target.checked })}
      >
        Check Invisible Elements
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkOutOfBounds}
        onChange={(e) => update({ checkOutOfBounds: e.target.checked })}
      >
        Check Out-of-Bounds
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkComplexity}
        onChange={(e) => update({ checkComplexity: e.target.checked })}
      >
        Check Excessive Complexity
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkMissingStyle}
        onChange={(e) => update({ checkMissingStyle: e.target.checked })}
      >
        Check Missing Styles
      </PanelToggle>

      {state.checkComplexity && (
        <SliderControl
          label="Complexity Threshold"
          value={state.complexityThreshold}
          min={50}
          max={2000}
          step={50}
          onChange={(val) => update({ complexityThreshold: val })}
          formatter={(v) => `${v} pts`}
        />
      )}

      <PanelStyledButton onClick={handleAudit}>
        Run Audit ({elements.length} elements)
      </PanelStyledButton>

      {state.summary && (
        <>
          <SectionHeader title="Summary" />

          <HStack justify="space-between" px={2} py={1}>
            <Text fontSize="xs" color="gray.400">Total Elements</Text>
            <Text fontSize="xs" color="gray.300">{state.summary.totalElements}</Text>
          </HStack>

          <HStack px={2} py={1} gap={3}>
            <Text fontSize="xs" color="gray.400">
              Paths: {state.summary.pathCount}
            </Text>
            <Text fontSize="xs" color="gray.400">
              Groups: {state.summary.groupCount}
            </Text>
            {state.summary.otherCount > 0 && (
              <Text fontSize="xs" color="gray.400">
                Other: {state.summary.otherCount}
              </Text>
            )}
          </HStack>

          <HStack justify="space-between" px={2} py={1}>
            <Text fontSize="xs" color="gray.400">Issues Found</Text>
            <Text
              fontSize="sm"
              fontWeight="bold"
              color={state.summary.issueCount === 0 ? 'green.400' : 'orange.400'}
            >
              {state.summary.issueCount}
            </Text>
          </HStack>

          {state.summary.issueCount > 0 && (
            <HStack px={2} py={1} gap={3}>
              {state.summary.errorCount > 0 && (
                <Text fontSize="xs" color="red.400">
                  {severityIcons.error} {state.summary.errorCount} errors
                </Text>
              )}
              {state.summary.warningCount > 0 && (
                <Text fontSize="xs" color="orange.400">
                  {severityIcons.warning} {state.summary.warningCount} warnings
                </Text>
              )}
              {state.summary.infoCount > 0 && (
                <Text fontSize="xs" color="blue.400">
                  {severityIcons.info} {state.summary.infoCount} info
                </Text>
              )}
            </HStack>
          )}

          {state.summary.issueCount === 0 && (
            <Box px={2} py={3} textAlign="center">
              <Text fontSize="xs" color="green.400">
                No issues found. Document is clean!
              </Text>
            </Box>
          )}
        </>
      )}

      {state.issues.length > 0 && (
        <>
          <SectionHeader title="Issues" />

          <VStack gap={1} align="stretch" maxH="300px" overflowY="auto" px={2}>
            {[...issuesByCategory.entries()].map(([category, catIssues]) => (
              <Box key={category}>
                <Text fontSize="xs" fontWeight="bold" color="gray.300" mb={1}>
                  {categoryLabels[category] || category} ({catIssues.length})
                </Text>

                {catIssues.map((issue, i) => (
                  <Box
                    key={i}
                    p={2}
                    mb={1}
                    bg="whiteAlpha.50"
                    borderRadius="md"
                    borderLeft="3px solid"
                    borderColor={severityColors[issue.severity]}
                    cursor="pointer"
                    _hover={{ bg: 'whiteAlpha.100' }}
                    onClick={() => handleSelectElement(issue.elementId)}
                  >
                    <HStack gap={1} mb={1}>
                      <Text fontSize="xs" color={severityColors[issue.severity]}>
                        {severityIcons[issue.severity]}
                      </Text>
                      <Text fontSize="xs" color="gray.300">
                        {issue.description}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" fontStyle="italic">
                      {issue.suggestion}
                    </Text>
                  </Box>
                ))}
              </Box>
            ))}
          </VStack>
        </>
      )}
    </Panel>
  );
};

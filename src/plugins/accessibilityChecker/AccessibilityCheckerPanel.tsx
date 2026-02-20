import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { AccessibilityCheckerPluginSlice } from './slice';
import { checkAccessibility } from './a11yUtils';

type A11yStore = CanvasStore & AccessibilityCheckerPluginSlice;

const severityColors = { pass: 'green.400', warning: 'orange.400', fail: 'red.400' };
const severityIcons = { pass: '✓', warning: '▲', fail: '✕' };

export const AccessibilityCheckerPanel: React.FC = () => {
  const { state, update, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as A11yStore;
      return {
        state: st.accessibilityChecker,
        update: st.updateAccessibilityCheckerState,
        elements: s.elements,
      };
    })
  );

  const handleCheck = useCallback(() => {
    if (!state || !update) return;
    const issues = checkAccessibility(elements, {
      minTouchTarget: state.minTouchTarget,
      minElementSize: state.minElementSize,
      minStrokeWidth: state.minStrokeWidth,
      checkTouchTargets: state.checkTouchTargets,
      checkMinSize: state.checkMinSize,
      checkThinStrokes: state.checkThinStrokes,
      checkTinyElements: state.checkTinyElements,
    });
    const failCount = issues.filter((i) => i.severity === 'fail').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const passCount = elements.filter((e) => e.type === 'path').length - issues.length;
    update({ issues, failCount, warningCount, passCount: Math.max(0, passCount) });
  }, [state, update, elements]);

  if (!state || !update) return null;

  const totalChecked = state.passCount + state.failCount + state.warningCount;
  const scorePercent = totalChecked > 0 ? Math.round((state.passCount / totalChecked) * 100) : 0;

  return (
    <Panel title="Accessibility Checker" isCollapsible defaultOpen={false}>
      <SliderControl
        label="Min Touch Target"
        value={state.minTouchTarget}
        min={24}
        max={96}
        step={4}
        onChange={(val) => update({ minTouchTarget: val })}
        formatter={(v) => `${v}px`}
      />

      <SliderControl
        label="Min Element Size"
        value={state.minElementSize}
        min={1}
        max={24}
        step={1}
        onChange={(val) => update({ minElementSize: val })}
        formatter={(v) => `${v}px`}
      />

      <SliderControl
        label="Min Stroke Width"
        value={state.minStrokeWidth}
        min={0.25}
        max={4}
        step={0.25}
        onChange={(val) => update({ minStrokeWidth: val })}
        formatter={(v) => `${v}px`}
      />

      <PanelToggle
        isChecked={state.checkTouchTargets}
        onChange={(e) => update({ checkTouchTargets: e.target.checked })}
      >
        Touch Targets (WCAG 2.5.8)
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkMinSize}
        onChange={(e) => update({ checkMinSize: e.target.checked })}
      >
        Minimum Visible Size
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkThinStrokes}
        onChange={(e) => update({ checkThinStrokes: e.target.checked })}
      >
        Thin Strokes
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkTinyElements}
        onChange={(e) => update({ checkTinyElements: e.target.checked })}
      >
        Tiny Elements
      </PanelToggle>

      <PanelStyledButton onClick={handleCheck}>
        Run Check ({elements.length} elements)
      </PanelStyledButton>

      {totalChecked > 0 && (
        <>
          <SectionHeader title="Score" />

          <Box px={2} py={1}>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs" color="gray.400">Accessibility Score</Text>
              <Text
                fontSize="sm"
                fontWeight="bold"
                color={scorePercent >= 80 ? 'green.400' : scorePercent >= 50 ? 'orange.400' : 'red.400'}
              >
                {scorePercent}%
              </Text>
            </HStack>
            <Box h="6px" borderRadius="full" bg="whiteAlpha.100" overflow="hidden">
              <Box
                h="100%"
                w={`${scorePercent}%`}
                bg={scorePercent >= 80 ? 'green.400' : scorePercent >= 50 ? 'orange.400' : 'red.400'}
                borderRadius="full"
              />
            </Box>
          </Box>

          <HStack px={2} py={1} gap={3}>
            <Text fontSize="xs" color="green.400">{severityIcons.pass} {state.passCount} pass</Text>
            <Text fontSize="xs" color="orange.400">{severityIcons.warning} {state.warningCount} warn</Text>
            <Text fontSize="xs" color="red.400">{severityIcons.fail} {state.failCount} fail</Text>
          </HStack>
        </>
      )}

      {state.issues.length > 0 && (
        <>
          <SectionHeader title={`Issues (${state.issues.length})`} />
          <VStack gap={1} align="stretch" maxH="250px" overflowY="auto" px={2}>
            {state.issues.map((iss, i) => (
              <Box
                key={i}
                p={2}
                bg="whiteAlpha.50"
                borderRadius="md"
                borderLeft="3px solid"
                borderColor={severityColors[iss.severity]}
                cursor="pointer"
                _hover={{ bg: 'whiteAlpha.100' }}
                onClick={() => useCanvasStore.getState().selectElements([iss.elementId])}
              >
                <HStack gap={1} mb={1}>
                  <Text fontSize="xs" color={severityColors[iss.severity]}>{severityIcons[iss.severity]}</Text>
                  <Text fontSize="xs" color="gray.300">{iss.description}</Text>
                </HStack>
                <Text fontSize="xs" color="gray.500" fontStyle="italic">{iss.suggestion}</Text>
              </Box>
            ))}
          </VStack>
        </>
      )}
    </Panel>
  );
};

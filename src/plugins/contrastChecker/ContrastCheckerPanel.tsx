import React, { useCallback, useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ContrastCheckerPluginSlice, ContrastResult } from './slice';
import {
  checkElementPairContrast,
  getContrastRating,
  getContrastColor,
  suggestBetterContrast,
} from './contrastUtils';
import type { CanvasElement } from '../../types';

type ContrastStore = CanvasStore & ContrastCheckerPluginSlice;

const WCAGBadge: React.FC<{ label: string; pass: boolean }> = ({ label, pass }) => (
  <Box
    px={1.5}
    py={0.5}
    borderRadius="sm"
    bg={pass ? 'green.900' : 'red.900'}
    border="1px solid"
    borderColor={pass ? 'green.600' : 'red.600'}
  >
    <Text fontSize="2xs" fontWeight="bold" color={pass ? 'green.200' : 'red.200'}>
      {label}: {pass ? 'PASS' : 'FAIL'}
    </Text>
  </Box>
);

const ContrastResultCard: React.FC<{ result: ContrastResult }> = ({ result }) => {
  const rating = getContrastRating(result.ratio);
  const ratingColor = getContrastColor(result.ratio);

  return (
    <Box bg="whiteAlpha.50" borderRadius="md" p={2} mb={1}>
      <HStack justify="space-between" mb={1}>
        <HStack gap={1}>
          <Box w={4} h={4} borderRadius="sm" bg={result.foregroundColor} border="1px solid" borderColor="whiteAlpha.300" />
          <Text fontSize="2xs" color="gray.400">vs</Text>
          <Box w={4} h={4} borderRadius="sm" bg={result.backgroundColor} border="1px solid" borderColor="whiteAlpha.300" />
        </HStack>
        <HStack gap={1}>
          <Text fontSize="sm" fontWeight="bold" fontFamily="mono" color={ratingColor}>
            {result.ratio.toFixed(2)}:1
          </Text>
          <Text fontSize="2xs" color={ratingColor}>{rating}</Text>
        </HStack>
      </HStack>

      <HStack gap={1} flexWrap="wrap">
        <WCAGBadge label="AA" pass={result.passAA} />
        <WCAGBadge label="AAA" pass={result.passAAA} />
        <WCAGBadge label="AA Large" pass={result.passAALarge} />
        <WCAGBadge label="AAA Large" pass={result.passAAALarge} />
      </HStack>
    </Box>
  );
};

export const ContrastCheckerPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as ContrastStore;
      return {
        state: st.contrastChecker,
        update: st.updateContrastCheckerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const selectedPaths = useMemo(() => {
    return elements.filter(
      (el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path'
    );
  }, [selectedIds, elements]);

  const handleCheck = useCallback(() => {
    if (!state || !update || selectedPaths.length < 2) return;

    const results: ContrastResult[] = [];

    for (let i = 0; i < selectedPaths.length; i++) {
      for (let j = i + 1; j < selectedPaths.length; j++) {
        const elA = selectedPaths[i];
        const elB = selectedPaths[j];
        if (elA.type !== 'path' || elB.type !== 'path') continue;

        if (state.checkFill) {
          const fillResult = checkElementPairContrast(elA.data.fillColor, elB.data.fillColor);
          if (fillResult) results.push(fillResult);
        }

        if (state.checkStroke) {
          const strokeResult = checkElementPairContrast(elA.data.strokeColor, elB.data.strokeColor);
          if (strokeResult) results.push(strokeResult);
        }

        // Cross check: fill vs stroke
        if (state.checkFill && state.checkStroke) {
          const crossResult1 = checkElementPairContrast(elA.data.fillColor, elB.data.strokeColor);
          if (crossResult1) results.push(crossResult1);
          const crossResult2 = checkElementPairContrast(elA.data.strokeColor, elB.data.fillColor);
          if (crossResult2) results.push(crossResult2);
        }
      }
    }

    update({ results });
  }, [state, update, selectedPaths]);

  const suggestions = useMemo(() => {
    if (!state?.results.length) return [];
    return state.results
      .filter((r) => !r.passAA)
      .map((r) => ({
        ...r,
        suggested: suggestBetterContrast(r.foregroundColor, r.backgroundColor),
      }));
  }, [state?.results]);

  if (!state || !update) return null;

  return (
    <Panel title="Contrast Checker" isCollapsible defaultOpen={false}>
      <PanelToggle
        isChecked={state.checkFill}
        onChange={(e) => update({ checkFill: e.target.checked })}
      >
        Check Fill Colors
      </PanelToggle>

      <PanelToggle
        isChecked={state.checkStroke}
        onChange={(e) => update({ checkStroke: e.target.checked })}
      >
        Check Stroke Colors
      </PanelToggle>

      <PanelStyledButton
        onClick={handleCheck}
        isDisabled={selectedPaths.length < 2}
        size="sm"
        width="full"
      >
        Check Contrast ({selectedPaths.length} elements)
      </PanelStyledButton>

      {state.results.length > 0 && (
        <>
          <SectionHeader title={`Results (${state.results.length})`} />
          <VStack gap={0} align="stretch" px={1}>
            {state.results.map((result, i) => (
              <ContrastResultCard key={i} result={result} />
            ))}
          </VStack>
        </>
      )}

      {suggestions.length > 0 && (
        <>
          <SectionHeader title="Suggestions" />
          <Box px={2}>
            {suggestions.map((s, i) => (
              <HStack key={i} gap={1} mb={0.5}>
                <Box w={3} h={3} borderRadius="sm" bg={s.foregroundColor} border="1px solid" borderColor="whiteAlpha.300" />
                <Text fontSize="2xs" color="gray.400">→</Text>
                {s.suggested && (
                  <Box w={3} h={3} borderRadius="sm" bg={s.suggested} border="1px solid" borderColor="whiteAlpha.300" />
                )}
                <Text fontSize="2xs" color="gray.400">
                  for AA ({s.ratio.toFixed(1)}:1 → 4.5:1)
                </Text>
              </HStack>
            ))}
          </Box>
        </>
      )}

      {selectedPaths.length < 2 && state.results.length === 0 && (
        <Text fontSize="xs" color="gray.500" px={2} py={2}>
          Select at least 2 elements to check contrast ratios
        </Text>
      )}
    </Panel>
  );
};

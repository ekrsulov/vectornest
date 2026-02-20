import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ProportionCheckerPluginSlice } from './slice';
import { checkProportions } from './proportionUtils';
import type { CanvasElement } from '../../types';

type PCStore = CanvasStore & ProportionCheckerPluginSlice;

export const ProportionCheckerPanel: React.FC = () => {
  const { state, update, selectedIds, elements, selectElements } = useCanvasStore(
    useShallow((s) => {
      const st = s as PCStore;
      return {
        state: st.proportionChecker,
        update: st.updateProportionCheckerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        selectElements: s.selectElements,
      };
    })
  );

  const handleCheck = useCallback(() => {
    if (!state || !update) return;
    const target = selectedIds.length > 0
      ? elements.filter((el: CanvasElement) => selectedIds.includes(el.id))
      : elements;
    const results = checkProportions(target as CanvasElement[]);
    update({ results });
  }, [state, update, selectedIds, elements]);

  if (!state || !update) return null;

  return (
    <Panel title="Proportions" isCollapsible defaultOpen={false}>
      <SliderControl
        label="Tolerance"
        value={state.tolerancePercent}
        min={1}
        max={20}
        step={0.5}
        onChange={(v) => update({ tolerancePercent: v })}
        formatter={(v) => `${v}%`}
      />

      <PanelStyledButton onClick={handleCheck}>
        Check Proportions
      </PanelStyledButton>

      {state.results.length > 0 && (
        <>
          <SectionHeader title={`Results (${state.results.length})`} />
          <VStack gap={1} align="stretch" maxH="300px" overflowY="auto" px={2}>
            {state.results.map((r) => {
              const isMatch = r.deviation <= state.tolerancePercent;
              const isGolden = r.closestStandard.includes('Golden') && isMatch;
              return (
                <Box
                  key={r.elementId}
                  p={1.5}
                  borderRadius="sm"
                  bg="whiteAlpha.50"
                  cursor="pointer"
                  _hover={{ bg: 'whiteAlpha.100' }}
                  onClick={() => selectElements([r.elementId])}
                  borderLeft="3px solid"
                  borderColor={isGolden ? 'yellow.400' : isMatch ? 'green.400' : 'gray.600'}
                >
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="gray.300" isTruncated maxW="100px">
                      {r.label}
                    </Text>
                    <Text fontSize="xs" fontFamily="mono" color="gray.400">
                      {r.width} × {r.height}
                    </Text>
                  </HStack>
                  <HStack justify="space-between" mt={0.5}>
                    <Text fontSize="xs" color={isMatch ? 'green.400' : 'gray.400'}>
                      {r.closestStandard}
                    </Text>
                    <HStack gap={1}>
                      <Text fontSize="xs" fontFamily="mono" color="blue.300">
                        {r.ratio}
                      </Text>
                      <Text
                        fontSize="9px"
                        color={isMatch ? 'green.400' : 'orange.400'}
                      >
                        ±{r.deviation}%
                      </Text>
                    </HStack>
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        </>
      )}
    </Panel>
  );
};

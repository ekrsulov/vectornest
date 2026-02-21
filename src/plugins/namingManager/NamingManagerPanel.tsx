import React, { useCallback, useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { CustomSelect } from '../../ui/CustomSelect';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { NamingManagerPluginSlice } from './slice';
import { generateLabels, getElementStats } from './namingUtils';
import type { CanvasElement } from '../../types';

type NamingStore = CanvasStore & NamingManagerPluginSlice;

const patternOptions = [
  { label: 'Prefix + Number', value: 'prefix-number' },
  { label: 'Type + Number', value: 'type-number' },
  { label: 'Custom Pattern', value: 'custom' },
];

export const NamingManagerPanel: React.FC = () => {
  const { state, update, selectedIds, elements, updateElement } = useCanvasStore(
    useShallow((s) => {
      const st = s as NamingStore;
      return {
        state: st.namingManager,
        update: st.updateNamingManagerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
        updateElement: s.updateElement,
      };
    })
  );

  const targetElements = useMemo(() => {
    if (selectedIds.length > 0) {
      return elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    }
    return elements;
  }, [selectedIds, elements]);

  const stats = useMemo(() => getElementStats(targetElements), [targetElements]);

  const handlePreview = useCallback(() => {
    if (!state || !update) return;
    const labels = generateLabels(targetElements, {
      prefix: state.prefix,
      suffix: state.suffix,
      separator: state.separator,
      startNumber: state.startNumber,
      pattern: state.pattern,
      customPattern: state.customPattern,
    });
    update({ labels });
  }, [state, update, targetElements]);

  const handleApply = useCallback(() => {
    if (!state || !updateElement) return;
    // Generate labels fresh from current elements — no prior Preview click required
    const labels = generateLabels(targetElements, {
      prefix: state.prefix,
      suffix: state.suffix,
      separator: state.separator,
      startNumber: state.startNumber,
      pattern: state.pattern,
      customPattern: state.customPattern,
    });
    for (const label of labels) {
      const el = elements.find((e: CanvasElement) => e.id === label.id);
      if (el) {
        updateElement(el.id, { data: { name: label.newName } });
      }
    }
    // Sync preview labels so the panel reflects applied names
    update?.({ labels });
  }, [state, update, updateElement, elements, targetElements]);

  if (!state || !update) return null;

  return (
    <Panel title="Naming Manager" isCollapsible defaultOpen={false}>
      <HStack px={2} py={1} gap={3}>
        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Named: {stats.named}</Text>
        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Unnamed: {stats.unnamed}</Text>
        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Total: {stats.total}</Text>
      </HStack>

      <CustomSelect
        size="sm"
        placeholder="Pattern"
        value={state.pattern}
        onChange={(val) => update({ pattern: val as NamingManagerPluginSlice['namingManager']['pattern'] })}
        options={patternOptions}
      />

      <Box px={2}>
        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>Prefix</Text>
        <PanelTextInput
          value={state.prefix}
          onChange={(val) => update({ prefix: val })}
          placeholder="Prefix"
          width="100%"
        />
      </Box>

      <Box px={2}>
        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>Suffix</Text>
        <PanelTextInput
          value={state.suffix}
          onChange={(val) => update({ suffix: val })}
          placeholder="Suffix"
          width="100%"
        />
      </Box>

      <Box px={2}>
        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>Separator</Text>
        <PanelTextInput
          value={state.separator}
          onChange={(val) => update({ separator: val })}
          placeholder="Separator"
          width="100%"
        />
      </Box>

      {state.pattern === 'custom' && (
        <Box px={2}>
          <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>Custom Pattern</Text>
          <PanelTextInput
            value={state.customPattern}
            onChange={(val) => update({ customPattern: val })}
            placeholder="{type}{sep}{n}"
            width="100%"
          />
        </Box>
      )}

      <SliderControl
        label="Start Number"
        value={state.startNumber}
        min={0}
        max={100}
        step={1}
        onChange={(val) => update({ startNumber: val })}
      />

      <HStack gap={2} px={2}>
        <PanelStyledButton onClick={handlePreview}>
          Preview
        </PanelStyledButton>
        <PanelStyledButton onClick={handleApply}>
          Apply Names
        </PanelStyledButton>
      </HStack>

      {state.labels.length > 0 && (
        <>
          <SectionHeader title={`Preview (${state.labels.length})`} />
          <VStack gap={1} align="stretch" maxH="250px" overflowY="auto" px={2}>
            {state.labels.map((label) => (
              <Box key={label.id} p={2} bg="whiteAlpha.50" borderRadius="md">
                <HStack justify="space-between">
                  <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }} textDecoration="line-through">
                    {label.currentName}
                  </Text>
                  <Text fontSize="xs" color="green.600" _dark={{ color: 'green.300' }} fontWeight="bold">
                    {label.newName}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </>
      )}
    </Panel>
  );
};

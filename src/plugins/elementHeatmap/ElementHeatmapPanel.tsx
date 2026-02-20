import React from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ElementHeatmapPluginSlice } from './slice';

type HMStore = CanvasStore & ElementHeatmapPluginSlice;

export const ElementHeatmapPanel: React.FC = () => {
  const { state, update } = useCanvasStore(
    useShallow((s) => {
      const st = s as HMStore;
      return {
        state: st.elementHeatmap,
        update: st.updateElementHeatmapState,
      };
    })
  );

  if (!state || !update) return null;

  return (
    <Panel
      title="Element Heatmap"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle element heatmap"
        />
      }
    >
      {state.enabled && (
        <>
          <SliderControl
            label="Grid Size"
            value={state.gridSize}
            min={20}
            max={200}
            step={10}
            onChange={(v) => update({ gridSize: v })}
            formatter={(v) => `${v}px`}
          />

          <SliderControl
            label="Opacity"
            value={state.opacity}
            min={10}
            max={80}
            step={5}
            onChange={(v) => update({ opacity: v })}
            formatter={(v) => `${v}%`}
          />

          <Box px={2} py={2}>
            <Text fontSize="xs" color="gray.400" mb={1}>Density Scale</Text>
            <HStack h="8px" borderRadius="full" overflow="hidden">
              <Box flex={1} bg="blue.500" />
              <Box flex={1} bg="cyan.400" />
              <Box flex={1} bg="green.400" />
              <Box flex={1} bg="yellow.400" />
              <Box flex={1} bg="red.500" />
            </HStack>
            <HStack justify="space-between" mt={0.5}>
              <Text fontSize="9px" color="gray.500">Low</Text>
              <Text fontSize="9px" color="gray.500">High</Text>
            </HStack>
          </Box>
        </>
      )}
    </Panel>
  );
};

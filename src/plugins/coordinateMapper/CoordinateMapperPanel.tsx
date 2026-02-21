import React from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { CoordinateMapperPluginSlice } from './slice';

type CMStore = CanvasStore & CoordinateMapperPluginSlice;

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <HStack gap={1}>
      <Box w="8px" h="8px" borderRadius="full" bg={color} />
      <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>{label}</Text>
    </HStack>
  );
}

export const CoordinateMapperPanel: React.FC = () => {
  const { state, update } = useCanvasStore(
    useShallow((s) => {
      const st = s as CMStore;
      return {
        state: st.coordinateMapper,
        update: st.updateCoordinateMapperState,
      };
    })
  );

  if (!state || !update) return null;

  return (
    <Panel
      title="Coordinates"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle coordinate mapper"
        />
      }
    >
      {state.enabled && (
        <>
          <PanelToggle
            isChecked={state.selectedOnly}
            onChange={(e) => update({ selectedOnly: e.target.checked })}
          >
            Selected Only
          </PanelToggle>

          <PanelToggle
            isChecked={state.showAnchors}
            onChange={(e) => update({ showAnchors: e.target.checked })}
          >
            Anchor Points
          </PanelToggle>

          <PanelToggle
            isChecked={state.showControls}
            onChange={(e) => update({ showControls: e.target.checked })}
          >
            Control Points
          </PanelToggle>

          <PanelToggle
            isChecked={state.showCenters}
            onChange={(e) => update({ showCenters: e.target.checked })}
          >
            Element Centers
          </PanelToggle>

          <SliderControl
            label="Decimal Places"
            value={state.precision}
            min={0}
            max={4}
            step={1}
            onChange={(v) => update({ precision: v })}
          />

          <Box px={2} py={2}>
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.500' }} mb={1}>Legend</Text>
            <HStack gap={3}>
              <LegendDot color="#3182CE" label="Anchor" />
              <LegendDot color="#D69E2E" label="Control" />
              <LegendDot color="#38A169" label="Center" />
            </HStack>
          </Box>
        </>
      )}
    </Panel>
  );
};

import React from 'react';
import { Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ElementRulerPluginSlice } from './slice';

type RulerStore = CanvasStore & ElementRulerPluginSlice;

export const ElementRulerPanel: React.FC = () => {
  const { state, update, selectedCount } = useCanvasStore(
    useShallow((s) => {
      const st = s as RulerStore;
      return {
        state: st.elementRuler,
        update: st.updateElementRulerState,
        selectedCount: s.selectedIds.length,
      };
    })
  );

  if (!state || !update) return null;

  return (
    <Panel
      title="Element Ruler"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle element ruler"
        />
      }
    >
      {state.enabled && (
        <>
          <PanelToggle
            isChecked={state.showDistances}
            onChange={(e) => update({ showDistances: e.target.checked })}
          >
            Center Distances
          </PanelToggle>

          <PanelToggle
            isChecked={state.showGaps}
            onChange={(e) => update({ showGaps: e.target.checked })}
          >
            Edge Gaps
          </PanelToggle>

          <PanelToggle
            isChecked={state.showAngles}
            onChange={(e) => update({ showAngles: e.target.checked })}
          >
            Angles
          </PanelToggle>

          <PanelToggle
            isChecked={state.showDimensions}
            onChange={(e) => update({ showDimensions: e.target.checked })}
          >
            Element Dimensions
          </PanelToggle>

          {selectedCount === 0 && (
            <Text fontSize="xs" color="gray.500" px={2} py={2}>
              Select elements to see measurements
            </Text>
          )}
          {selectedCount === 1 && (
            <Text fontSize="xs" color="gray.500" px={2} py={1}>
              Select more elements for distance measurements
            </Text>
          )}
        </>
      )}
    </Panel>
  );
};

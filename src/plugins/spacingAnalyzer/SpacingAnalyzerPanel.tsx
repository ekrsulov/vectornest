import React, { useCallback } from 'react';
import { HStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { SpacingAnalyzerPluginSlice } from './slice';
import { analyzeSpacing } from './spacingUtils';
import type { CanvasElement } from '../../types';

type SpStore = CanvasStore & SpacingAnalyzerPluginSlice;

export const SpacingAnalyzerPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as SpStore;
      return {
        state: st.spacingAnalyzer,
        update: st.updateSpacingAnalyzerState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const handleAnalyze = useCallback(() => {
    if (!state || !update) return;
    const selected = elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
    const result = analyzeSpacing(selected, {
      showHorizontal: state.showHorizontal,
      showVertical: state.showVertical,
      inconsistencyThreshold: state.inconsistencyThreshold,
    });
    const inconsistentCount = result.gaps.filter((g) => g.isInconsistent).length;
    update({ gaps: result.gaps, avgHGap: result.avgHGap, avgVGap: result.avgVGap, inconsistentCount });
  }, [state, update, selectedIds, elements]);

  if (!state || !update) return null;

  return (
    <Panel
      title="Spacing Analyzer"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle spacing overlay"
        />
      }
    >
      {state.enabled && (
        <>
          <PanelToggle
            isChecked={state.showHorizontal}
            onChange={(e) => update({ showHorizontal: e.target.checked })}
          >
            Horizontal Gaps
          </PanelToggle>

          <PanelToggle
            isChecked={state.showVertical}
            onChange={(e) => update({ showVertical: e.target.checked })}
          >
            Vertical Gaps
          </PanelToggle>

          <SliderControl
            label="Inconsistency Threshold"
            value={state.inconsistencyThreshold}
            min={0.5}
            max={20}
            step={0.5}
            onChange={(val) => update({ inconsistencyThreshold: val })}
            formatter={(v) => `${v}px`}
          />

          <PanelStyledButton onClick={handleAnalyze}>
            Analyze Spacing
          </PanelStyledButton>

          {state.gaps.length > 0 && (
            <>
              <SectionHeader title="Results" />

              <HStack justify="space-between" px={2} py={1}>
                <Text fontSize="xs" color="gray.400">Gaps Found</Text>
                <Text fontSize="xs" color="gray.300">{state.gaps.length}</Text>
              </HStack>

              <HStack justify="space-between" px={2} py={1}>
                <Text fontSize="xs" color="gray.400">Avg H-Gap</Text>
                <Text fontSize="xs" color="blue.300">{state.avgHGap}px</Text>
              </HStack>

              <HStack justify="space-between" px={2} py={1}>
                <Text fontSize="xs" color="gray.400">Avg V-Gap</Text>
                <Text fontSize="xs" color="blue.300">{state.avgVGap}px</Text>
              </HStack>

              <HStack justify="space-between" px={2} py={1}>
                <Text fontSize="xs" color="gray.400">Inconsistent</Text>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color={state.inconsistentCount > 0 ? 'red.400' : 'green.400'}
                >
                  {state.inconsistentCount}
                </Text>
              </HStack>
            </>
          )}
        </>
      )}
    </Panel>
  );
};

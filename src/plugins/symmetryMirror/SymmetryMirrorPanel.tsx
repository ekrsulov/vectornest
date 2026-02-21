import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import type { SymmetryMirrorPluginSlice } from './slice';
import type { SymmetryDrawPluginSlice } from '../symmetryDraw/slice';

export const SymmetryMirrorPanel: React.FC = () => {
  const mirror = useCanvasStore(
    (state) => (state as unknown as SymmetryMirrorPluginSlice).symmetryMirror
  );
  const symmetry = useCanvasStore(
    (state) => (state as unknown as SymmetryDrawPluginSlice).symmetryDraw
  );
  const updateMirrorState = useCanvasStore(
    (state) => (state as unknown as SymmetryMirrorPluginSlice).updateSymmetryMirrorState
  );
  const clearMirroredIds = useCanvasStore(
    (state) => (state as unknown as SymmetryMirrorPluginSlice).clearMirroredIds
  );

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMirrorState?.({ enabled: e.target.checked });
    if (!e.target.checked) {
      clearMirroredIds?.();
    }
  };

  const symmetryEnabled = symmetry?.enabled ?? false;

  return (
    <Panel
      title="Symmetry Mirror"
      isCollapsible={mirror?.enabled ?? false}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={mirror?.enabled ?? false}
          onChange={handleToggle}
          aria-label="Toggle symmetry mirror"
        />
      }
    >
      {mirror?.enabled && (
        <VStack gap={1} align="stretch">
          {!symmetryEnabled ? (
            <Text fontSize="xs" color="orange.500">
              Enable Symmetry Draw guides first to set the mirror axis and center point.
            </Text>
          ) : (
            <>
              <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
                New paths drawn will be automatically mirrored across the symmetry axes.
                Mode: <strong>{symmetry?.mode}</strong>
                {symmetry?.mode === 'radial' && ` (${symmetry?.segments} segments)`}
              </Text>

              <PanelToggle
                isChecked={mirror.mirrorStyle}
                onChange={() => updateMirrorState?.({ mirrorStyle: !mirror.mirrorStyle })}
              >
                Copy stroke & fill style
              </PanelToggle>

              <PanelToggle
                isChecked={mirror.autoGroup}
                onChange={() => updateMirrorState?.({ autoGroup: !mirror.autoGroup })}
              >
                Auto-group mirrors
              </PanelToggle>

              <Text fontSize="xs" color="gray.400" _dark={{ color: 'gray.500' }}>
                Mirrored elements: {mirror.mirroredIds.length}
              </Text>

              {mirror.mirroredIds.length > 0 && (
                <PanelStyledButton
                  onClick={() => clearMirroredIds?.()}
                  w="full"
                  variant="outline"
                >
                  Clear mirrored ID tracking
                </PanelStyledButton>
              )}
            </>
          )}
        </VStack>
      )}
    </Panel>
  );
};

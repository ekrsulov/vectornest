import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { CustomSelect } from '../../ui/CustomSelect';
import type { PathMorphPluginSlice } from './slice';
import type { CanvasStore } from '../../store/canvasStore';
import type { PathData } from '../../types';
import { generateMorphSteps } from './morphUtils';

const easingOptions = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
];

const selectMorphData = (state: CanvasStore) => {
  const morphState = (state as unknown as PathMorphPluginSlice).pathMorph;
  const selectedIds = state.selectedIds;
  const selectedPaths = state.elements.filter(
    (el) => selectedIds.includes(el.id) && el.type === 'path'
  );

  // Check compatibility — both paths need at least 1 subpath
  let compatible = false;
  let reason = '';
  if (selectedPaths.length !== 2) {
    reason = 'Select exactly 2 path elements to morph between them.';
  } else {
    const a = selectedPaths[0].data as PathData;
    const b = selectedPaths[1].data as PathData;
    if (a.subPaths.length === 0 || b.subPaths.length === 0) {
      reason = 'Both paths must have at least one subpath.';
    } else {
      // Check command count compatibility for the first subpath
      const minSP = Math.min(a.subPaths.length, b.subPaths.length);
      let allCompatible = true;
      for (let i = 0; i < minSP; i++) {
        if (a.subPaths[i].length !== b.subPaths[i].length) {
          allCompatible = false;
          break;
        }
      }
      if (!allCompatible) {
        reason = 'Paths have different numbers of anchor points. Results may vary.';
      }
      compatible = true; // Still allow it, just warn
    }
  }

  return {
    steps: morphState?.steps ?? 5,
    easing: morphState?.easing ?? 'linear',
    distributeColors: morphState?.distributeColors ?? true,
    pathCount: selectedPaths.length,
    compatible,
    reason,
  };
};

/**
 * Path Morph panel — create blended intermediate shapes between two paths
 */
export const PathMorphPanel: React.FC = () => {
  const {
    steps,
    easing,
    distributeColors,
    pathCount,
    compatible,
    reason,
  } = useShallowCanvasSelector(selectMorphData);

  const updatePathMorphState = useCanvasStore(
    (state) => (state as unknown as PathMorphPluginSlice).updatePathMorphState
  );

  const handleGenerate = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    const morphState = (store as unknown as PathMorphPluginSlice).pathMorph;
    const selectedIds = store.selectedIds;
    const selectedPaths = store.elements.filter(
      (el) => selectedIds.includes(el.id) && el.type === 'path'
    );
    if (selectedPaths.length !== 2) return;

    const pathA = selectedPaths[0].data as PathData;
    const pathB = selectedPaths[1].data as PathData;

    const morphedPaths = generateMorphSteps(
      pathA,
      pathB,
      morphState?.steps ?? 5,
      morphState?.easing ?? 'linear',
      morphState?.distributeColors ?? true
    );

    // Add each morphed path as a new element
    for (let i = 0; i < morphedPaths.length; i++) {
      store.addElement({
        type: 'path',
        data: morphedPaths[i],
      });
      // The addElement auto-assigns zIndex, but we can re-order after
    }
  };

  return (
    <Panel title="Path Morph" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        {pathCount !== 2 ? (
          <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.400' }}>
            {reason || 'Select exactly 2 path elements to morph between them.'}
          </Text>
        ) : (
          <>
            {reason && (
              <Text fontSize="10px" color="orange.500" _dark={{ color: 'orange.300' }}>
                {reason}
              </Text>
            )}

            <SliderControl
              label="Steps:"
              value={steps}
              min={1}
              max={20}
              step={1}
              onChange={(val) => updatePathMorphState?.({ steps: val })}
            />

            <CustomSelect
              value={easing}
              onChange={(val) => updatePathMorphState?.({ easing: val as PathMorphPluginSlice['pathMorph']['easing'] })}
              options={easingOptions}
              size="sm"
            />

            <PanelToggle
              isChecked={distributeColors}
              onChange={() => updatePathMorphState?.({ distributeColors: !distributeColors })}
            >
              Interpolate colors
            </PanelToggle>

            <PanelStyledButton
              onClick={handleGenerate}
              w="full"
              mt={1}
              isDisabled={!compatible}
            >
              Generate {steps} Intermediate Shape{steps !== 1 ? 's' : ''}
            </PanelStyledButton>
          </>
        )}
      </VStack>
    </Panel>
  );
};

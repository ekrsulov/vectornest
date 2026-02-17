import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { createInitialSelectSimilarState, type SelectSimilarSlice } from './slice';
import { applySelectSimilar, getAvailableCriteria } from './actions';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';

interface SelectSimilarPanelProps {
  hideTitle?: boolean;
}

const criteriaLabels: Record<string, string> = {
  fillColor: 'Same Fill Color',
  fillOpacity: 'Same Fill Opacity',
  strokeColor: 'Same Stroke Color',
  strokeOpacity: 'Same Stroke Opacity',
  strokeWidth: 'Same Stroke Width',
  strokeLinecap: 'Same Stroke Linecap',
  strokeLinejoin: 'Same Stroke Linejoin',
  strokeDasharray: 'Same Stroke Dash',
  elementType: 'Same Element Type',
  width: 'Same Width',
  height: 'Same Height',
};

/**
 * Extract only the attributes needed for Select Similar criteria (not position-related)
 * This prevents re-renders when elements are just moved
 */
const extractRelevantElementData = (el: CanvasElement) => {
  const data = el.data as Record<string, unknown>;
  return {
    id: el.id,
    type: el.type,
    fillColor: data?.fillColor,
    fillOpacity: data?.fillOpacity,
    strokeColor: data?.strokeColor,
    strokeOpacity: data?.strokeOpacity,
    strokeWidth: data?.strokeWidth,
    strokeLinecap: data?.strokeLinecap,
    strokeLinejoin: data?.strokeLinejoin,
    strokeDasharray: data?.strokeDasharray,
    width: data?.width,
    height: data?.height,
  };
};

/**
 * Selector that extracts only the data needed for Select Similar panel.
 * Flattened to ensure shallow comparison works correctly.
 */
const selectSelectSimilarPanelState = (state: CanvasStore) => {
  const selectedIds = state.selectedIds;
  const selectSimilarState = (state as unknown as SelectSimilarSlice).selectSimilar;

  // Only get the first selected element's relevant data (not position)
  let refData: ReturnType<typeof extractRelevantElementData> | null = null;
  if (selectedIds.length === 1) {
    const el = state.elements.find(e => e.id === selectedIds[0]);
    if (el) {
      refData = extractRelevantElementData(el);
    }
  }

  return {
    activePlugin: state.activePlugin,
    selectedIds,
    selectSimilarState, // Warning: object ref changes on update
    // Primitive props for shallow comparison stability
    hasReference: !!refData,
    refId: refData?.id,
    refType: refData?.type,
    refFillColor: refData?.fillColor,
    refFillOpacity: refData?.fillOpacity,
    refStrokeColor: refData?.strokeColor,
    refStrokeOpacity: refData?.strokeOpacity,
    refStrokeWidth: refData?.strokeWidth,
    refStrokeLinecap: refData?.strokeLinecap,
    refStrokeLinejoin: refData?.strokeLinejoin,
    refStrokeDasharray: refData?.strokeDasharray,
    refWidth: refData?.width,
    refHeight: refData?.height,
  };
};

export const SelectSimilarPanel: React.FC<SelectSimilarPanelProps> = ({ hideTitle = false }) => {
  const {
    activePlugin,
    selectedIds,
    selectSimilarState,
    hasReference,
    refId,
    refType,
    refFillColor,
    refFillOpacity,
    refStrokeColor,
    refStrokeOpacity,
    refStrokeWidth,
    refStrokeLinecap,
    refStrokeLinejoin,
    refStrokeDasharray,
    refWidth,
    refHeight,
  } = useShallowCanvasSelector(selectSelectSimilarPanelState);

  // Reconstruct referenceElementData object for internal usage
  const referenceElementData = React.useMemo(() => {
    if (!hasReference) return null;
    return {
      id: refId!,
      type: refType!,
      fillColor: refFillColor,
      fillOpacity: refFillOpacity,
      strokeColor: refStrokeColor,
      strokeOpacity: refStrokeOpacity,
      strokeWidth: refStrokeWidth,
      strokeLinecap: refStrokeLinecap,
      strokeLinejoin: refStrokeLinejoin,
      strokeDasharray: refStrokeDasharray,
      width: refWidth,
      height: refHeight,
    };
  }, [
    hasReference, refId, refType, refFillColor, refFillOpacity,
    refStrokeColor, refStrokeOpacity, refStrokeWidth,
    refStrokeLinecap, refStrokeLinejoin, refStrokeDasharray,
    refWidth, refHeight
  ]);

  const updateSelectSimilarState = useCanvasStore(
    state => (state as unknown as SelectSimilarSlice).updateSelectSimilarState
  );
  const resetSelectSimilarState = useCanvasStore(
    state => (state as unknown as SelectSimilarSlice).resetSelectSimilarState
  );

  // Destructure needed properties to avoid effect loop on object reference change
  const isActive = selectSimilarState?.isActive;
  const referenceElementId = selectSimilarState?.referenceElementId;

  React.useEffect(() => {
    if (selectedIds.length === 1) {
      const selectedId = selectedIds[0];
      if (referenceElementId !== selectedId) {
        updateSelectSimilarState?.({
          ...createInitialSelectSimilarState(),
          isActive: true,
          referenceElementId: selectedId,
        });
      } else if (!isActive) {
        updateSelectSimilarState?.({ isActive: true });
      }
    } else if (isActive || referenceElementId) {
      resetSelectSimilarState?.();
    }
  }, [selectedIds, isActive, referenceElementId, updateSelectSimilarState, resetSelectSimilarState]);

  // Get available criteria based on reference element data
  const availableCriteria = React.useMemo(() => {
    if (!referenceElementData) return [];
    // Create a minimal element-like object for getAvailableCriteria
    const pseudoElement = {
      id: referenceElementData.id,
      type: referenceElementData.type,
      data: referenceElementData,
    } as CanvasElement;
    return getAvailableCriteria(pseudoElement);
  }, [referenceElementData]);

  // Check if any criteria is selected
  const hasSelectedCriteria = React.useMemo(() => {
    if (!selectSimilarState?.criteria) return false;
    return Object.values(selectSimilarState.criteria).some(value => value);
  }, [selectSimilarState?.criteria]);

  // Only render while in select mode
  if (activePlugin !== 'select') {
    return null;
  }

  const handleToggleCriterion = (criterion: string) => {
    if (!selectSimilarState?.criteria) return;

    updateSelectSimilarState?.({
      criteria: {
        ...selectSimilarState.criteria,
        [criterion]: !selectSimilarState.criteria[criterion as keyof typeof selectSimilarState.criteria],
      },
    });
  };

  const handleApply = () => {
    if (selectedIds.length !== 1) return;

    const store = useCanvasStore.getState();
    applySelectSimilar(store, selectedIds[0]);

    updateSelectSimilarState?.({ isActive: true });
  };

  const applyDisabled = !hasSelectedCriteria || !referenceElementData || availableCriteria.length === 0;

  return (
    <Panel
      title="Select Similar"
      isCollapsible
      defaultOpen={false}
      hideHeader={hideTitle}
    >
      <VStack spacing={1} align="stretch">
          {!referenceElementData ? (
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
              Select a single element to use as the reference.
            </Text>
          ) : availableCriteria.length === 0 ? (
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
              Select Similar is not available for this element.
            </Text>
          ) : (
            <>
              <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                Select elements with:
              </Text>

              {availableCriteria.map((criterion) => (
                <PanelToggle
                  key={criterion}
                  isChecked={selectSimilarState?.criteria?.[criterion as keyof typeof selectSimilarState.criteria] ?? false}
                  onChange={() => handleToggleCriterion(criterion)}
                >
                  {criteriaLabels[criterion] || criterion}
                </PanelToggle>
              ))}

              <PanelStyledButton
                onClick={handleApply}
                w="full"
                isDisabled={applyDisabled}
                mt={2}
              >
                Apply Selection
              </PanelStyledButton>
            </>
          )}
        </VStack>
    </Panel>
  );
};

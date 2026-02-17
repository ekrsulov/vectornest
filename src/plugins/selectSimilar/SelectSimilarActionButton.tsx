import React from 'react';
import { Filter } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { ToolbarIconButton } from '../../ui/ToolbarIconButton';
import type { SelectSimilarSlice } from './slice';

export const SelectSimilarActionButton: React.FC = () => {
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const elements = useCanvasStore(state => state.elements);
  const updateSelectSimilarState = useCanvasStore(
    state => (state as unknown as SelectSimilarSlice).updateSelectSimilarState
  );

  // Only show button when exactly one element is selected
  const isEnabled = selectedIds.length === 1;

  const handleClick = () => {
    if (!isEnabled) return;

    const referenceId = selectedIds[0];
    const referenceElement = elements.find(el => el.id === referenceId);

    if (!referenceElement || referenceElement.type === 'group') return;

    // Activate select similar mode
    updateSelectSimilarState?.({
      isActive: true,
      referenceElementId: referenceId,
      criteria: {
        fillColor: false,
        fillOpacity: false,
        strokeColor: false,
        strokeOpacity: false,
        strokeWidth: false,
        strokeLinecap: false,
        strokeLinejoin: false,
        strokeDasharray: false,
        elementType: false,
        width: false,
        height: false,
      },
    });

  };

  // Don't render if disabled
  // if (!isEnabled) return null;

  return (
    <ToolbarIconButton
      icon={Filter}
      label="Select Similar"
      onClick={handleClick}
      tooltip="Select Similar"
      showTooltip={true}
      isDisabled={!isEnabled}
    />
  );
};

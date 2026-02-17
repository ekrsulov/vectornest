import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { GuidelinesOverlay } from './GuidelinesOverlay';
import type { GuidelinesState } from './types';
import { useShallow } from 'zustand/react/shallow';

export const GuidelinesLayer: React.FC = () => {
    const {
        activePlugin,
        guidelines,
        isDraggingElements,
        editingPoint,
        draggingSelection,
        elements,
        selectedIds,
        viewport,
        isElementHidden,
        transformState,
        advancedTransformState,
    } = useCanvasStore(
        useShallow((state) => ({
            activePlugin: state.activePlugin,
            guidelines: (state as unknown as { guidelines: GuidelinesState }).guidelines,
            isDraggingElements: state.isDraggingElements,
            editingPoint: state.editingPoint,
            draggingSelection: state.draggingSelection,
            elements: state.elements,
            selectedIds: state.selectedIds,
            viewport: state.viewport,
            isElementHidden: state.isElementHidden,
            // Include transformation state so we can show guidelines during rotate/resize
            transformState: (state as unknown as { transformState?: { isTransforming?: boolean } }).transformState,
            advancedTransformState: (state as unknown as { advancedTransformState?: { isTransforming?: boolean } }).advancedTransformState,
        }))
    );

    // Show guidelines in select mode, edit mode, or when dragging a guide
    const isActiveMode = activePlugin === 'select' || activePlugin === 'edit';
    const isDraggingGuide = guidelines?.isDraggingGuide;
    const isAltHovering = guidelines?.isAltPressed && guidelines?.hoveredElementId;

    // Show during transform if any transform state is active
    const isTransforming = (transformState?.isTransforming ?? false) || (advancedTransformState?.isTransforming ?? false);

    if (!guidelines?.enabled) {
        return null;
    }

    // Show guidelines when:
    // 1. Dragging elements
    // 2. Dragging a guide from ruler
    // 3. Alt + hovering an element (for measurements)
    // 4. Manual guides should always be visible
    // 5. Or when a transformation (rotate/resize) is in progress
    const shouldShowDynamicGuidelines =
        (isActiveMode && (isDraggingElements || editingPoint?.isDragging || draggingSelection?.isDragging)) ||
        isDraggingGuide ||
        isAltHovering ||
        isTransforming;

    const hasManualGuides = guidelines?.manualGuidesEnabled && guidelines?.manualGuides?.length > 0;

    if (!shouldShowDynamicGuidelines && !hasManualGuides) {
        return null;
    }

    return (
        <GuidelinesOverlay
            guidelines={guidelines}
            viewport={viewport}
            elements={elements}
            isTransforming={isTransforming}
            selectedIds={selectedIds}
            isElementHidden={isElementHidden}
        />
    );
};

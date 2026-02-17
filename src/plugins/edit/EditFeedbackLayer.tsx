import React, { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useSnapStore } from '../../snap/store';
import { FeedbackOverlay } from '../../overlays';
import { useShallow } from 'zustand/react/shallow';
import type { Point } from '../../types';
import { getSnapPointLabel, type SnapPointType } from '../../utils/snapPointUtils';

/**
 * Get human-readable label for snap point type
 */


interface EditFeedbackLayerProps {
    viewport: { panX: number; panY: number; zoom: number };
    canvasSize: { width: number; height: number };
    dragPosition: Point | null;
    activePlugin: string | null;
}

export const EditFeedbackLayer: React.FC<EditFeedbackLayerProps> = ({
    viewport,
    canvasSize,
    dragPosition,
    activePlugin,
}) => {
    const { editingPoint, draggingSelection } = useCanvasStore(
        useShallow((state) => ({
            editingPoint: state.editingPoint,
            draggingSelection: state.draggingSelection,
        }))
    );

    // Get snap result from centralized snap store
    const snapResult = useSnapStore((state) => state.snapResult);

    // Calculate pointPositionFeedback for edit mode based on dragging state
    // Uses dragPosition from useCanvasDrag hook (passed via context) for real-time updates during drag
    const pointPositionFeedback = useMemo(() => {
        if (activePlugin !== 'edit') {
            return { x: 0, y: 0, visible: false };
        }

        // Show feedback when dragging a point - use dragPosition for real-time feedback
        const isEditDragging = editingPoint?.isDragging || draggingSelection?.isDragging;

        if (isEditDragging && dragPosition) {
            return {
                x: Math.round(dragPosition.x),
                y: Math.round(dragPosition.y),
                visible: true,
            };
        }

        return { x: 0, y: 0, visible: false };
    }, [activePlugin, editingPoint?.isDragging, draggingSelection?.isDragging, dragPosition]);

    // Calculate snap feedback message from snap result
    const customFeedback = useMemo(() => {
        if (!pointPositionFeedback.visible) {
            return { message: '', visible: false };
        }

        // Get snap type from centralized snap store
        if (snapResult && snapResult.snapPoints.length > 0) {
            const snapPoint = snapResult.snapPoints[0];
            // Get the original snap point from metadata (preserves original type)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const originalSnapPoint = snapPoint?.metadata?.original as any;
            const snapType = originalSnapPoint?.type || snapPoint?.type;

            if (snapType) {
                const snapLabel = getSnapPointLabel(snapType as SnapPointType);
                return {
                    message: snapLabel,
                    visible: !!snapLabel,
                };
            }
        }

        return { message: '', visible: false };
    }, [pointPositionFeedback.visible, snapResult]);

    if (!pointPositionFeedback.visible) {
        return null;
    }

    return (
        <FeedbackOverlay
            viewport={viewport}
            canvasSize={canvasSize}
            pointPositionFeedback={pointPositionFeedback}
            customFeedback={customFeedback.visible ? customFeedback : undefined}
        />
    );
};

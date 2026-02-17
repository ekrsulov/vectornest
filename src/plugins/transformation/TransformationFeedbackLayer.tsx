import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { FeedbackOverlay } from '../../overlays';
import type { TransformationPluginSlice } from './slice';
import { useShallow } from 'zustand/react/shallow';

interface TransformationFeedbackLayerProps {
    viewport: { panX: number; panY: number; zoom: number };
    canvasSize: { width: number; height: number };
}

export const TransformationFeedbackLayer: React.FC<TransformationFeedbackLayerProps> = ({
    viewport,
    canvasSize,
}) => {
    const transformFeedback = useCanvasStore(
        useShallow((state) => (state as unknown as TransformationPluginSlice).transformFeedback)
    );

    return (
        <FeedbackOverlay
            viewport={viewport}
            canvasSize={canvasSize}
            rotationFeedback={transformFeedback?.rotation}
            resizeFeedback={transformFeedback?.resize}
            customFeedback={transformFeedback?.customFeedback}
        />
    );
};

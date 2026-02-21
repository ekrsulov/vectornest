import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { BlobBrushPluginSlice } from './slice';

export const BlobBrushOverlay: React.FC = () => {
    const { brushPoints, isDrawing, brushSize, zoom, currentColor } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & BlobBrushPluginSlice).blobBrush;
            return {
                brushPoints: toolState?.brushPoints ?? [],
                isDrawing: toolState?.isDrawing ?? false,
                brushSize: toolState?.brushSize ?? 20,
                currentColor: state.activeFillColor,
                zoom: state.viewport.zoom,
            };
        })
    );

    if (!isDrawing || brushPoints.length === 0) return null;

    const pathData = brushPoints.reduce((acc, point, index) => {
        return acc + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '');

    // For a single point, just draw a circle
    if (brushPoints.length === 1) {
        return (
            <g className="blob-brush-overlay" pointerEvents="none">
                <circle
                    cx={brushPoints[0].x}
                    cy={brushPoints[0].y}
                    r={brushSize / (2 * zoom)}
                    fill={currentColor || '#000000'}
                />
            </g>
        );
    }

    return (
        <g className="blob-brush-overlay" pointerEvents="none">
            <path
                d={pathData}
                fill="none"
                stroke={currentColor || '#000000'}
                strokeWidth={brushSize / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </g>
    );
};

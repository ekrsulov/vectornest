import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { FractureToolPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const FractureToolOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { fracturePoints, isDrawing, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & FractureToolPluginSlice).fractureTool;
            return {
                fracturePoints: toolState?.fracturePoints ?? [],
                isDrawing: toolState?.isDrawing ?? false,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'fractureTool' || fracturePoints.length === 0) return null;

    const lastPoint = fracturePoints[fracturePoints.length - 1];
    const strokeColor = colorMode === 'dark' ? 'rgba(255, 120, 80, 0.7)' : 'rgba(200, 60, 30, 0.7)';

    return (
        <g className="fracture-tool-overlay" pointerEvents="none">
            {/* Fracture crosshair */}
            <line
                x1={lastPoint.x - 8 / zoom}
                y1={lastPoint.y}
                x2={lastPoint.x + 8 / zoom}
                y2={lastPoint.y}
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
            />
            <line
                x1={lastPoint.x}
                y1={lastPoint.y - 8 / zoom}
                x2={lastPoint.x}
                y2={lastPoint.y + 8 / zoom}
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
            />
            {/* Crack lines */}
            {isDrawing && (
                <>
                    <line
                        x1={lastPoint.x - 4 / zoom}
                        y1={lastPoint.y - 4 / zoom}
                        x2={lastPoint.x - 8 / zoom}
                        y2={lastPoint.y - 8 / zoom}
                        stroke={strokeColor}
                        strokeWidth={1 / zoom}
                    />
                    <line
                        x1={lastPoint.x + 4 / zoom}
                        y1={lastPoint.y + 4 / zoom}
                        x2={lastPoint.x + 8 / zoom}
                        y2={lastPoint.y + 8 / zoom}
                        stroke={strokeColor}
                        strokeWidth={1 / zoom}
                    />
                </>
            )}
        </g>
    );
};

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { CoilToolPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const CoilToolOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { coilPoints, isDrawing, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & CoilToolPluginSlice).coilTool;
            return {
                coilPoints: toolState?.coilPoints ?? [],
                isDrawing: toolState?.isDrawing ?? false,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'coilTool' || coilPoints.length === 0) return null;

    const strokeColor = colorMode === 'dark' ? 'rgba(100, 200, 255, 0.6)' : 'rgba(0, 100, 200, 0.6)';

    return (
        <g className="coil-tool-overlay" pointerEvents="none">
            {isDrawing && coilPoints.length > 1 && (
                <path
                    d={coilPoints.reduce(
                        (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
                        ''
                    )}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2 / zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                />
            )}
            {coilPoints.length > 0 && (
                <circle
                    cx={coilPoints[coilPoints.length - 1].x}
                    cy={coilPoints[coilPoints.length - 1].y}
                    r={4 / zoom}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.5 / zoom}
                />
            )}
        </g>
    );
};

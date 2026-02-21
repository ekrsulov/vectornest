import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { StarBurstPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const StarBurstOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { dragStart, isDragging, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & StarBurstPluginSlice).starBurst;
            return {
                dragStart: toolState?.dragStart ?? null,
                isDragging: toolState?.isDragging ?? false,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'starBurst' || !dragStart) return null;

    const strokeColor = colorMode === 'dark' ? 'rgba(255, 220, 80, 0.6)' : 'rgba(200, 150, 0, 0.6)';

    return (
        <g className="star-burst-overlay" pointerEvents="none">
            {/* Center indicator */}
            <circle
                cx={dragStart.x}
                cy={dragStart.y}
                r={3 / zoom}
                fill={strokeColor}
            />
            {isDragging && (
                <circle
                    cx={dragStart.x}
                    cy={dragStart.y}
                    r={6 / zoom}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.5 / zoom}
                    strokeDasharray={`${3 / zoom} ${3 / zoom}`}
                />
            )}
        </g>
    );
};

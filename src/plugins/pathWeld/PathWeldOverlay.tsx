import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { PathWeldPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const PathWeldOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { weldPoints, isWelding, weldWidth, zoom } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & PathWeldPluginSlice).pathWeld;
            return {
                weldPoints: toolState?.weldPoints ?? [],
                isWelding: toolState?.isWelding ?? false,
                weldWidth: toolState?.weldWidth ?? 4,
                zoom: state.viewport.zoom,
            };
        })
    );

    if (!isWelding || weldPoints.length < 2) return null;

    const pathData = weldPoints.reduce(
        (acc, point, index) =>
            acc + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`),
        ''
    );

    return (
        <g className="path-weld-overlay" pointerEvents="none">
            {/* Outer glow */}
            <path
                d={pathData}
                fill="none"
                stroke={colorMode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'}
                strokeWidth={(weldWidth + 4) / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Weld stroke */}
            <path
                d={pathData}
                fill="none"
                stroke={colorMode === 'light' ? '#e5740a' : '#f6a641'}
                strokeWidth={weldWidth / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </g>
    );
};

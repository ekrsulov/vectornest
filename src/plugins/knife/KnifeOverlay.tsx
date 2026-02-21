import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { KnifePluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const KnifeOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { cutPoints, isCutting, cutWidth, zoom } = useCanvasStore(
        useShallow((state) => {
            const knifeState = (state as CanvasStore & KnifePluginSlice).knife;
            return {
                cutPoints: knifeState?.cutPoints ?? [],
                isCutting: knifeState?.isCutting ?? false,
                cutWidth: knifeState?.cutWidth ?? 2,
                zoom: state.viewport.zoom,
            };
        })
    );

    if (!isCutting || cutPoints.length < 2) return null;

    // Build the SVG path string from point array
    const pathData = cutPoints.reduce((acc, point, index) => {
        return acc + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '');

    return (
        <g className="knife-overlay" pointerEvents="none">
            {/* Outer glow stroke for visibility */}
            <path
                d={pathData}
                fill="none"
                stroke={colorMode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'}
                strokeWidth={(cutWidth + 2) / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Exact cutting line */}
            <path
                d={pathData}
                fill="none"
                stroke={colorMode === 'light' ? '#3182ce' : '#63b3ed'}
                strokeWidth={cutWidth / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </g>
    );
};

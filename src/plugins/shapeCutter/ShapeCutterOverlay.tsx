import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ShapeCutterPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const ShapeCutterOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { cutterPoints, isCutting, mode, zoom } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & ShapeCutterPluginSlice).shapeCutter;
            return {
                cutterPoints: toolState?.cutterPoints ?? [],
                isCutting: toolState?.isCutting ?? false,
                mode: toolState?.mode ?? 'subtract',
                zoom: state.viewport.zoom,
            };
        })
    );

    if (!isCutting || cutterPoints.length < 2) return null;

    // Build closed shape preview
    const pathData =
        cutterPoints.reduce(
            (acc, point, index) =>
                acc + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`),
            ''
        ) + ' Z';

    const fillColor =
        mode === 'subtract'
            ? colorMode === 'light'
                ? 'rgba(229, 62, 62, 0.15)'
                : 'rgba(252, 129, 129, 0.15)'
            : colorMode === 'light'
                ? 'rgba(56, 161, 105, 0.15)'
                : 'rgba(104, 211, 145, 0.15)';

    const strokeColor =
        mode === 'subtract'
            ? colorMode === 'light'
                ? '#e53e3e'
                : '#fc8181'
            : colorMode === 'light'
                ? '#38a169'
                : '#68d391';

    return (
        <g className="shape-cutter-overlay" pointerEvents="none">
            <path
                d={pathData}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${4 / zoom} ${3 / zoom}`}
            />
        </g>
    );
};

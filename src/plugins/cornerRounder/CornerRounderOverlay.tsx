import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { CornerRounderPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const CornerRounderOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { roundPoints, isRounding, brushSize, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & CornerRounderPluginSlice).cornerRounder;
            return {
                roundPoints: toolState?.roundPoints ?? [],
                isRounding: toolState?.isRounding ?? false,
                brushSize: toolState?.brushSize ?? 20,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'cornerRounder' || roundPoints.length === 0) return null;

    const lastPoint = roundPoints[roundPoints.length - 1];
    const strokeColor = colorMode === 'dark' ? 'rgba(99, 179, 237, 0.7)' : 'rgba(49, 130, 206, 0.6)';

    return (
        <g className="corner-rounder-overlay" pointerEvents="none">
            {/* Brush radius indicator */}
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={brushSize / zoom}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${3 / zoom} ${3 / zoom}`}
            />
            {/* Trail */}
            {isRounding && roundPoints.length > 1 && (
                <path
                    d={roundPoints.reduce(
                        (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
                        ''
                    )}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2 / zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </g>
    );
};

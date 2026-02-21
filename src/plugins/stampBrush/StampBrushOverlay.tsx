import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { StampBrushPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const StampBrushOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { stampPoints, isStamping, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & StampBrushPluginSlice).stampBrush;
            return {
                stampPoints: toolState?.stampPoints ?? [],
                isStamping: toolState?.isStamping ?? false,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'stampBrush' || stampPoints.length === 0) return null;

    const lastPoint = stampPoints[stampPoints.length - 1];
    const strokeColor = colorMode === 'dark' ? 'rgba(255, 180, 100, 0.6)' : 'rgba(200, 100, 0, 0.6)';

    return (
        <g className="stamp-brush-overlay" pointerEvents="none">
            {/* Stamp cursor indicator */}
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={8 / zoom}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${3 / zoom} ${3 / zoom}`}
            />
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={2 / zoom}
                fill={strokeColor}
            />
            {/* Trail */}
            {isStamping && stampPoints.length > 1 && (
                <path
                    d={stampPoints.reduce(
                        (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
                        ''
                    )}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.5 / zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </g>
    );
};

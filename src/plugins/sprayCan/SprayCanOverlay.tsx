import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { SprayCanPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const SprayCanOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { sprayPoints, isSpraying, sprayRadius, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & SprayCanPluginSlice).sprayCan;
            return {
                sprayPoints: toolState?.sprayPoints ?? [],
                isSpraying: toolState?.isSpraying ?? false,
                sprayRadius: toolState?.sprayRadius ?? 40,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'sprayCan' || sprayPoints.length === 0) return null;

    const lastPoint = sprayPoints[sprayPoints.length - 1];
    const strokeColor = colorMode === 'dark' ? 'rgba(255, 200, 100, 0.6)' : 'rgba(200, 120, 0, 0.6)';

    return (
        <g className="spray-can-overlay" pointerEvents="none">
            {/* Spray radius indicator */}
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={sprayRadius / zoom}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${4 / zoom} ${4 / zoom}`}
            />
            {/* Spray trail */}
            {isSpraying && sprayPoints.length > 1 && (
                <path
                    d={sprayPoints.reduce(
                        (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), ''
                    )}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1 / zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </g>
    );
};

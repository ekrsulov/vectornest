import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { RoughenToolPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const RoughenToolOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { roughenPoints, isRoughening, roughenRadius, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & RoughenToolPluginSlice).roughenTool;
            return {
                roughenPoints: toolState?.roughenPoints ?? [],
                isRoughening: toolState?.isRoughening ?? false,
                roughenRadius: toolState?.roughenRadius ?? 30,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'roughenTool' || roughenPoints.length === 0) return null;

    const lastPoint = roughenPoints[roughenPoints.length - 1];
    const strokeColor = colorMode === 'dark' ? 'rgba(167, 139, 250, 0.7)' : 'rgba(124, 58, 237, 0.6)';

    return (
        <g className="roughen-tool-overlay" pointerEvents="none">
            {/* Brush radius indicator */}
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={roughenRadius / zoom}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${3 / zoom} ${3 / zoom}`}
            />
            {/* Trail */}
            {isRoughening && roughenPoints.length > 1 && (
                <path
                    d={roughenPoints.reduce(
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

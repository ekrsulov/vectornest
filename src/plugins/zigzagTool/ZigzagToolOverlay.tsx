import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ZigzagToolPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const ZigzagToolOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { zigzagPoints, isDrawing, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & ZigzagToolPluginSlice).zigzagTool;
            return {
                zigzagPoints: toolState?.zigzagPoints ?? [],
                isDrawing: toolState?.isDrawing ?? false,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'zigzagTool' || zigzagPoints.length === 0) return null;

    const strokeColor = colorMode === 'dark' ? 'rgba(100, 220, 100, 0.6)' : 'rgba(34, 139, 34, 0.6)';

    return (
        <g className="zigzag-tool-overlay" pointerEvents="none">
            {isDrawing && zigzagPoints.length > 1 && (
                <path
                    d={zigzagPoints.reduce(
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
            {/* Cursor crosshair */}
            {zigzagPoints.length > 0 && (
                <>
                    <line
                        x1={zigzagPoints[zigzagPoints.length - 1].x - 6 / zoom}
                        y1={zigzagPoints[zigzagPoints.length - 1].y}
                        x2={zigzagPoints[zigzagPoints.length - 1].x + 6 / zoom}
                        y2={zigzagPoints[zigzagPoints.length - 1].y}
                        stroke={strokeColor}
                        strokeWidth={1.5 / zoom}
                    />
                    <line
                        x1={zigzagPoints[zigzagPoints.length - 1].x}
                        y1={zigzagPoints[zigzagPoints.length - 1].y - 6 / zoom}
                        x2={zigzagPoints[zigzagPoints.length - 1].x}
                        y2={zigzagPoints[zigzagPoints.length - 1].y + 6 / zoom}
                        stroke={strokeColor}
                        strokeWidth={1.5 / zoom}
                    />
                </>
            )}
        </g>
    );
};

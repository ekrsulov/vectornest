import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ScallopToolPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const ScallopToolOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { scallopPoints, isScalloping, brushRadius, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & ScallopToolPluginSlice).scallopTool;
            return {
                scallopPoints: toolState?.scallopPoints ?? [],
                isScalloping: toolState?.isScalloping ?? false,
                brushRadius: toolState?.brushRadius ?? 30,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'scallopTool' || scallopPoints.length === 0) return null;

    const lastPoint = scallopPoints[scallopPoints.length - 1];
    const strokeColor = colorMode === 'dark' ? 'rgba(255, 180, 220, 0.6)' : 'rgba(200, 50, 120, 0.6)';

    return (
        <g className="scallop-tool-overlay" pointerEvents="none">
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={brushRadius / zoom}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${3 / zoom} ${3 / zoom}`}
            />
            {/* Wavy decoration on circle */}
            <path
                d={`M ${lastPoint.x - brushRadius * 0.6 / zoom} ${lastPoint.y} Q ${lastPoint.x - brushRadius * 0.3 / zoom} ${lastPoint.y - 3 / zoom} ${lastPoint.x} ${lastPoint.y} Q ${lastPoint.x + brushRadius * 0.3 / zoom} ${lastPoint.y + 3 / zoom} ${lastPoint.x + brushRadius * 0.6 / zoom} ${lastPoint.y}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1 / zoom}
            />
            {isScalloping && scallopPoints.length > 1 && (
                <path
                    d={scallopPoints.reduce(
                        (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
                        ''
                    )}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2 / zoom}
                    strokeLinecap="round"
                />
            )}
        </g>
    );
};

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ErodeDilatePluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const ErodeDilateOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { brushPoints, isPainting, brushRadius, mode, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & ErodeDilatePluginSlice).erodeDilate;
            return {
                brushPoints: toolState?.brushPoints ?? [],
                isPainting: toolState?.isPainting ?? false,
                brushRadius: toolState?.brushRadius ?? 30,
                mode: toolState?.mode ?? 'dilate',
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'erodeDilate' || brushPoints.length === 0) return null;

    const lastPoint = brushPoints[brushPoints.length - 1];
    const strokeColor =
        mode === 'dilate'
            ? colorMode === 'dark'
                ? 'rgba(100, 255, 100, 0.6)'
                : 'rgba(34, 139, 34, 0.6)'
            : colorMode === 'dark'
                ? 'rgba(255, 100, 100, 0.6)'
                : 'rgba(200, 50, 50, 0.6)';

    return (
        <g className="erode-dilate-overlay" pointerEvents="none">
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={brushRadius / zoom}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${3 / zoom} ${3 / zoom}`}
            />
            {/* Direction arrows */}
            {mode === 'dilate' ? (
                // Outward arrows
                <>
                    <line
                        x1={lastPoint.x}
                        y1={lastPoint.y - brushRadius * 0.5 / zoom}
                        x2={lastPoint.x}
                        y2={lastPoint.y - brushRadius * 0.8 / zoom}
                        stroke={strokeColor}
                        strokeWidth={1.5 / zoom}
                    />
                    <line
                        x1={lastPoint.x}
                        y1={lastPoint.y + brushRadius * 0.5 / zoom}
                        x2={lastPoint.x}
                        y2={lastPoint.y + brushRadius * 0.8 / zoom}
                        stroke={strokeColor}
                        strokeWidth={1.5 / zoom}
                    />
                </>
            ) : (
                // Inward arrows
                <>
                    <line
                        x1={lastPoint.x}
                        y1={lastPoint.y - brushRadius * 0.8 / zoom}
                        x2={lastPoint.x}
                        y2={lastPoint.y - brushRadius * 0.5 / zoom}
                        stroke={strokeColor}
                        strokeWidth={1.5 / zoom}
                    />
                    <line
                        x1={lastPoint.x}
                        y1={lastPoint.y + brushRadius * 0.8 / zoom}
                        x2={lastPoint.x}
                        y2={lastPoint.y + brushRadius * 0.5 / zoom}
                        stroke={strokeColor}
                        strokeWidth={1.5 / zoom}
                    />
                </>
            )}
            {isPainting && brushPoints.length > 1 && (
                <path
                    d={brushPoints.reduce(
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

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { StippleBrushPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const StippleBrushOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { stipplePoints, isStippling, brushRadius, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & StippleBrushPluginSlice).stippleBrush;
            return {
                stipplePoints: toolState?.stipplePoints ?? [],
                isStippling: toolState?.isStippling ?? false,
                brushRadius: toolState?.brushRadius ?? 30,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'stippleBrush' || stipplePoints.length === 0) return null;

    const lastPoint = stipplePoints[stipplePoints.length - 1];
    const strokeColor = colorMode === 'dark' ? 'rgba(220, 170, 255, 0.6)' : 'rgba(128, 0, 128, 0.5)';

    return (
        <g className="stipple-brush-overlay" pointerEvents="none">
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={brushRadius / zoom}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${2 / zoom} ${3 / zoom}`}
            />
            {/* Small dot indicators inside the circle */}
            {[...Array(5)].map((_, i) => {
                const angle = (i / 5) * Math.PI * 2;
                const r = (brushRadius * 0.5) / zoom;
                return (
                    <circle
                        key={i}
                        cx={lastPoint.x + r * Math.cos(angle)}
                        cy={lastPoint.y + r * Math.sin(angle)}
                        r={1.5 / zoom}
                        fill={strokeColor}
                    />
                );
            })}
            {isStippling && stipplePoints.length > 1 && (
                <path
                    d={stipplePoints.reduce(
                        (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
                        ''
                    )}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1 / zoom}
                    strokeLinecap="round"
                />
            )}
        </g>
    );
};

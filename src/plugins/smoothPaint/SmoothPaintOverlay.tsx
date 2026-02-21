import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { SmoothPaintPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const SmoothPaintOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { smoothPoints, isSmoothing, brushRadius, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & SmoothPaintPluginSlice).smoothPaint;
            return {
                smoothPoints: toolState?.smoothPoints ?? [],
                isSmoothing: toolState?.isSmoothing ?? false,
                brushRadius: toolState?.brushRadius ?? 30,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'smoothPaint' || smoothPoints.length === 0) return null;

    const lastPoint = smoothPoints[smoothPoints.length - 1];
    const strokeColor =
        colorMode === 'dark' ? 'rgba(100, 180, 255, 0.7)' : 'rgba(50, 120, 200, 0.7)';

    return (
        <g className="smooth-paint-overlay" pointerEvents="none">
            {/* Brush radius circle */}
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={brushRadius / zoom}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${3 / zoom} ${3 / zoom}`}
            />
            {/* Smooth wave indicator inside circle */}
            {!isSmoothing && (
                <path
                    d={(() => {
                        const cx = lastPoint.x;
                        const cy = lastPoint.y;
                        const r = (brushRadius / zoom) * 0.5;
                        const steps = 8;
                        const amp = r * 0.25;
                        let d = '';
                        for (let i = 0; i <= steps; i++) {
                            const t = i / steps;
                            const x = cx - r + t * 2 * r;
                            const y = cy + Math.sin(t * Math.PI * 3) * amp;
                            d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
                        }
                        return d;
                    })()}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1 / zoom}
                    opacity={0.7}
                />
            )}
            {/* Trail while smoothing */}
            {isSmoothing && smoothPoints.length > 1 && (
                <path
                    d={smoothPoints.reduce(
                        (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
                        ''
                    )}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.5 / zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.6}
                />
            )}
        </g>
    );
};

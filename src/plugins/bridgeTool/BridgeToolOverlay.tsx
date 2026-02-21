import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { BridgeToolPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const BridgeToolOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { bridgePoints, isDrawing, bridgeWidth, zoom, activePlugin } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & BridgeToolPluginSlice).bridgeTool;
            return {
                bridgePoints: toolState?.bridgePoints ?? [],
                isDrawing: toolState?.isDrawing ?? false,
                bridgeWidth: toolState?.bridgeWidth ?? 8,
                zoom: state.viewport.zoom,
                activePlugin: state.activePlugin,
            };
        })
    );

    if (activePlugin !== 'bridgeTool' || bridgePoints.length === 0) return null;

    const lastPoint = bridgePoints[bridgePoints.length - 1];
    const strokeColor = colorMode === 'dark' ? 'rgba(100, 200, 150, 0.7)' : 'rgba(34, 139, 90, 0.7)';

    return (
        <g className="bridge-tool-overlay" pointerEvents="none">
            {/* Bridge width indicator */}
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={bridgeWidth / (2 * zoom)}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${3 / zoom} ${3 / zoom}`}
            />
            {/* Bridge trail with width preview */}
            {isDrawing && bridgePoints.length > 1 && (
                <>
                    <path
                        d={bridgePoints.reduce(
                            (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
                            ''
                        )}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={bridgeWidth / zoom}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.3}
                    />
                    <path
                        d={bridgePoints.reduce(
                            (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
                            ''
                        )}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={1.5 / zoom}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </>
            )}
        </g>
    );
};

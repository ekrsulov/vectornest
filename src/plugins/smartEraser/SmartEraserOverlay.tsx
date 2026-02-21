import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { SmartEraserPluginSlice } from './slice';
import { useColorMode } from '@chakra-ui/react';

export const SmartEraserOverlay: React.FC = () => {
    const { colorMode } = useColorMode();
    const { eraserPoints, isErasing, eraserSize, zoom } = useCanvasStore(
        useShallow((state) => {
            const toolState = (state as CanvasStore & SmartEraserPluginSlice).smartEraser;
            return {
                eraserPoints: toolState?.eraserPoints ?? [],
                isErasing: toolState?.isErasing ?? false,
                eraserSize: toolState?.eraserSize ?? 20,
                zoom: state.viewport.zoom,
            };
        })
    );

    // Track mouse to show the eraser circle even when not erasing
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

    useEffect(() => {
        // We get the pointer from the store context during tool operation,
        // but the overlay itself might just use the latest point in the array.
        if (eraserPoints.length > 0) {
            setMousePos(eraserPoints[eraserPoints.length - 1]);
        }
    }, [eraserPoints]);

    if (!isErasing && !mousePos) return null;

    const pathData = eraserPoints.reduce((acc, point, index) => {
        return acc + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '');

    return (
        <g className="smart-eraser-overlay" pointerEvents="none">
            {/* Eraser Trail */}
            {isErasing && eraserPoints.length > 1 && (
                <path
                    d={pathData}
                    fill="none"
                    stroke={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.2)'}
                    strokeWidth={eraserSize / zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}

            {/* Eraser Head (Circle) */}
            {(isErasing && mousePos) && (
                <circle
                    cx={mousePos.x}
                    cy={mousePos.y}
                    r={eraserSize / (2 * zoom)}
                    fill="none"
                    stroke={colorMode === 'dark' ? '#fc8181' : '#e53e3e'} // Red 500 equivalent
                    strokeWidth={2 / zoom}
                />
            )}
        </g>
    );
};

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { PerspectiveGridPluginSlice } from './slice';

export const PerspectiveGridLayer: React.FC = () => {
    const { enabled, mode, vp1, vp2, vp3, horizonY, gridDensity, zoom, panX, panY, viewWidth, viewHeight } = useCanvasStore(
        useShallow((state) => {
            const pGrid = (state as CanvasStore & PerspectiveGridPluginSlice).perspectiveGrid;
            return {
                enabled: pGrid?.enabled ?? false,
                mode: pGrid?.mode ?? '2-point',
                vp1: pGrid?.vp1 ?? { x: 200, y: 400 },
                vp2: pGrid?.vp2 ?? { x: 800, y: 400 },
                vp3: pGrid?.vp3 ?? { x: 500, y: -200 },
                horizonY: pGrid?.horizonY ?? 400,
                gridDensity: pGrid?.gridDensity ?? 10,
                zoom: state.viewport.zoom,
                panX: state.viewport.panX,
                panY: state.viewport.panY,
                viewWidth: state.canvasSize.width,
                viewHeight: state.canvasSize.height,
            };
        })
    );

    const lines = useMemo(() => {
        if (!enabled) return [];

        // Convert viewport corners to canvas coordinates to know how far to draw lines
        const left = -panX / zoom;
        const right = (viewWidth - panX) / zoom;
        const top = -panY / zoom;
        const bottom = (viewHeight - panY) / zoom;

        // An arbitrary far distance to draw rays out to
        const rayLength = Math.max(right - left, bottom - top) * 3;

        const generatedLines: { x1: number, y1: number, x2: number, y2: number, color: string }[] = [];

        // Helper to draw rays from a point
        const addRays = (originX: number, originY: number, color: string, isVertical = false) => {
            // Draw rays in a cone. We'll draw 180 degrees.
            const startAngle = isVertical ? 0 : Math.PI;
            const endAngle = isVertical ? Math.PI : Math.PI * 2; // For vp1 it's to the right, vp2 to the left

            const angleStep = Math.PI / gridDensity;

            for (let a = startAngle; a < endAngle; a += angleStep) {
                // Skip exactly horizontal/vertical lines if they clash with horizon
                if (Math.abs(a - Math.PI) < 0.01 || Math.abs(a - Math.PI * 2) < 0.01) continue;

                generatedLines.push({
                    x1: originX,
                    y1: originY,
                    x2: originX + Math.cos(a) * rayLength,
                    y2: originY + Math.sin(a) * rayLength,
                    color
                });
            }
        };

        // Draw Horizon
        generatedLines.push({
            x1: left - 1000,
            y1: horizonY,
            x2: right + 1000,
            y2: horizonY,
            color: 'rgba(0, 150, 255, 0.8)'
        });

        if (mode === '1-point') {
            addRays(vp1.x, vp1.y, 'rgba(0, 150, 255, 0.2)');
        } else if (mode === '2-point') {
            // vp1 is usually left, draw rays towards right
            for (let a = -Math.PI / 2 + 0.1; a < Math.PI / 2 - 0.1; a += Math.PI / gridDensity) {
                generatedLines.push({
                    x1: vp1.x, y1: horizonY,
                    x2: vp1.x + Math.cos(a) * rayLength, y2: horizonY + Math.sin(a) * rayLength,
                    color: 'rgba(0, 150, 255, 0.2)'
                });
            }
            // vp2 is usually right, draw rays towards left
            for (let a = Math.PI / 2 + 0.1; a < Math.PI * 1.5 - 0.1; a += Math.PI / gridDensity) {
                generatedLines.push({
                    x1: vp2.x, y1: horizonY,
                    x2: vp2.x + Math.cos(a) * rayLength, y2: horizonY + Math.sin(a) * rayLength,
                    color: 'rgba(255, 100, 0, 0.2)'
                });
            }
        } else if (mode === '3-point') {
            // 3 point adds vp3
            addRays(vp1.x, vp1.y, 'rgba(0, 150, 255, 0.2)');
            addRays(vp2.x, vp2.y, 'rgba(255, 100, 0, 0.2)');
            addRays(vp3.x, vp3.y, 'rgba(100, 255, 100, 0.2)', true);
        }

        return generatedLines;
    }, [enabled, mode, vp1, vp2, vp3, horizonY, gridDensity, zoom, panX, panY, viewWidth, viewHeight]);

    if (!enabled || lines.length === 0) return null;

    return (
        <g className="perspective-grid-layer" pointerEvents="none">
            {lines.map((line, i) => (
                <line
                    key={i}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={line.color}
                    strokeWidth={1 / zoom}
                />
            ))}
            {/* Render VP Handles */}
            {mode === '1-point' && (
                <circle cx={vp1.x} cy={vp1.y} r={6 / zoom} fill="white" stroke="#3182ce" strokeWidth={2 / zoom} pointerEvents="all" data-vp="vp1" cursor="move" />
            )}
            {mode !== '1-point' && (
                <>
                    <circle cx={vp1.x} cy={horizonY} r={6 / zoom} fill="white" stroke="#3182ce" strokeWidth={2 / zoom} pointerEvents="all" data-vp="vp1" cursor="move" />
                    <circle cx={vp2.x} cy={horizonY} r={6 / zoom} fill="white" stroke="#dd6b20" strokeWidth={2 / zoom} pointerEvents="all" data-vp="vp2" cursor="move" />
                </>
            )}
            {mode === '3-point' && (
                <circle cx={vp3.x} cy={vp3.y} r={6 / zoom} fill="white" stroke="#38a169" strokeWidth={2 / zoom} pointerEvents="all" data-vp="vp3" cursor="move" />
            )}
        </g>
    );
};

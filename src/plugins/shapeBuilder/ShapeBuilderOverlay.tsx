import React, { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { ShapeBuilderSlice } from './slice';
import { commandsToString } from '../../utils/path/parsing';

interface ShapeBuilderOverlayProps {
    viewport: { zoom: number; panX: number; panY: number };
}

/**
 * Overlay component that renders visual feedback for Shape Builder regions.
 * Shows:
 * - All detected regions with subtle outlines
 * - Hovered region with dotted fill highlight
 * - Drag path visualization
 * - Selected regions during drag
 */
export const ShapeBuilderOverlay: React.FC<ShapeBuilderOverlayProps> = ({ viewport }) => {
    const shapeBuilder = useCanvasStore(
        state => (state as unknown as ShapeBuilderSlice).shapeBuilder
    );

    const hoveredRegionId = shapeBuilder?.hoveredRegionId ?? null;
    const isDragging = shapeBuilder?.isDragging ?? false;
    const mode = shapeBuilder?.mode ?? 'merge';

    // Memoize regions to prevent recreation
    const regions = useMemo(() => shapeBuilder?.regions ?? [], [shapeBuilder?.regions]);
    const selectedRegionIds = useMemo(() => shapeBuilder?.selectedRegionIds ?? [], [shapeBuilder?.selectedRegionIds]);
    const dragPath = useMemo(() => shapeBuilder?.dragPath ?? [], [shapeBuilder?.dragPath]);

    // Generate SVG paths for all regions
    const regionPaths = useMemo(() => {
        return regions.map(region => {
            // Flatten subPaths and convert to d string
            const commands = region.pathData.subPaths.flat();
            const d = commandsToString(commands);
            return {
                id: region.id,
                d,
                isHovered: region.id === hoveredRegionId,
                isSelected: selectedRegionIds.includes(region.id),
            };
        });
    }, [regions, hoveredRegionId, selectedRegionIds]);

    // Generate drag path visualization
    const dragPathD = useMemo(() => {
        if (dragPath.length < 2) return '';
        return dragPath.map((p, i) =>
            i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
        ).join(' ');
    }, [dragPath]);

    if (regions.length === 0) return null;

    // Colors based on mode
    const hoverFill = mode === 'merge' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    const selectedFill = mode === 'merge' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)';
    const strokeColor = mode === 'merge' ? '#3b82f6' : '#ef4444';

    return (
        // No manual transform needed - the canvas viewBox already applies pan/zoom
        <g className="shape-builder-overlay">
            {/* Base region outlines */}
            {regionPaths.map(({ id, d }) => (
                <path
                    key={`region-outline-${id}`}
                    d={d}
                    fill="none"
                    stroke="rgba(100, 100, 100, 0.4)"
                    strokeWidth={1 / viewport.zoom}
                    strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
                    pointerEvents="none"
                />
            ))}

            {/* Hovered region highlight */}
            {regionPaths.filter(r => r.isHovered && !r.isSelected).map(({ id, d }) => (
                <path
                    key={`region-hover-${id}`}
                    d={d}
                    fill={hoverFill}
                    stroke={strokeColor}
                    strokeWidth={2 / viewport.zoom}
                    strokeDasharray={`${6 / viewport.zoom} ${3 / viewport.zoom}`}
                    pointerEvents="none"
                />
            ))}

            {/* Selected regions during drag */}
            {regionPaths.filter(r => r.isSelected).map(({ id, d }) => (
                <path
                    key={`region-selected-${id}`}
                    d={d}
                    fill={selectedFill}
                    stroke={strokeColor}
                    strokeWidth={2 / viewport.zoom}
                    pointerEvents="none"
                />
            ))}

            {/* Drag path visualization */}
            {isDragging && dragPathD && (
                <path
                    d={dragPathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={3 / viewport.zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.7}
                    pointerEvents="none"
                />
            )}
        </g>
    );
};

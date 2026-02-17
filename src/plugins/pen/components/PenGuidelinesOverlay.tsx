import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import type { CanvasLayerContext } from '../../../types/plugins';
import { useCanvasStore } from '../../../store/canvasStore';
import type { PenGuidelineMatch } from '../utils/penGuidelines';

/**
 * Overlay component that renders pen tool guidelines
 * Shows alignment lines and distance rulers when moving anchor points
 */
export const PenGuidelinesOverlay: React.FC<{ context: CanvasLayerContext }> = ({ context }) => {
    const { viewport } = context;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const penState = useCanvasStore((state) => (state as any).pen);
    
    const guidelineColor = useColorModeValue('#FF00FF', '#FF00FF'); // Magenta
    const labelBgColor = useColorModeValue('rgba(255, 255, 255, 0.9)', 'rgba(26, 32, 44, 0.9)');
    const labelTextColor = useColorModeValue('#333', '#EEE');
    
    if (!penState?.activeGuidelines) {
        return null;
    }
    
    const { horizontal, vertical } = penState.activeGuidelines as {
        horizontal: PenGuidelineMatch | null;
        vertical: PenGuidelineMatch | null;
    };
    
    if (!horizontal && !vertical) {
        return null;
    }
    
    const strokeWidth = 1 / viewport.zoom;
    const dashArray = `${4 / viewport.zoom} ${4 / viewport.zoom}`;
    const fontSize = 10 / viewport.zoom;
    const labelPadding = 4 / viewport.zoom;
    const dotRadius = 3 / viewport.zoom;
    
    // Calculate canvas bounds for guidelines
    const canvasExtent = 50000; // Large enough to cover the canvas
    
    // Get current point position for distance calculation
    const currentPoint = penState.dragState?.currentPoint || penState.previewAnchor?.position;
    
    return (
        <g className="pen-guidelines-overlay">
            {/* Horizontal guideline (aligns Y) */}
            {horizontal && (
                <g>
                    {/* Guideline */}
                    <line
                        x1={-canvasExtent}
                        y1={horizontal.guideline.position}
                        x2={canvasExtent}
                        y2={horizontal.guideline.position}
                        stroke={guidelineColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashArray}
                        opacity={0.8}
                    />
                    
                    {/* Reference point indicator */}
                    <circle
                        cx={horizontal.guideline.referencePoint.position.x}
                        cy={horizontal.guideline.referencePoint.position.y}
                        r={dotRadius}
                        fill={guidelineColor}
                        opacity={0.8}
                    />
                    
                    {/* Distance label if there's horizontal distance */}
                    {currentPoint && horizontal.guideline.distance > 1 && (
                        <g>
                            {/* Distance line */}
                            <line
                                x1={horizontal.guideline.referencePoint.position.x}
                                y1={horizontal.guideline.position}
                                x2={currentPoint.x}
                                y2={horizontal.guideline.position}
                                stroke={guidelineColor}
                                strokeWidth={strokeWidth}
                                opacity={0.6}
                            />
                            
                            {/* Distance label */}
                            <g transform={`translate(${(horizontal.guideline.referencePoint.position.x + currentPoint.x) / 2}, ${horizontal.guideline.position - labelPadding * 2})`}>
                                <rect
                                    x={-20 / viewport.zoom}
                                    y={-fontSize / 2 - labelPadding}
                                    width={40 / viewport.zoom}
                                    height={fontSize + labelPadding * 2}
                                    fill={labelBgColor}
                                    rx={2 / viewport.zoom}
                                />
                                <text
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={fontSize}
                                    fill={labelTextColor}
                                    fontFamily="system-ui, sans-serif"
                                >
                                    {Math.round(horizontal.guideline.distance)}
                                </text>
                            </g>
                        </g>
                    )}
                </g>
            )}
            
            {/* Vertical guideline (aligns X) */}
            {vertical && (
                <g>
                    {/* Guideline */}
                    <line
                        x1={vertical.guideline.position}
                        y1={-canvasExtent}
                        x2={vertical.guideline.position}
                        y2={canvasExtent}
                        stroke={guidelineColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashArray}
                        opacity={0.8}
                    />
                    
                    {/* Reference point indicator */}
                    <circle
                        cx={vertical.guideline.referencePoint.position.x}
                        cy={vertical.guideline.referencePoint.position.y}
                        r={dotRadius}
                        fill={guidelineColor}
                        opacity={0.8}
                    />
                    
                    {/* Distance label if there's vertical distance */}
                    {currentPoint && vertical.guideline.distance > 1 && (
                        <g>
                            {/* Distance line */}
                            <line
                                x1={vertical.guideline.position}
                                y1={vertical.guideline.referencePoint.position.y}
                                x2={vertical.guideline.position}
                                y2={currentPoint.y}
                                stroke={guidelineColor}
                                strokeWidth={strokeWidth}
                                opacity={0.6}
                            />
                            
                            {/* Distance label */}
                            <g transform={`translate(${vertical.guideline.position + labelPadding * 2}, ${(vertical.guideline.referencePoint.position.y + currentPoint.y) / 2})`}>
                                <rect
                                    x={-labelPadding}
                                    y={-fontSize / 2 - labelPadding}
                                    width={40 / viewport.zoom}
                                    height={fontSize + labelPadding * 2}
                                    fill={labelBgColor}
                                    rx={2 / viewport.zoom}
                                />
                                <text
                                    x={20 / viewport.zoom - labelPadding}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={fontSize}
                                    fill={labelTextColor}
                                    fontFamily="system-ui, sans-serif"
                                >
                                    {Math.round(vertical.guideline.distance)}
                                </text>
                            </g>
                        </g>
                    )}
                </g>
            )}
        </g>
    );
};

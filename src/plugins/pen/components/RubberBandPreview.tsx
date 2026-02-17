import React from 'react';
import type { CanvasLayerContext } from '../../../types/plugins';
import { useCanvasStore } from '../../../store/canvasStore';
import type { PenAnchorPoint } from '../types';
import type { Point } from '../../../types';

/**
 * Helper component to render a handle length label
 */
const HandleLengthLabel: React.FC<{
    x: number;
    y: number;
    length: number;
    zoom: number;
    opacity?: number;
}> = ({ x, y, length, zoom, opacity = 1 }) => {
    const fontSize = 9 / zoom;
    const labelPadding = 3 / zoom;
    const labelWidth = 32 / zoom;
    const labelHeight = fontSize + labelPadding * 2;
    
    return (
        <g transform={`translate(${x}, ${y})`} opacity={opacity}>
            <rect
                x={-labelWidth / 2}
                y={-labelHeight / 2}
                width={labelWidth}
                height={labelHeight}
                fill="rgba(59, 130, 246, 0.9)"
                rx={2 / zoom}
            />
            <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill="#ffffff"
                fontFamily="system-ui, sans-serif"
                fontWeight="500"
            >
                {Math.round(length)}
            </text>
        </g>
    );
};

/**
 * Build SVG path data for a segment (from start to end with handles)
 */
function buildSegmentPathData(
    startPos: Point,
    startOutHandle: Point | null,
    endPos: Point,
    endInHandle: Point | null
): string {
    // Control point 1: start position's outHandle
    const cp1 = startOutHandle
        ? { x: startPos.x + startOutHandle.x, y: startPos.y + startOutHandle.y }
        : startPos;
    
    // Control point 2: end position's inHandle
    const cp2 = endInHandle
        ? { x: endPos.x + endInHandle.x, y: endPos.y + endInHandle.y }
        : endPos;
    
    // Check if it's a straight line (no handles or handles at anchor positions)
    const hasStartHandle = startOutHandle && (startOutHandle.x !== 0 || startOutHandle.y !== 0);
    const hasEndHandle = endInHandle && (endInHandle.x !== 0 || endInHandle.y !== 0);
    
    if (!hasStartHandle && !hasEndHandle) {
        return `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`;
    }
    
    return `M ${startPos.x} ${startPos.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${endPos.x} ${endPos.y}`;
}

/**
 * Render a preview of the current segment being constructed (Rubber Band)
 * Only shows the last segment (from last anchor to cursor), since previous segments
 * are already materialized as actual path elements.
 * When closing the path, considers the first anchor's inHandle for accurate preview.
 */
export const RubberBandPreview: React.FC<{ context: CanvasLayerContext }> = ({ context }) => {
    const { viewport } = context;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const penState = useCanvasStore((state) => (state as any).pen);


    if (!penState) {
        return null;
    }

    // Only render during drawing mode
    if (penState.mode !== 'drawing') {
        return null;
    }

    if (!penState.rubberBandEnabled || !penState.currentPath || !penState.currentPath.anchors || penState.currentPath.anchors.length === 0) {
        return null;
    }

    const { currentPath, previewAnchor, dragState, cursorState } = penState;
    const anchors = currentPath.anchors as PenAnchorPoint[];
    const isFirstPoint = anchors.length === 1;
    const lastAnchor = anchors[anchors.length - 1];
    const firstAnchor = anchors[0];

    // Check if we're about to close the path (hovering over first anchor)
    const isClosingPath = cursorState === 'close';

    // Check if we're in a drag gesture with handles
    const isDraggingNewAnchor = dragState && dragState.type === 'new-anchor';
    
    // Check if the drag is happening at the first anchor position (defining first point handles)
    const isDefiningFirstPointHandles = isDraggingNewAnchor && isFirstPoint && 
        dragState.startPoint &&
        Math.abs(dragState.startPoint.x - lastAnchor.position.x) < 1 &&
        Math.abs(dragState.startPoint.y - lastAnchor.position.y) < 1;
    
    // Determine preview endpoint and handle vectors
    let previewEnd = previewAnchor?.position;
    let handleVector = { x: 0, y: 0 };

    if (isDraggingNewAnchor) {
        previewEnd = dragState.startPoint;

        if (dragState.outHandle) {
            handleVector = dragState.outHandle;
        } else {
            handleVector = {
                x: dragState.currentPoint.x - dragState.startPoint.x,
                y: dragState.currentPoint.y - dragState.startPoint.y,
            };
        }
    }

    // If closing path, preview end is the first anchor position
    if (isClosingPath && !isDraggingNewAnchor) {
        previewEnd = firstAnchor.position;
    }

    // If defining first point handles, show only handles (no rubber band yet)
    // If NOT defining first point handles but also no preview position, show nothing
    if (!previewEnd && !isDefiningFirstPointHandles) {
        return null;
    }

    const strokeWidth = 1 / viewport.zoom;
    const handleStrokeWidth = 1 / viewport.zoom;

    // Determine handles to render
    const outHandle = handleVector;
    const inHandle = dragState?.inHandle || { x: -handleVector.x, y: -handleVector.y };
    const handleMagnitude = Math.sqrt(handleVector.x ** 2 + handleVector.y ** 2);

    // For first point handles only (when defining handles at first anchor)
    if (isDefiningFirstPointHandles) {
        if (handleMagnitude <= 2) {
            return null;
        }

        const anchorPos = dragState.startPoint;
        const inHandleMagnitude = Math.sqrt(inHandle.x ** 2 + inHandle.y ** 2);
        
        const outLabelPos = {
            x: anchorPos.x + outHandle.x / 2,
            y: anchorPos.y + outHandle.y / 2,
        };
        const inLabelPos = {
            x: anchorPos.x + inHandle.x / 2,
            y: anchorPos.y + inHandle.y / 2,
        };
        
        return (
            <g opacity={0.5}>
                {/* Handle line being dragged (outHandle) */}
                <line
                    x1={anchorPos.x}
                    y1={anchorPos.y}
                    x2={anchorPos.x + outHandle.x}
                    y2={anchorPos.y + outHandle.y}
                    stroke="#3b82f6"
                    strokeWidth={handleStrokeWidth}
                    fill="none"
                />

                {/* Handle endpoint (outHandle) */}
                <circle
                    cx={anchorPos.x + outHandle.x}
                    cy={anchorPos.y + outHandle.y}
                    r={3 / viewport.zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={handleStrokeWidth}
                />
                
                {/* OutHandle length label */}
                {penState.showHandleDistance && (
                    <HandleLengthLabel
                        x={outLabelPos.x}
                        y={outLabelPos.y}
                        length={handleMagnitude}
                        zoom={viewport.zoom}
                    />
                )}

                {/* Reflexive Handle line (inHandle) */}
                <line
                    x1={anchorPos.x}
                    y1={anchorPos.y}
                    x2={anchorPos.x + inHandle.x}
                    y2={anchorPos.y + inHandle.y}
                    stroke="#3b82f6"
                    strokeWidth={handleStrokeWidth}
                    fill="none"
                    opacity={0.7}
                />

                {/* Reflexive Handle endpoint (inHandle) */}
                <circle
                    cx={anchorPos.x + inHandle.x}
                    cy={anchorPos.y + inHandle.y}
                    r={3 / viewport.zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={handleStrokeWidth}
                    opacity={0.7}
                />
                
                {/* InHandle length label */}
                {penState.showHandleDistance && (
                    <HandleLengthLabel
                        x={inLabelPos.x}
                        y={inLabelPos.y}
                        length={inHandleMagnitude}
                        zoom={viewport.zoom}
                        opacity={0.7}
                    />
                )}

                {/* Anchor point */}
                <circle
                    cx={anchorPos.x}
                    cy={anchorPos.y}
                    r={4 / viewport.zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={strokeWidth}
                />
            </g>
        );
    }

    // For subsequent points: show only the current segment being constructed
    if (!previewEnd) {
        return null;
    }

    // Determine the inHandle for the preview endpoint
    // - If dragging with handles: use the calculated inHandle
    // - If closing path (hovering over first anchor): use first anchor's inHandle
    // - Otherwise: no inHandle (straight line)
    let previewInHandle: Point | null = null;
    if (isDraggingNewAnchor && handleMagnitude > 2) {
        previewInHandle = inHandle;
    } else if (isClosingPath && !isDraggingNewAnchor && firstAnchor.inHandle) {
        // When closing, the "end" of the segment is the first anchor, so use its inHandle
        previewInHandle = firstAnchor.inHandle;
    }

    // Build the segment path data (only the current segment)
    const segmentPathData = buildSegmentPathData(
        lastAnchor.position,
        lastAnchor.outHandle || null,
        previewEnd,
        previewInHandle
    );

    return (
        <g opacity={0.5}>
            {/* Current segment preview */}
            {segmentPathData && (
                <path
                    d={segmentPathData}
                    stroke="#3b82f6"
                    strokeWidth={strokeWidth * 2}
                    strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
                    fill="none"
                />
            )}

            {/* Show handle visuals only when dragging */}
            {isDraggingNewAnchor && handleMagnitude > 2 && (
                <>
                    {/* Handle line being dragged (outHandle) */}
                    <line
                        x1={previewEnd.x}
                        y1={previewEnd.y}
                        x2={previewEnd.x + outHandle.x}
                        y2={previewEnd.y + outHandle.y}
                        stroke="#3b82f6"
                        strokeWidth={handleStrokeWidth}
                        fill="none"
                    />

                    {/* Handle endpoint (outHandle) */}
                    <circle
                        cx={previewEnd.x + outHandle.x}
                        cy={previewEnd.y + outHandle.y}
                        r={3 / viewport.zoom}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={handleStrokeWidth}
                    />
                    
                    {/* OutHandle length label */}
                    {penState.showHandleDistance && (
                        <HandleLengthLabel
                            x={previewEnd.x + outHandle.x / 2}
                            y={previewEnd.y + outHandle.y / 2}
                            length={handleMagnitude}
                            zoom={viewport.zoom}
                        />
                    )}

                    {/* Reflexive Handle line (inHandle) */}
                    <line
                        x1={previewEnd.x}
                        y1={previewEnd.y}
                        x2={previewEnd.x + inHandle.x}
                        y2={previewEnd.y + inHandle.y}
                        stroke="#3b82f6"
                        strokeWidth={handleStrokeWidth}
                        fill="none"
                        opacity={0.7}
                    />

                    {/* Reflexive Handle endpoint (inHandle) */}
                    <circle
                        cx={previewEnd.x + inHandle.x}
                        cy={previewEnd.y + inHandle.y}
                        r={3 / viewport.zoom}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={handleStrokeWidth}
                        opacity={0.7}
                    />
                    
                    {/* InHandle length label */}
                    {penState.showHandleDistance && (() => {
                        const inHandleMag = Math.sqrt(inHandle.x ** 2 + inHandle.y ** 2);
                        return (
                            <HandleLengthLabel
                                x={previewEnd.x + inHandle.x / 2}
                                y={previewEnd.y + inHandle.y / 2}
                                length={inHandleMag}
                                zoom={viewport.zoom}
                                opacity={0.7}
                            />
                        );
                    })()}
                </>
            )}

            {/* Preview anchor point - only show if not closing to first anchor */}
            {!isClosingPath && (
                <circle
                    cx={previewEnd.x}
                    cy={previewEnd.y}
                    r={4 / viewport.zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={strokeWidth}
                />
            )}
        </g>
    );
};

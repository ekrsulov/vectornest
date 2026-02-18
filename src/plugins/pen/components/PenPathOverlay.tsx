import React from 'react';
import type { CanvasLayerContext } from '../../../types/plugins';
import { useCanvasStore } from '../../../store/canvasStore';
import { pathDataToPenPath } from '../utils/pathConverter';
import { deriveElementSelectionColors } from '../../../utils/canvasColorUtils';
import type { PathData } from '../../../types';
import { toWorldPenPath } from '../utils/penPathTransforms';

/**
 * Render anchors and handles of the current path being drawn
 */
export const PenPathOverlay: React.FC<{ context: CanvasLayerContext }> = ({ context }) => {
    const { viewport } = context;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const penState = useCanvasStore((state) => (state as any).pen);
    const elements = useCanvasStore((state) => state.elements);


    if (!penState) {
        return null;
    }

    const strokeWidth = 1 / viewport.zoom;
    const anchorRadius = 4 / viewport.zoom;
    const handleRadius = 3 / viewport.zoom;

    return (
        <g>
            {/* Render hover feedback for paths in idle/editing mode */}
            {(penState.mode === 'idle' || penState.mode === 'editing') && penState.hoverTarget?.pathId && (
                <>
                    {(() => {
                        const hoveredElement = elements.find(el => el.id === penState.hoverTarget.pathId);
                        if (!hoveredElement || hoveredElement.type !== 'path') return null;

                        const pathData = hoveredElement.data as PathData;
                        const subPathIndex = penState.hoverTarget.subPathIndex ?? 0;
                        const subPath = pathData.subPaths?.[subPathIndex];
                        if (!subPath) return null;

                        const localPenPath = pathDataToPenPath(subPath, hoveredElement.id);
                        const penPath = toWorldPenPath(localPenPath, hoveredElement.id, elements);
                        if (!penPath || penPath.anchors.length === 0) return null;

                        // Get contrasting color based on element's stroke/fill
                        const { selectionColor } = deriveElementSelectionColors(hoveredElement);

                        return (
                            <g opacity={0.6}>
                                {/* Render hovered path anchors - Diamond for L-type (corner without handles), Circle for others */}
                                {penPath.anchors.map((anchor: typeof penPath.anchors[0], index: number) => (
                                    anchor.type === 'corner' && !anchor.inHandle && !anchor.outHandle ? (
                                        <polygon
                                            key={`hover-anchor-${index}`}
                                            points={`${anchor.position.x},${anchor.position.y - anchorRadius * 1.5} ${anchor.position.x + anchorRadius * 1.5},${anchor.position.y} ${anchor.position.x},${anchor.position.y + anchorRadius * 1.5} ${anchor.position.x - anchorRadius * 1.5},${anchor.position.y}`}
                                            fill={selectionColor}
                                            stroke="#ffffff"
                                            strokeWidth={strokeWidth}
                                        />
                                    ) : (
                                        <circle
                                            key={`hover-anchor-${index}`}
                                            cx={anchor.position.x}
                                            cy={anchor.position.y}
                                            r={anchorRadius * 1.2}
                                            fill={selectionColor}
                                            stroke="#ffffff"
                                            strokeWidth={strokeWidth}
                                        />
                                    )
                                ))}
                            </g>
                        );
                    })()}
                </>
            )}

            {/* Visual indicator for close path */}
            {penState.mode === 'drawing' && penState.cursorState === 'close' && penState.currentPath && (() => {
                const anchors = penState.currentPath!.anchors;
                const hasHandles = anchors.some((a: typeof anchors[0]) => a.inHandle || a.outHandle);
                return anchors.length >= 3 || (anchors.length === 2 && hasHandles);
            })() && (
                    <>
                        {/* Pulsing ring around first anchor to indicate close action */}
                        <circle
                            cx={penState.currentPath.anchors[0].position.x}
                            cy={penState.currentPath.anchors[0].position.y}
                            r={anchorRadius * 2.5}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth={strokeWidth * 2}
                            opacity={0.8}
                        >
                            <animate
                                attributeName="r"
                                values={`${anchorRadius * 2};${anchorRadius * 3};${anchorRadius * 2}`}
                                dur="1s"
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="opacity"
                                values="0.8;0.4;0.8"
                                dur="1s"
                                repeatCount="indefinite"
                            />
                        </circle>
                    </>
                )}

            {/* Render current path being drawn/edited */}
            {(penState.mode === 'drawing' || penState.mode === 'editing') && penState.currentPath && penState.currentPath.anchors && penState.currentPath.anchors.length > 0 && (
                <>
                    {/* Render anchors */}
                    {penState.currentPath.anchors.map((anchor: typeof penState.currentPath.anchors[0], index: number) => {
                        const isFirst = index === 0;
                        const isLast = index === penState.currentPath.anchors.length - 1;

                        return (
                            <g key={anchor.id}>
                                {/* Render handles for curved anchors */}
                                {anchor.inHandle && (
                                    <>
                                        <line
                                            x1={anchor.position.x}
                                            y1={anchor.position.y}
                                            x2={anchor.position.x + anchor.inHandle.x}
                                            y2={anchor.position.y + anchor.inHandle.y}
                                            stroke="#3b82f6"
                                            strokeWidth={strokeWidth}
                                            opacity={0.7}
                                        />
                                        <rect
                                            x={anchor.position.x + anchor.inHandle.x - handleRadius}
                                            y={anchor.position.y + anchor.inHandle.y - handleRadius}
                                            width={handleRadius * 2}
                                            height={handleRadius * 2}
                                            fill="#3b82f6"
                                            stroke="#ffffff"
                                            strokeWidth={strokeWidth}
                                            opacity={0.7}
                                        />
                                    </>
                                )}

                                {anchor.outHandle && (
                                    <>
                                        <line
                                            x1={anchor.position.x}
                                            y1={anchor.position.y}
                                            x2={anchor.position.x + anchor.outHandle.x}
                                            y2={anchor.position.y + anchor.outHandle.y}
                                            stroke="#3b82f6"
                                            strokeWidth={strokeWidth}
                                            opacity={0.7}
                                        />
                                        <rect
                                            x={anchor.position.x + anchor.outHandle.x - handleRadius}
                                            y={anchor.position.y + anchor.outHandle.y - handleRadius}
                                            width={handleRadius * 2}
                                            height={handleRadius * 2}
                                            fill="#3b82f6"
                                            stroke="#ffffff"
                                            strokeWidth={strokeWidth}
                                            opacity={0.7}
                                        />
                                    </>
                                )}

                                {/* Render anchor point - Diamond for L-type (corner without handles), Circle for others */}
                                {(() => {
                                    // Calculate size: first point larger, last point smaller
                                    const sizeMultiplier = isFirst ? 1.4 : isLast ? 0.85 : 1.0;
                                    const diamondSize = anchorRadius * 1.3 * sizeMultiplier;
                                    const circleSize = anchorRadius * sizeMultiplier;
                                    
                                    // Colors: first=green, last=red, selected=red, others=white
                                    const fillColor = index === penState.selectedAnchorIndex ? '#ef4444' : isFirst ? '#22c55e' : isLast ? '#ef4444' : '#ffffff';
                                    const strokeColor = index === penState.selectedAnchorIndex ? '#dc2626' : isFirst ? '#16a34a' : isLast ? '#dc2626' : '#2563eb';
                                    
                                    if (anchor.type === 'corner' && !anchor.inHandle && !anchor.outHandle) {
                                        return (
                                            <polygon
                                                points={`${anchor.position.x},${anchor.position.y - diamondSize} ${anchor.position.x + diamondSize},${anchor.position.y} ${anchor.position.x},${anchor.position.y + diamondSize} ${anchor.position.x - diamondSize},${anchor.position.y}`}
                                                fill={fillColor}
                                                stroke={strokeColor}
                                                strokeWidth={strokeWidth * 1.5}
                                            />
                                        );
                                    } else {
                                        return (
                                            <circle
                                                cx={anchor.position.x}
                                                cy={anchor.position.y}
                                                r={circleSize}
                                                fill={fillColor}
                                                stroke={strokeColor}
                                                strokeWidth={strokeWidth * 1.5}
                                            />
                                        );
                                    }
                                })()}
                            </g>
                        );
                    })}

                    {/* Render path segments */}
                    {penState.currentPath.anchors.map((anchor: typeof penState.currentPath.anchors[0], index: number) => {
                        if (index === 0) return null;

                        const prevAnchor = penState.currentPath.anchors[index - 1];
                        const hasCurve = prevAnchor.outHandle || anchor.inHandle;

                        if (!hasCurve) {
                            // Straight segment
                            return (
                                <line
                                    key={`segment-${index}`}
                                    x1={prevAnchor.position.x}
                                    y1={prevAnchor.position.y}
                                    x2={anchor.position.x}
                                    y2={anchor.position.y}
                                    stroke="#3b82f6"
                                    strokeWidth={strokeWidth * 2}
                                    opacity={0.6}
                                    fill="none"
                                />
                            );
                        }

                        // Curved segment - render as path
                        const p0 = prevAnchor.position;
                        const p3 = anchor.position;

                        const cp1 = prevAnchor.outHandle
                            ? { x: p0.x + prevAnchor.outHandle.x, y: p0.y + prevAnchor.outHandle.y }
                            : p0;

                        const cp2 = anchor.inHandle
                            ? { x: p3.x + anchor.inHandle.x, y: p3.y + anchor.inHandle.y }
                            : p3;

                        const pathData = `M ${p0.x} ${p0.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p3.x} ${p3.y}`;

                        return (
                            <path
                                key={`segment-${index}`}
                                d={pathData}
                                stroke="#3b82f6"
                                strokeWidth={strokeWidth * 2}
                                opacity={0.6}
                                fill="none"
                            />
                        );
                    })}

                    {/* Render closing segment for closed paths */}
                    {penState.currentPath.closed && penState.currentPath.anchors.length > 1 && (() => {
                        const lastAnchor = penState.currentPath.anchors[penState.currentPath.anchors.length - 1];
                        const firstAnchor = penState.currentPath.anchors[0];
                        const hasCurve = lastAnchor.outHandle || firstAnchor.inHandle;

                        if (!hasCurve) {
                            // Straight closing segment
                            return (
                                <line
                                    key="closing-segment"
                                    x1={lastAnchor.position.x}
                                    y1={lastAnchor.position.y}
                                    x2={firstAnchor.position.x}
                                    y2={firstAnchor.position.y}
                                    stroke="#3b82f6"
                                    strokeWidth={strokeWidth * 2}
                                    opacity={0.6}
                                    fill="none"
                                />
                            );
                        }

                        // Curved closing segment - render as path
                        const p0 = lastAnchor.position;
                        const p3 = firstAnchor.position;

                        const cp1 = lastAnchor.outHandle
                            ? { x: p0.x + lastAnchor.outHandle.x, y: p0.y + lastAnchor.outHandle.y }
                            : p0;

                        const cp2 = firstAnchor.inHandle
                            ? { x: p3.x + firstAnchor.inHandle.x, y: p3.y + firstAnchor.inHandle.y }
                            : p3;

                        const pathData = `M ${p0.x} ${p0.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p3.x} ${p3.y}`;

                        return (
                            <path
                                key="closing-segment"
                                d={pathData}
                                stroke="#3b82f6"
                                strokeWidth={strokeWidth * 2}
                                opacity={0.6}
                                fill="none"
                            />
                        );
                    })()}
                </>
            )}
        </g>
    );
};

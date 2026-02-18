/**
 * Pen Tool Guidelines - Point alignment and snap system
 * 
 * Provides guidelines that help align anchor points with:
 * - Other anchor points in the current path
 * - Anchor points from other paths on the canvas
 * - Handle endpoints (control points) from curves
 * - Midpoints between anchor pairs
 * - Canvas viewport edges and center
 * - Perpendicular and tangent points (future)
 */

import type { CanvasElement, PathData, Point } from '../../../types';
import type { PenPath } from '../types';
import { pathDataToPenPath } from './pathConverter';
import { toWorldPenPath } from './penPathTransforms';

export interface ReferencePoint {
    position: Point;
    type: 'anchor' | 'handle' | 'midpoint' | 'canvas-center' | 'canvas-edge' | 'tangent';
    sourceId?: string; // Element ID or 'current-path' or 'viewport'
    label?: string; // Optional label for display
}

export interface PenGuideline {
    axis: 'horizontal' | 'vertical';
    position: number; // X for vertical lines, Y for horizontal lines
    referencePoint: ReferencePoint;
    distance: number; // Distance from the current point to the guideline
}

export interface PenGuidelineMatch {
    guideline: PenGuideline;
    snappedPosition: Point;
}

/**
 * Collect all reference points from the canvas for guidelines
 */
export function collectReferencePoints(
    currentPath: PenPath | null,
    currentPointIndex: number | null, // Exclude this point from current path
    elements: CanvasElement[],
    viewport: { zoom: number; panX: number; panY: number; width: number; height: number },
    editingPathId: string | null
): ReferencePoint[] {
    const points: ReferencePoint[] = [];
    
    // 1. Collect points from current path (excluding the point being moved)
    if (currentPath && currentPath.anchors.length > 0) {
        currentPath.anchors.forEach((anchor, index) => {
            if (index !== currentPointIndex) {
                // Add anchor position
                points.push({
                    position: anchor.position,
                    type: 'anchor',
                    sourceId: 'current-path',
                    label: `A${index + 1}`,
                });
                
                // Add handle endpoints (absolute positions)
                if (anchor.inHandle) {
                    points.push({
                        position: {
                            x: anchor.position.x + anchor.inHandle.x,
                            y: anchor.position.y + anchor.inHandle.y,
                        },
                        type: 'handle',
                        sourceId: 'current-path',
                        label: `H${index + 1}-in`,
                    });
                }
                if (anchor.outHandle) {
                    points.push({
                        position: {
                            x: anchor.position.x + anchor.outHandle.x,
                            y: anchor.position.y + anchor.outHandle.y,
                        },
                        type: 'handle',
                        sourceId: 'current-path',
                        label: `H${index + 1}-out`,
                    });
                }
            }
        });
        
        // Add midpoints between consecutive anchors in current path
        for (let i = 0; i < currentPath.anchors.length - 1; i++) {
            if (i === currentPointIndex || i + 1 === currentPointIndex) continue;
            
            const p1 = currentPath.anchors[i].position;
            const p2 = currentPath.anchors[i + 1].position;
            points.push({
                position: {
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2,
                },
                type: 'midpoint',
                sourceId: 'current-path',
                label: `M${i + 1}-${i + 2}`,
            });
        }
    }
    
    // 2. Collect points from other paths on canvas
    elements.forEach(element => {
        if (element.type !== 'path') return;
        if (element.id === editingPathId) return; // Skip the path being edited
        
        const pathData = element.data as PathData;
        if (!pathData?.subPaths) return;
        
        pathData.subPaths.forEach((subPath, subPathIndex: number) => {
            if (!subPath || subPath.length === 0) return;

            const localPenPath = pathDataToPenPath(subPath, element.id);
            const worldPenPath = toWorldPenPath(localPenPath, element.id, elements);
            const anchors = worldPenPath.anchors;

            anchors.forEach((anchor, anchorIndex) => {
                points.push({
                    position: anchor.position,
                    type: 'anchor',
                    sourceId: element.id,
                    label: `${element.id.slice(0, 4)}:${subPathIndex}:${anchorIndex}`,
                });

                if (anchor.inHandle) {
                    points.push({
                        position: {
                            x: anchor.position.x + anchor.inHandle.x,
                            y: anchor.position.y + anchor.inHandle.y,
                        },
                        type: 'handle',
                        sourceId: element.id,
                        label: `${element.id.slice(0, 4)}:${subPathIndex}:h${anchorIndex}-in`,
                    });
                }
                if (anchor.outHandle) {
                    points.push({
                        position: {
                            x: anchor.position.x + anchor.outHandle.x,
                            y: anchor.position.y + anchor.outHandle.y,
                        },
                        type: 'handle',
                        sourceId: element.id,
                        label: `${element.id.slice(0, 4)}:${subPathIndex}:h${anchorIndex}-out`,
                    });
                }
            });
            
            // Add midpoints between consecutive anchors
            for (let i = 0; i < anchors.length - 1; i++) {
                const p1 = anchors[i].position;
                const p2 = anchors[i + 1].position;
                points.push({
                    position: {
                        x: (p1.x + p2.x) / 2,
                        y: (p1.y + p2.y) / 2,
                    },
                    type: 'midpoint',
                    sourceId: element.id,
                });
            }
        });
    });
    
    // 3. Add canvas viewport reference points
    const viewportBounds = {
        minX: -viewport.panX / viewport.zoom,
        minY: -viewport.panY / viewport.zoom,
        maxX: (-viewport.panX + viewport.width) / viewport.zoom,
        maxY: (-viewport.panY + viewport.height) / viewport.zoom,
    };
    
    // Canvas center
    points.push({
        position: {
            x: (viewportBounds.minX + viewportBounds.maxX) / 2,
            y: (viewportBounds.minY + viewportBounds.maxY) / 2,
        },
        type: 'canvas-center',
        sourceId: 'viewport',
        label: 'Center',
    });
    
    // Canvas edges (optional - can be toggled)
    // Vertical center line
    points.push({
        position: {
            x: (viewportBounds.minX + viewportBounds.maxX) / 2,
            y: viewportBounds.minY,
        },
        type: 'canvas-edge',
        sourceId: 'viewport',
        label: 'V-Center',
    });
    
    // Horizontal center line
    points.push({
        position: {
            x: viewportBounds.minX,
            y: (viewportBounds.minY + viewportBounds.maxY) / 2,
        },
        type: 'canvas-edge',
        sourceId: 'viewport',
        label: 'H-Center',
    });
    
    return points;
}

/**
 * Find guidelines that match the current point position
 */
export function findPenGuidelines(
    currentPoint: Point,
    referencePoints: ReferencePoint[],
    threshold: number,
    _maxGuidelines: number = 1 // Only show 1 guideline per axis (reserved for future use)
): { horizontal: PenGuidelineMatch | null; vertical: PenGuidelineMatch | null } {
    let bestHorizontal: PenGuidelineMatch | null = null;
    let bestVertical: PenGuidelineMatch | null = null;
    
    let minHorizontalDistance = threshold;
    let minVerticalDistance = threshold;
    
    for (const refPoint of referencePoints) {
        // Check horizontal alignment (same Y)
        const yDistance = Math.abs(currentPoint.y - refPoint.position.y);
        if (yDistance < minHorizontalDistance) {
            minHorizontalDistance = yDistance;
            bestHorizontal = {
                guideline: {
                    axis: 'horizontal',
                    position: refPoint.position.y,
                    referencePoint: refPoint,
                    distance: Math.abs(currentPoint.x - refPoint.position.x),
                },
                snappedPosition: {
                    x: currentPoint.x,
                    y: refPoint.position.y,
                },
            };
        }
        
        // Check vertical alignment (same X)
        const xDistance = Math.abs(currentPoint.x - refPoint.position.x);
        if (xDistance < minVerticalDistance) {
            minVerticalDistance = xDistance;
            bestVertical = {
                guideline: {
                    axis: 'vertical',
                    position: refPoint.position.x,
                    referencePoint: refPoint,
                    distance: Math.abs(currentPoint.y - refPoint.position.y),
                },
                snappedPosition: {
                    x: refPoint.position.x,
                    y: currentPoint.y,
                },
            };
        }
    }
    
    return { horizontal: bestHorizontal, vertical: bestVertical };
}

/**
 * Apply snap to a point based on active guidelines
 */
export function applyPenGuidelineSnap(
    point: Point,
    horizontalMatch: PenGuidelineMatch | null,
    verticalMatch: PenGuidelineMatch | null
): Point {
    return {
        x: verticalMatch ? verticalMatch.snappedPosition.x : point.x,
        y: horizontalMatch ? horizontalMatch.snappedPosition.y : point.y,
    };
}

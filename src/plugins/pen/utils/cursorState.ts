import type { Point } from '../../../types';
import type { PenMode, PenPath, PenCursorState, PenHoverTarget } from '../types';
import { findAnchorOnPath, findSegmentOnPath, findHandleOnPath } from './anchorDetection';

/**
 * Check if a path can be closed
 * - With 3+ anchors: always can close
 * - With 2 anchors: can close only if there's a curve (any anchor has handles)
 * - With less than 2 anchors: cannot close
 */
function canPathBeClosed(path: PenPath | null): boolean {
    if (!path || path.anchors.length < 2) {
        return false;
    }
    
    // 3+ anchors can always close
    if (path.anchors.length >= 3) {
        return true;
    }
    
    // 2 anchors: check if there's a curve (any handle exists)
    const hasHandles = path.anchors.some(anchor => 
        anchor.inHandle || anchor.outHandle
    );
    
    return hasHandles;
}

/**
 * Calculate the appropriate cursor state based on current context
 */
export function calculateCursorState(
    point: Point,
    mode: PenMode,
    currentPath: PenPath | null,
    _autoAddDelete: boolean,
    zoom: number = 1
): { cursorState: PenCursorState; hoverTarget: PenHoverTarget } {
    const threshold = 8 / zoom; // Adjust hit threshold for zoom level

    // Idle mode - no path in progress
    if (mode === 'idle' || !currentPath) {
        return {
            cursorState: 'new-path',
            hoverTarget: { type: 'canvas' },
        };
    }

    // Drawing mode - path in progress
    if (mode === 'drawing') {
        // Check if hovering over the first anchor (to close path)
        if (canPathBeClosed(currentPath)) {
            const firstAnchor = currentPath.anchors[0];
            const distance = Math.sqrt(
                (point.x - firstAnchor.position.x) ** 2 +
                (point.y - firstAnchor.position.y) ** 2
            );

            if (distance <= threshold) {
                return {
                    cursorState: 'close',
                    hoverTarget: { type: 'first-anchor', anchorIndex: 0 },
                };
            }
        }

        // Otherwise, continue drawing
        return {
            cursorState: 'continue',
            hoverTarget: { type: 'canvas' },
        };
    }

    // Editing mode - check for anchors and segments on selected paths
    // (This would require additional context about selected paths)
    // For now, return default
    return {
        cursorState: 'default',
        hoverTarget: { type: 'none' },
    };
}

/**
 * Calculate cursor state when hovering over an existing path (for editing)
 */
export function calculateEditCursorState(
    point: Point,
    path: PenPath,
    pathId: string,
    subPathIndex: number,
    autoAddDelete: boolean,
    zoom: number = 1
): { cursorState: PenCursorState; hoverTarget: PenHoverTarget } {
    const threshold = 8 / zoom;

    // Check handles first (highest priority when visible)
    const handleResult = findHandleOnPath(point, path, zoom);
    if (handleResult) {
        return {
            cursorState: 'reshape',
            hoverTarget: { 
                type: 'handle', 
                pathId, 
                subPathIndex,
                anchorIndex: handleResult.anchorIndex,
                handleType: handleResult.handleType
            },
        };
    }

    // Check if hovering over an anchor (second priority)
    const anchorIndex = findAnchorOnPath(point, path, threshold);
    if (anchorIndex !== null) {
        // Check if it's an endpoint (start or end of open path)
        if (!path.closed && (anchorIndex === 0 || anchorIndex === path.anchors.length - 1)) {
            return {
                cursorState: 'continue',
                hoverTarget: { type: 'endpoint', pathId, subPathIndex, anchorIndex },
            };
        }

        if (autoAddDelete) {
            return {
                cursorState: 'delete-anchor',
                hoverTarget: { type: 'anchor', pathId, subPathIndex, anchorIndex },
            };
        }
        return {
            cursorState: 'convert',
            hoverTarget: { type: 'anchor', pathId, subPathIndex, anchorIndex },
        };
    }

    // Check if hovering over a segment
    const segmentResult = findSegmentOnPath(point, path, threshold);
    if (segmentResult !== null) {
        if (autoAddDelete) {
            return {
                cursorState: 'add-anchor',
                hoverTarget: { type: 'segment', pathId, subPathIndex, segmentIndex: segmentResult.segmentIndex },
            };
        }
        return {
            cursorState: 'reshape',
            hoverTarget: { type: 'segment', pathId, subPathIndex, segmentIndex: segmentResult.segmentIndex },
        };
    }

    return {
        cursorState: 'default',
        hoverTarget: { type: 'none' },
    };
}

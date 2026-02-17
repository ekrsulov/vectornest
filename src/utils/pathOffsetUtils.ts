import type { CanvasElement, CanvasElementInput, PathData, Command } from '../types';
import { commandsToString } from './pathParserUtils';
import paper from 'paper';
import { PaperOffset } from 'paperjs-offset';
import { logger } from './logger';

/**
 * Apply offset to a path element using Paper.js offset
 * Creates a new path data (without id and zIndex) that is offset by the specified distance
 * Properly handles:
 * - Closed paths with Z command
 * - Bezier curves (C commands)
 * - Negative offset (contraction)
 * - Different join types
 */
export function applyOffsetToPath(
  element: CanvasElement,
  distance: number,
  joinType: 'round' | 'miter' | 'bevel' = 'round',
  miterLimit: number = 4
): CanvasElementInput | null {
  if (element.type !== 'path') return null;

  const pathData = element.data as PathData;
  
  try {
    // Setup Paper.js if not already done
    if (!paper.project) {
      paper.setup(new paper.Size(1, 1));
    }

    const offsetSubPaths: Command[][] = [];

    // Process each subpath
    for (const subPath of pathData.subPaths) {
      const offsetCommands = offsetSubPathWithPaperJS(
        subPath,
        distance,
        joinType,
        miterLimit
      );
      
      if (offsetCommands && offsetCommands.length > 0) {
        offsetSubPaths.push(offsetCommands);
      }
    }

    if (offsetSubPaths.length === 0) return null;

    // Create new path element with offset subpaths (without id and zIndex)
    return {
      type: 'path',
      parentId: element.parentId,
      data: {
        ...pathData,
        subPaths: offsetSubPaths,
      },
    };
  } catch (error) {
    logger.error('Error applying offset:', error);
    return null;
  }
}

/**
 * Check if a path is implicitly closed (last point equals first point)
 */
function isPathImplicitlyClosed(commands: Command[]): boolean {
  if (commands.length < 2) return false;
  
  // Check for explicit Z command
  const hasZCommand = commands.some(cmd => cmd.type === 'Z');
  if (hasZCommand) return true;
  
  // Check if last point equals first point (M command)
  const firstCmd = commands[0];
  if (firstCmd.type !== 'M') return false;
  
  const firstPoint = firstCmd.position;
  
  // Get the last command with a position
  let lastPoint = null;
  for (let i = commands.length - 1; i >= 0; i--) {
    const cmd = commands[i];
    if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C') {
      lastPoint = cmd.position;
      break;
    }
  }
  
  if (!lastPoint) return false;
  
  // Check if points are very close (within 0.01 units)
  const dx = Math.abs(lastPoint.x - firstPoint.x);
  const dy = Math.abs(lastPoint.y - firstPoint.y);
  return dx < 0.01 && dy < 0.01;
}

/**
 * Offset a single subpath using Paper.js
 * Handles curves, closed paths, and different join types properly
 */
function offsetSubPathWithPaperJS(
  commands: Command[],
  distance: number,
  joinType: 'round' | 'miter' | 'bevel',
  miterLimit: number
): Command[] | null {
  if (commands.length < 2) return null;

  try {
    // Check if path should be closed
    const shouldBeClosed = isPathImplicitlyClosed(commands);
    
    // Convert commands to Paper.js path
    const pathString = commandsToString(commands);
    const paperPath = new paper.Path(pathString);
    
    if (!paperPath || paperPath.segments.length === 0) {
      return null;
    }
    
    // Force closed state if path is implicitly closed
    if (shouldBeClosed && !paperPath.closed) {
      paperPath.closed = true;
    }

    // Apply offset using paperjs-offset
    const offsetPath = PaperOffset.offset(paperPath, distance, {
      join: joinType,
      limit: miterLimit,
      insert: false, // Don't insert into canvas
    }) as paper.Path | paper.CompoundPath;

    if (!offsetPath) {
      paperPath.remove();
      return null;
    }

    // Convert result back to commands
    let resultCommands: Command[] | null = null;

    if (offsetPath instanceof paper.CompoundPath) {
      // For compound paths, take the first child or merge them
      if (offsetPath.children.length > 0) {
        const firstChild = offsetPath.children[0] as paper.Path;
        resultCommands = paperPathToCommands(firstChild);
      }
    } else {
      // Single path result
      resultCommands = paperPathToCommands(offsetPath);
    }

    // Clean up Paper.js objects
    paperPath.remove();
    offsetPath.remove();

    return resultCommands;
  } catch (error) {
    logger.error('Error in offsetSubPathWithPaperJS:', error);
    return null;
  }
}

/**
 * Convert a Paper.js Path to our Command array
 * Preserves curves and closed paths
 */
function paperPathToCommands(paperPath: paper.Path): Command[] | null {
  if (!paperPath || paperPath.segments.length === 0) {
    return null;
  }

  const commands: Command[] = [];
  const segments = paperPath.segments;
  const isClosed = paperPath.closed;

  // First segment - always M (move to)
  const firstSeg = segments[0];
  const firstPoint = { x: firstSeg.point.x, y: firstSeg.point.y };
  commands.push({
    type: 'M',
    position: firstPoint,
  });

  // Determine how many segments to process
  // If closed, process all segments including the one that connects back
  const segmentCount = segments.length;

  // Process segments
  for (let i = 1; i < segmentCount; i++) {
    const seg = segments[i];
    const prevSeg = segments[i - 1];

    // Check if this segment has a curve (Bezier)
    const hasHandleOut = prevSeg.handleOut && !prevSeg.handleOut.isZero();
    const hasHandleIn = seg.handleIn && !seg.handleIn.isZero();

    if (hasHandleOut || hasHandleIn) {
      // Cubic Bezier curve (C command)
      commands.push({
        type: 'C',
        controlPoint1: {
          x: prevSeg.point.x + prevSeg.handleOut.x,
          y: prevSeg.point.y + prevSeg.handleOut.y,
          commandIndex: commands.length,
          pointIndex: 0,
          anchor: { x: seg.point.x, y: seg.point.y },
          isControl: true,
        },
        controlPoint2: {
          x: seg.point.x + seg.handleIn.x,
          y: seg.point.y + seg.handleIn.y,
          commandIndex: commands.length,
          pointIndex: 1,
          anchor: { x: seg.point.x, y: seg.point.y },
          isControl: true,
        },
        position: { x: seg.point.x, y: seg.point.y },
      });
    } else {
      // Straight line (L command)
      commands.push({
        type: 'L',
        position: { x: seg.point.x, y: seg.point.y },
      });
    }
  }

  // Handle closing segment for closed paths
  if (isClosed && segmentCount > 0) {
    const lastSeg = segments[segmentCount - 1];
    const firstSegAgain = segments[0];
    
    // Check if there's a curve connecting back to the start
    const hasHandleOut = lastSeg.handleOut && !lastSeg.handleOut.isZero();
    const hasHandleIn = firstSegAgain.handleIn && !firstSegAgain.handleIn.isZero();
    
    if (hasHandleOut || hasHandleIn) {
      // Add closing curve
      commands.push({
        type: 'C',
        controlPoint1: {
          x: lastSeg.point.x + lastSeg.handleOut.x,
          y: lastSeg.point.y + lastSeg.handleOut.y,
          commandIndex: commands.length,
          pointIndex: 0,
          anchor: firstPoint,
          isControl: true,
        },
        controlPoint2: {
          x: firstSegAgain.point.x + firstSegAgain.handleIn.x,
          y: firstSegAgain.point.y + firstSegAgain.handleIn.y,
          commandIndex: commands.length,
          pointIndex: 1,
          anchor: firstPoint,
          isControl: true,
        },
        position: firstPoint,
      });
    }
    
    // Always add Z command for closed paths
    commands.push({ type: 'Z' });
  }

  return commands.length > 1 ? commands : null;
}

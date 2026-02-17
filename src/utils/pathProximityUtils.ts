import type { Command, Point } from '../types';
import { getCommandStartPoint } from './pathParserUtils';
import { closestPointOnLineSegment, closestPointOnCubicBezier } from './geometry';
import { distance } from './math';



/**
 * Check if a point is near an existing control point
 */
function isNearExistingPoint(
  point: Point,
  commands: Command[],
  threshold: number = 10
): boolean {
  for (const command of commands) {
    if (command.type === 'M' || command.type === 'L') {
      if (command.position) {
        if (distance(point, command.position) < threshold) return true;
      }
    } else if (command.type === 'C') {
      // Check main position
      if (command.position) {
        if (distance(point, command.position) < threshold) return true;
      }
      // Check control points
      if (command.controlPoint1) {
        if (distance(point, command.controlPoint1) < threshold) return true;
      }
      if (command.controlPoint2) {
        if (distance(point, command.controlPoint2) < threshold) return true;
      }
    }
  }
  return false;
}

/**
 * Find the closest segment on a path to a given point
 * Returns null if no segment is within the threshold or if near an existing point
 */
export function findClosestPathSegment(
  point: Point,
  commands: Command[],
  threshold: number = 15,
  existingPointThreshold: number = 10
): { commandIndex: number; closestPoint: Point; t: number; distance: number } | null {
  // First check if the point is near an existing point
  if (isNearExistingPoint(point, commands, existingPointThreshold)) {
    return null;
  }

  let closestResult: { commandIndex: number; closestPoint: Point; t: number; distance: number } | null = null;
  let minDistance = threshold;

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];

    // Skip M and Z commands as they don't define segments to add points to
    if (command.type === 'M' || command.type === 'Z') continue;

    const startPoint = getCommandStartPoint(commands, i);
    if (!startPoint) continue;

    if (command.type === 'L' && command.position) {
      // Handle line segment
      const result = closestPointOnLineSegment(point, startPoint, command.position);
      if (result.distance < minDistance) {
        minDistance = result.distance;
        closestResult = {
          commandIndex: i,
          closestPoint: result.closestPoint,
          t: result.t,
          distance: result.distance,
        };
      }
    } else if (command.type === 'C' && command.controlPoint1 && command.controlPoint2 && command.position) {
      // Handle cubic bezier curve
      const result = closestPointOnCubicBezier(
        point,
        startPoint,
        command.controlPoint1,
        command.controlPoint2,
        command.position
      );
      if (result.distance < minDistance) {
        minDistance = result.distance;
        closestResult = {
          commandIndex: i,
          closestPoint: result.closestPoint,
          t: result.t,
          distance: result.distance,
        };
      }
    }
  }

  return closestResult;
}

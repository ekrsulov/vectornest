import type { Point, PathData, Command } from '../../types';
import type { ArrowHeadStyle, ArrowConfig } from './slice';
import { textToPathCommands } from '../../utils/textVectorizationUtils';
import { commandsToString } from '../../utils/pathParserUtils';
import createGraph from 'ngraph.graph';
import { nba } from 'ngraph.path';
import { distance } from '../../utils/math';

/**
 * Bounds interface for obstacle detection
 */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Node data for the visibility graph
 */
interface GraphNodeData {
  x: number;
  y: number;
}

/**
 * Check if two line segments intersect
 */
function lineSegmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(d) < 0.0001) return false;

  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = -((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) / d;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Check if a line segment intersects a bounding box
 */
export function lineIntersectsBounds(
  x1: number, y1: number,
  x2: number, y2: number,
  bounds: Bounds,
  margin: number = 10
): boolean {
  const minX = bounds.minX - margin;
  const minY = bounds.minY - margin;
  const maxX = bounds.maxX + margin;
  const maxY = bounds.maxY + margin;

  // Check if either endpoint is inside the box
  const p1Inside = x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY;
  const p2Inside = x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY;
  if (p1Inside || p2Inside) return true;

  // Check intersection with each edge of the bounding box
  const edges = [
    { x1: minX, y1: minY, x2: maxX, y2: minY }, // top
    { x1: maxX, y1: minY, x2: maxX, y2: maxY }, // right
    { x1: maxX, y1: maxY, x2: minX, y2: maxY }, // bottom
    { x1: minX, y1: maxY, x2: minX, y2: minY }, // left
  ];

  for (const edge of edges) {
    if (lineSegmentsIntersect(x1, y1, x2, y2, edge.x1, edge.y1, edge.x2, edge.y2)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a line segment intersects ANY of the obstacles
 */
function lineIntersectsAnyObstacle(
  x1: number, y1: number,
  x2: number, y2: number,
  obstacles: Bounds[],
  margin: number = 5
): boolean {
  for (const obs of obstacles) {
    if (lineIntersectsBounds(x1, y1, x2, y2, obs, margin)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a point is inside any obstacle
 */
function pointInsideAnyObstacle(
  x: number, y: number,
  obstacles: Bounds[],
  margin: number = 0
): boolean {
  for (const obs of obstacles) {
    if (x >= obs.minX - margin && x <= obs.maxX + margin &&
      y >= obs.minY - margin && y <= obs.maxY + margin) {
      return true;
    }
  }
  return false;
}

/**
 * Generate waypoints around obstacle corners with margin
 */
function generateWaypoints(obstacles: Bounds[], margin: number): Point[] {
  const waypoints: Point[] = [];

  for (const obs of obstacles) {
    // Add corner waypoints with margin
    const corners = [
      { x: obs.minX - margin, y: obs.minY - margin }, // top-left
      { x: obs.maxX + margin, y: obs.minY - margin }, // top-right
      { x: obs.maxX + margin, y: obs.maxY + margin }, // bottom-right
      { x: obs.minX - margin, y: obs.maxY + margin }, // bottom-left
    ];

    for (const corner of corners) {
      // Only add if not inside another obstacle
      if (!pointInsideAnyObstacle(corner.x, corner.y, obstacles, margin * 0.5)) {
        waypoints.push(corner);
      }
    }

    // Add midpoints on edges for better routing
    const midpoints = [
      { x: (obs.minX + obs.maxX) / 2, y: obs.minY - margin }, // top
      { x: (obs.minX + obs.maxX) / 2, y: obs.maxY + margin }, // bottom
      { x: obs.minX - margin, y: (obs.minY + obs.maxY) / 2 }, // left
      { x: obs.maxX + margin, y: (obs.minY + obs.maxY) / 2 }, // right
    ];

    for (const mp of midpoints) {
      if (!pointInsideAnyObstacle(mp.x, mp.y, obstacles, margin * 0.5)) {
        waypoints.push(mp);
      }
    }
  }

  return waypoints;
}



/**
 * Find which obstacle contains a point (if any)
 */
function findContainingObstacle(
  x: number, y: number,
  obstacles: Bounds[],
  margin: number = 0
): number {
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (x >= obs.minX - margin && x <= obs.maxX + margin &&
      y >= obs.minY - margin && y <= obs.maxY + margin) {
      return i;
    }
  }
  return -1;
}

/**
 * Find the nearest edge exit point from inside an obstacle
 */
function findNearestEdgeExit(
  point: Point,
  obstacle: Bounds,
  margin: number
): Point {
  const cx = (obstacle.minX + obstacle.maxX) / 2;
  const cy = (obstacle.minY + obstacle.maxY) / 2;

  // Direction from center to point
  const dx = point.x - cx;
  const dy = point.y - cy;

  // Determine which edge is closest based on direction
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX > absY) {
    // Exit through left or right edge
    if (dx > 0) {
      return { x: obstacle.maxX + margin, y: point.y };
    } else {
      return { x: obstacle.minX - margin, y: point.y };
    }
  } else {
    // Exit through top or bottom edge
    if (dy > 0) {
      return { x: point.x, y: obstacle.maxY + margin };
    } else {
      return { x: point.x, y: obstacle.minY - margin };
    }
  }
}

/**
 * Build a visibility graph using ngraph and find path using NBA* algorithm
 * Uses "points of interest" (corners of bounding boxes) as graph nodes
 * Supports snapping to points inside obstacles (e.g., center of shapes)
 */
export function findPathAroundObstacles(
  start: Point,
  end: Point,
  obstacles: Bounds[],
  margin: number = 15
): Point[] {
  // If direct path is clear, just return start and end
  if (!lineIntersectsAnyObstacle(start.x, start.y, end.x, end.y, obstacles, margin)) {
    return [start, end];
  }

  // Check if start or end points are inside obstacles
  const startObstacleIdx = findContainingObstacle(start.x, start.y, obstacles, 0);
  const endObstacleIdx = findContainingObstacle(end.x, end.y, obstacles, 0);

  // Filter obstacles for pathfinding - exclude obstacles that contain start or end
  const filteredObstacles = obstacles.filter((_, idx) =>
    idx !== startObstacleIdx && idx !== endObstacleIdx
  );

  // Generate waypoints around filtered obstacles
  const waypointPositions = generateWaypoints(filteredObstacles, margin);

  // If start is inside an obstacle, add an exit point
  const exitPoints: Point[] = [];

  if (startObstacleIdx >= 0) {
    const exitPoint = findNearestEdgeExit(start, obstacles[startObstacleIdx], margin);
    exitPoints.push(exitPoint);
    // We'll connect start directly to its exit point
  }

  // If end is inside an obstacle, add an entry point
  if (endObstacleIdx >= 0) {
    const entryPoint = findNearestEdgeExit(end, obstacles[endObstacleIdx], margin);
    exitPoints.push(entryPoint);
    // We'll connect end directly to its entry point
  }

  // Add start, exit points, waypoints, and end
  const allPoints: Point[] = [start, ...exitPoints, ...waypointPositions, end];

  // Create a graph
  const graph = createGraph<GraphNodeData, number>();

  // Add all points as nodes
  for (let i = 0; i < allPoints.length; i++) {
    graph.addNode(i, { x: allPoints[i].x, y: allPoints[i].y });
  }

  const startIdx = 0;
  const endIdx = allPoints.length - 1;

  // Add edges between visible points (bi-directional)
  for (let i = 0; i < allPoints.length; i++) {
    for (let j = i + 1; j < allPoints.length; j++) {
      const p1 = allPoints[i];
      const p2 = allPoints[j];

      // Special handling for start/end connections when inside obstacles
      const isStartConnection = i === startIdx;
      const isEndConnection = j === endIdx;

      // For start point inside obstacle: allow direct connection to exit points
      if (isStartConnection && startObstacleIdx >= 0) {
        // Check if p2 is an exit point (indices 1 to 1 + exitPoints.length - 1)
        const isExitPoint = j >= 1 && j < 1 + exitPoints.length;
        if (isExitPoint) {
          // Always allow connection to exit point
          const dist = distance(p1, p2);
          graph.addLink(i, j, dist);
          graph.addLink(j, i, dist);
          continue;
        }
      }

      // For end point inside obstacle: allow direct connection from entry points
      if (isEndConnection && endObstacleIdx >= 0) {
        // Check if p1 is an entry point
        const isEntryPoint = i >= 1 && i < 1 + exitPoints.length;
        if (isEntryPoint) {
          // Always allow connection from entry point
          const dist = distance(p1, p2);
          graph.addLink(i, j, dist);
          graph.addLink(j, i, dist);
          continue;
        }
      }

      // Standard visibility check using filtered obstacles
      if (!lineIntersectsAnyObstacle(p1.x, p1.y, p2.x, p2.y, filteredObstacles, margin * 0.3)) {
        const dist = distance(p1, p2);
        graph.addLink(i, j, dist);
        graph.addLink(j, i, dist);
      }
    }
  }

  // Create NBA* pathfinder (bi-directional A*, very fast)
  const pathFinder = nba<GraphNodeData, number>(graph, {
    // Distance function using link weight (already computed)
    distance: (_from, _to, link) => link.data,
    // Heuristic: Euclidean distance to goal
    heuristic: (from, to) => {
      const fromData = from.data;
      const toData = to.data;
      return distance({ x: fromData.x, y: fromData.y }, { x: toData.x, y: toData.y });
    },
  });

  // Find path
  const pathNodes = pathFinder.find(startIdx, endIdx);

  // Convert node path back to points
  if (pathNodes.length === 0) {
    // No path found, return direct path as fallback
    return [start, end];
  }

  // pathNodes is in reverse order (end to start), so reverse it
  const path: Point[] = pathNodes.reverse().map(node => ({
    x: node.data.x,
    y: node.data.y,
  }));

  // Simplify the path by removing unnecessary waypoints (use filtered obstacles)
  return simplifyPath(path, filteredObstacles, margin);
}

/**
 * Simplify path by removing unnecessary waypoints
 */
function simplifyPath(path: Point[], obstacles: Bounds[], margin: number): Point[] {
  if (path.length <= 2) return path;

  const simplified: Point[] = [path[0]];
  let current = 0;

  while (current < path.length - 1) {
    // Try to skip as many points as possible
    let farthest = current + 1;

    for (let i = path.length - 1; i > current + 1; i--) {
      if (!lineIntersectsAnyObstacle(
        path[current].x, path[current].y,
        path[i].x, path[i].y,
        obstacles, margin * 0.3
      )) {
        farthest = i;
        break;
      }
    }

    simplified.push(path[farthest]);
    current = farthest;
  }

  return simplified;
}

/**
 * Convert a multi-point path to smooth Bezier curves
 */
export function pathToSmoothCurves(
  path: Point[],
  smoothness: number = 0.3
): { points: Point[]; controlPoints: Array<{ c1: Point; c2: Point }> } {
  if (path.length < 2) {
    return { points: path, controlPoints: [] };
  }

  if (path.length === 2) {
    // Simple straight line - no control points needed for smooth
    return {
      points: path,
      controlPoints: [{
        c1: { x: path[0].x + (path[1].x - path[0].x) * 0.25, y: path[0].y + (path[1].y - path[0].y) * 0.25 },
        c2: { x: path[0].x + (path[1].x - path[0].x) * 0.75, y: path[0].y + (path[1].y - path[0].y) * 0.75 }
      }]
    };
  }

  const controlPoints: Array<{ c1: Point; c2: Point }> = [];

  for (let i = 0; i < path.length - 1; i++) {
    const p0 = i > 0 ? path[i - 1] : path[i];
    const p1 = path[i];
    const p2 = path[i + 1];
    const p3 = i < path.length - 2 ? path[i + 2] : path[i + 1];

    // Calculate tangent directions
    const tangent1 = {
      x: (p2.x - p0.x) * smoothness,
      y: (p2.y - p0.y) * smoothness,
    };

    const tangent2 = {
      x: (p3.x - p1.x) * smoothness,
      y: (p3.y - p1.y) * smoothness,
    };

    controlPoints.push({
      c1: {
        x: p1.x + tangent1.x,
        y: p1.y + tangent1.y,
      },
      c2: {
        x: p2.x - tangent2.x,
        y: p2.y - tangent2.y,
      },
    });
  }

  return { points: path, controlPoints };
}

/**
 * Helper to create a Move command
 */
function M(x: number, y: number): Command {
  return { type: 'M', position: { x, y } };
}

/**
 * Helper to create a Line command
 */
function L(x: number, y: number): Command {
  return { type: 'L', position: { x, y } };
}

/**
 * Helper to create a Curve command
 */
function C(
  x1: number, y1: number,
  x2: number, y2: number,
  x: number, y: number
): Command {
  return {
    type: 'C',
    controlPoint1: {
      x: x1, y: y1,
      commandIndex: 0,
      pointIndex: 0,
      anchor: { x: x1, y: y1 },
      isControl: true,
    },
    controlPoint2: {
      x: x2, y: y2,
      commandIndex: 0,
      pointIndex: 1,
      anchor: { x: x2, y: y2 },
      isControl: true,
    },
    position: { x, y },
  };
}

/**
 * Helper to create a Close command
 */
function Z(): Command {
  return { type: 'Z' };
}

/**
 * Generate path commands for an arrow head
 */
export function generateArrowHead(
  tip: Point,
  angle: number,  // Angle in radians pointing towards the tip
  style: ArrowHeadStyle,
  size: number
): Command[] {
  if (style === 'none') return [];

  const commands: Command[] = [];
  const rad = angle;

  switch (style) {
    case 'triangle':
    case 'triangleOpen': {
      // Triangle pointing towards tip
      const backAngle1 = rad + Math.PI + Math.PI / 6; // 30 degrees back
      const backAngle2 = rad + Math.PI - Math.PI / 6;

      const p1: Point = {
        x: tip.x + Math.cos(backAngle1) * size,
        y: tip.y + Math.sin(backAngle1) * size,
      };
      const p2: Point = {
        x: tip.x + Math.cos(backAngle2) * size,
        y: tip.y + Math.sin(backAngle2) * size,
      };

      commands.push(M(tip.x, tip.y));
      commands.push(L(p1.x, p1.y));
      commands.push(L(p2.x, p2.y));
      commands.push(Z());
      break;
    }

    case 'diamond':
    case 'diamondOpen': {
      // Diamond shape
      const halfSize = size / 2;
      const backPoint: Point = {
        x: tip.x + Math.cos(rad + Math.PI) * size,
        y: tip.y + Math.sin(rad + Math.PI) * size,
      };
      const sideAngle1 = rad + Math.PI / 2;
      const sideAngle2 = rad - Math.PI / 2;
      const midPoint: Point = {
        x: tip.x + Math.cos(rad + Math.PI) * halfSize,
        y: tip.y + Math.sin(rad + Math.PI) * halfSize,
      };
      const side1: Point = {
        x: midPoint.x + Math.cos(sideAngle1) * halfSize,
        y: midPoint.y + Math.sin(sideAngle1) * halfSize,
      };
      const side2: Point = {
        x: midPoint.x + Math.cos(sideAngle2) * halfSize,
        y: midPoint.y + Math.sin(sideAngle2) * halfSize,
      };

      commands.push(M(tip.x, tip.y));
      commands.push(L(side1.x, side1.y));
      commands.push(L(backPoint.x, backPoint.y));
      commands.push(L(side2.x, side2.y));
      commands.push(Z());
      break;
    }

    case 'circle':
    case 'circleOpen': {
      // Circle at the tip
      const radius = size / 2;
      const center: Point = {
        x: tip.x + Math.cos(rad + Math.PI) * radius,
        y: tip.y + Math.sin(rad + Math.PI) * radius,
      };

      // Approximate circle with bezier curves
      const k = 0.5522847498; // Magic number for bezier circle approximation
      const kr = k * radius;

      commands.push(M(center.x + radius, center.y));
      commands.push(C(
        center.x + radius, center.y + kr,
        center.x + kr, center.y + radius,
        center.x, center.y + radius
      ));
      commands.push(C(
        center.x - kr, center.y + radius,
        center.x - radius, center.y + kr,
        center.x - radius, center.y
      ));
      commands.push(C(
        center.x - radius, center.y - kr,
        center.x - kr, center.y - radius,
        center.x, center.y - radius
      ));
      commands.push(C(
        center.x + kr, center.y - radius,
        center.x + radius, center.y - kr,
        center.x + radius, center.y
      ));
      commands.push(Z());
      break;
    }

    case 'bar':
    case 'measure': {
      // Perpendicular bar
      const halfHeight = size / 2;
      const perpAngle1 = rad + Math.PI / 2;
      const perpAngle2 = rad - Math.PI / 2;

      const p1: Point = {
        x: tip.x + Math.cos(perpAngle1) * halfHeight,
        y: tip.y + Math.sin(perpAngle1) * halfHeight,
      };
      const p2: Point = {
        x: tip.x + Math.cos(perpAngle2) * halfHeight,
        y: tip.y + Math.sin(perpAngle2) * halfHeight,
      };

      commands.push(M(p1.x, p1.y));
      commands.push(L(p2.x, p2.y));
      break;
    }

    case 'chevron': {
      // Chevron (> or <) - open path, no closing
      const backAngle1 = rad + Math.PI + Math.PI / 6; // 30 degrees back
      const backAngle2 = rad + Math.PI - Math.PI / 6;

      const p1: Point = {
        x: tip.x + Math.cos(backAngle1) * size,
        y: tip.y + Math.sin(backAngle1) * size,
      };
      const p2: Point = {
        x: tip.x + Math.cos(backAngle2) * size,
        y: tip.y + Math.sin(backAngle2) * size,
      };

      // Open path: from p1 to tip to p2 (no Z close)
      commands.push(M(p1.x, p1.y));
      commands.push(L(tip.x, tip.y));
      commands.push(L(p2.x, p2.y));
      break;
    }
  }

  return commands;
}

/**
 * Generate SVG path string for an arrow head.
 * This is a convenience wrapper around generateArrowHead for use in JSX/SVG.
 * 
 * @param tipX - X coordinate of the arrow tip
 * @param tipY - Y coordinate of the arrow tip  
 * @param angle - Angle in radians pointing towards the tip
 * @param style - Arrow head style
 * @param size - Size of the arrow head
 * @returns SVG path string for use in path `d` attribute
 */
export function getArrowHeadPathString(
  tipX: number,
  tipY: number,
  angle: number,
  style: ArrowHeadStyle,
  size: number
): string {
  const commands = generateArrowHead({ x: tipX, y: tipY }, angle, style, size);
  if (commands.length === 0) return '';
  return commandsToString(commands);
}

/**
 * Check if an arrow head style should be filled
 */
export function isFilledHead(style: ArrowHeadStyle): boolean {
  return style === 'triangle' || style === 'diamond' || style === 'circle';
}

/**
 * Calculate control points for a curved line that avoids obstacles
 * Uses a simple approach: curve around obstacles by pushing control points away
 */
export function calculateCurvedPath(
  startX: number, startY: number,
  endX: number, endY: number,
  curvature: number,
  obstacles: Bounds[] = [],
  avoidObstacles: boolean = false
): { c1x: number; c1y: number; c2x: number; c2y: number } {
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = distance({ x: startX, y: startY }, { x: endX, y: endY });

  // Perpendicular direction
  const perpX = -dy / dist;
  const perpY = dx / dist;

  // Base curvature offset (as percentage of distance)
  const baseOffset = (curvature / 100) * dist * 0.3;

  // Default control points (simple curve)
  let c1x = startX + dx * 0.25 + perpX * baseOffset;
  let c1y = startY + dy * 0.25 + perpY * baseOffset;
  let c2x = startX + dx * 0.75 + perpX * baseOffset;
  let c2y = startY + dy * 0.75 + perpY * baseOffset;

  // If avoid obstacles is enabled, try to route around them
  if (avoidObstacles && obstacles.length > 0) {
    // Find obstacles that the straight line would intersect
    const intersectingObstacles = obstacles.filter(obs =>
      lineIntersectsBounds(startX, startY, endX, endY, obs)
    );

    if (intersectingObstacles.length > 0) {
      // Calculate which side to curve around (try both, pick the one with fewer collisions)
      let bestOffset = baseOffset;
      let bestSide = 1;

      // Try positive side control point
      const posC1x = startX + dx * 0.25 + perpX * Math.max(baseOffset, 50);
      const posC1y = startY + dy * 0.25 + perpY * Math.max(baseOffset, 50);

      // Try negative side control point
      const negC1x = startX + dx * 0.25 - perpX * Math.max(baseOffset, 50);
      const negC1y = startY + dy * 0.25 - perpY * Math.max(baseOffset, 50);

      // Check which side has fewer collisions
      let posCollisions = 0;
      let negCollisions = 0;

      for (const obs of intersectingObstacles) {
        // Check if control points are inside obstacle bounds
        const margin = 20;
        if (posC1x >= obs.minX - margin && posC1x <= obs.maxX + margin &&
          posC1y >= obs.minY - margin && posC1y <= obs.maxY + margin) {
          posCollisions++;
        }
        if (negC1x >= obs.minX - margin && negC1x <= obs.maxX + margin &&
          negC1y >= obs.minY - margin && negC1y <= obs.maxY + margin) {
          negCollisions++;
        }
      }

      // Pick the side with fewer collisions
      if (negCollisions < posCollisions) {
        bestSide = -1;
      }

      // Calculate how much we need to offset to clear obstacles
      for (const obs of intersectingObstacles) {
        const obsCenterX = (obs.minX + obs.maxX) / 2;
        const obsCenterY = (obs.minY + obs.maxY) / 2;

        // Project obstacle center onto perpendicular
        const toObsX = obsCenterX - midX;
        const toObsY = obsCenterY - midY;
        const projDist = toObsX * perpX + toObsY * perpY;

        // Calculate required clearance
        const obsWidth = obs.maxX - obs.minX;
        const obsHeight = obs.maxY - obs.minY;
        const clearance = Math.max(obsWidth, obsHeight) / 2 + 30;

        const requiredOffset = Math.abs(projDist) + clearance;
        if (requiredOffset > Math.abs(bestOffset)) {
          bestOffset = requiredOffset * bestSide;
        }
      }

      c1x = startX + dx * 0.25 + perpX * bestOffset;
      c1y = startY + dy * 0.25 + perpY * bestOffset;
      c2x = startX + dx * 0.75 + perpX * bestOffset;
      c2y = startY + dy * 0.75 + perpY * bestOffset;
    }
  }

  return { c1x, c1y, c2x, c2y };
}

/**
 * Calculate angle at endpoint of a cubic Bezier curve
 */
function getBezierEndAngle(
  p0x: number, p0y: number,
  c1x: number, c1y: number,
  c2x: number, c2y: number,
  p1x: number, p1y: number,
  atStart: boolean
): number {
  if (atStart) {
    // Tangent at t=0 is from p0 to c1
    return Math.atan2(c1y - p0y, c1x - p0x);
  } else {
    // Tangent at t=1 is from c2 to p1
    return Math.atan2(p1y - c2y, p1x - c2x);
  }
}

/**
 * Generate the main line of the arrow, possibly shortened to accommodate heads
 * Supports both straight, curved lines, and multi-waypoint pathfinding
 */
export function generateArrowLine(
  start: Point,
  end: Point,
  startHead: ArrowHeadStyle,
  endHead: ArrowHeadStyle,
  headSize: number,
  lineStyle: 'straight' | 'curved' = 'straight',
  curvature: number = 50,
  obstacles: Bounds[] = [],
  avoidObstacles: boolean = false,
  routingMode: 'simple' | 'pathfinding' = 'simple',
  routingMargin: number = 15
): Command[] {
  // Check if we need pathfinding mode
  const hasObstaclesToAvoid = avoidObstacles && obstacles.length > 0 &&
    obstacles.some(obs => lineIntersectsBounds(start.x, start.y, end.x, end.y, obs));

  // Use pathfinding for advanced routing
  if (hasObstaclesToAvoid && routingMode === 'pathfinding') {
    const path = findPathAroundObstacles(start, end, obstacles, routingMargin);

    if (path.length > 2) {
      const commands: Command[] = [];

      // Apply head shortening to first and last points
      let lineStart = path[0];
      let lineEnd = path[path.length - 1];

      // Calculate angles at endpoints
      const startAngle = Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x);
      const endAngle = Math.atan2(
        path[path.length - 1].y - path[path.length - 2].y,
        path[path.length - 1].x - path[path.length - 2].x
      );

      // Shorten for start head
      if (startHead !== 'none' && startHead !== 'bar' && startHead !== 'measure' && startHead !== 'chevron') {
        const offset = startHead === 'circle' || startHead === 'circleOpen' ? headSize / 2 : headSize * 0.7;
        lineStart = {
          x: start.x + Math.cos(startAngle) * offset,
          y: start.y + Math.sin(startAngle) * offset,
        };
      }

      // Shorten for end head
      if (endHead !== 'none' && endHead !== 'bar' && endHead !== 'measure' && endHead !== 'chevron') {
        const offset = endHead === 'circle' || endHead === 'circleOpen' ? headSize / 2 : headSize * 0.7;
        lineEnd = {
          x: end.x - Math.cos(endAngle) * offset,
          y: end.y - Math.sin(endAngle) * offset,
        };
      }

      // Build path: use curves only when lineStyle is 'curved', otherwise use straight lines
      commands.push(M(lineStart.x, lineStart.y));

      if (lineStyle === 'curved') {
        // Multi-waypoint path with smooth curves
        const smoothPath = pathToSmoothCurves(path, 0.25);
        for (let i = 0; i < smoothPath.controlPoints.length; i++) {
          const cp = smoothPath.controlPoints[i];
          const targetPoint = i === smoothPath.points.length - 2 ? lineEnd : smoothPath.points[i + 1];
          commands.push(C(cp.c1.x, cp.c1.y, cp.c2.x, cp.c2.y, targetPoint.x, targetPoint.y));
        }
      } else {
        // Straight line segments through waypoints (polyline)
        for (let i = 1; i < path.length - 1; i++) {
          commands.push(L(path[i].x, path[i].y));
        }
        commands.push(L(lineEnd.x, lineEnd.y));
      }

      return commands;
    }
  }

  // Check if we need simple curve (explicit or simple obstacle avoidance)
  const isCurved = lineStyle === 'curved' || (hasObstaclesToAvoid && routingMode === 'simple');

  // For curved lines, calculate control points first
  let curveData: { c1x: number; c1y: number; c2x: number; c2y: number } | null = null;
  if (isCurved) {
    const effectiveCurvature = hasObstaclesToAvoid ? Math.max(curvature, 30) : curvature;
    curveData = calculateCurvedPath(start.x, start.y, end.x, end.y, effectiveCurvature, obstacles, avoidObstacles);
  }

  // Calculate angle for shortening (use tangent for curves)
  let startAngle: number;
  let endAngle: number;

  if (isCurved && curveData) {
    startAngle = getBezierEndAngle(
      start.x, start.y, curveData.c1x, curveData.c1y,
      curveData.c2x, curveData.c2y, end.x, end.y, true
    );
    endAngle = getBezierEndAngle(
      start.x, start.y, curveData.c1x, curveData.c1y,
      curveData.c2x, curveData.c2y, end.x, end.y, false
    );
  } else {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    startAngle = angle;
    endAngle = angle;
  }

  // Calculate shortened points if heads are present
  let lineStart = start;
  let lineEnd = end;

  // Shorten for start head (except bar/measure/chevron which are at the exact point)
  if (startHead !== 'none' && startHead !== 'bar' && startHead !== 'measure' && startHead !== 'chevron') {
    const offset = startHead === 'circle' || startHead === 'circleOpen' ? headSize / 2 : headSize * 0.7;
    lineStart = {
      x: start.x + Math.cos(startAngle) * offset,
      y: start.y + Math.sin(startAngle) * offset,
    };
  }

  // Shorten for end head (except bar/measure/chevron)
  if (endHead !== 'none' && endHead !== 'bar' && endHead !== 'measure' && endHead !== 'chevron') {
    const offset = endHead === 'circle' || endHead === 'circleOpen' ? headSize / 2 : headSize * 0.7;
    lineEnd = {
      x: end.x - Math.cos(endAngle) * offset,
      y: end.y - Math.sin(endAngle) * offset,
    };
  }

  if (isCurved && curveData) {
    return [
      M(lineStart.x, lineStart.y),
      C(curveData.c1x, curveData.c1y, curveData.c2x, curveData.c2y, lineEnd.x, lineEnd.y),
    ];
  }

  return [
    M(lineStart.x, lineStart.y),
    L(lineEnd.x, lineEnd.y),
  ];
}

/**
 * Arrow component types for group creation
 */
export interface ArrowPathComponent {
  type: 'head' | 'line' | 'label';
  pathData: PathData;
}

/**
 * Generate individual path data for an arrow head
 */
function generateHeadPathData(
  tip: Point,
  angle: number,
  style: ArrowHeadStyle,
  headSize: number,
  color: string,
  strokeWidth: number
): PathData | null {
  if (style === 'none') return null;

  const commands = generateArrowHead(tip, angle, style, headSize);
  if (commands.length === 0) return null;

  // Determine fill based on style
  const isFilled = isFilledHead(style);

  return {
    subPaths: [commands],
    fillColor: isFilled ? color : 'none',
    strokeColor: color,
    strokeWidth: strokeWidth,
    strokeOpacity: 1,
    fillOpacity: 1,
    fillRule: 'nonzero',
  };
}

/**
 * Generate individual path data for the arrow line
 */
function generateLinePathData(
  start: Point,
  end: Point,
  startHead: ArrowHeadStyle,
  endHead: ArrowHeadStyle,
  headSize: number,
  color: string,
  strokeWidth: number,
  lineStyle: 'straight' | 'curved' = 'straight',
  curvature: number = 50,
  obstacles: Bounds[] = [],
  avoidObstacles: boolean = false,
  routingMode: 'simple' | 'pathfinding' = 'simple',
  routingMargin: number = 15
): PathData {
  const lineCommands = generateArrowLine(
    start, end, startHead, endHead, headSize, lineStyle, curvature,
    obstacles, avoidObstacles, routingMode, routingMargin
  );

  return {
    subPaths: [lineCommands],
    fillColor: 'none',
    strokeColor: color,
    strokeWidth: strokeWidth,
    strokeOpacity: 1,
    fillOpacity: 1,
    fillRule: 'nonzero',
  };
}

/**
 * Generate individual path data for measurement label (fill only, no stroke)
 * @param strokeWidth - Used to offset label perpendicular to line
 * @param fillColor - The fill color for the label text (from Editor panel)
 */
async function generateLabelPathData(
  start: Point,
  end: Point,
  labelFontSize: number,
  strokeWidth: number,
  strokeColor: string,
  fillColor: string,
  precision: number = 1
): Promise<PathData | null> {
  const distance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const angleDeg = (angle * 180) / Math.PI;

  const midPoint: Point = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  const labelText = distance.toFixed(precision);

  try {
    const textCommands = await textToPathCommands(
      labelText,
      0, 0,
      labelFontSize,
      'Inter, system-ui, sans-serif',
      '300',
      'normal'
    );

    if (textCommands.length === 0) return null;

    // Calculate text bounds to center it
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const cmd of textCommands) {
      if (cmd.type !== 'Z' && 'position' in cmd) {
        minX = Math.min(minX, cmd.position.x);
        maxX = Math.max(maxX, cmd.position.x);
        minY = Math.min(minY, cmd.position.y);
        maxY = Math.max(maxY, cmd.position.y);
      }
    }

    const textWidth = maxX - minX;
    const textHeight = maxY - minY;

    // Calculate perpendicular offset to position label away from the line
    // Consider: half stroke width + half text height + padding
    const perpendicularOffset = strokeWidth / 2 + textHeight / 2 + 4;

    // Calculate perpendicular direction (90 degrees from line angle)
    // Place label above the line (negative Y direction in screen coords)
    const perpX = -Math.sin(angle) * perpendicularOffset;
    const perpY = Math.cos(angle) * perpendicularOffset;

    // Calculate offset to center text at midpoint, then add perpendicular offset
    const offsetX = midPoint.x - textWidth / 2 - minX + perpX;
    const offsetY = midPoint.y + textHeight / 2 - maxY - perpY;

    // Use fillColor if not 'none', otherwise fall back to strokeColor
    const labelColor = (fillColor && fillColor !== 'none') ? fillColor : strokeColor;

    // Rotate text to align with arrow if angle is significant
    const shouldRotate = Math.abs(angleDeg) > 5 && Math.abs(angleDeg) < 175 &&
      Math.abs(angleDeg - 180) > 5 && Math.abs(angleDeg + 180) > 5;

    // Transform text commands
    const transformedSubPath: Command[] = [];

    for (const cmd of textCommands) {
      if (cmd.type === 'Z') {
        transformedSubPath.push(cmd);
        continue;
      }

      if (cmd.type === 'M' || cmd.type === 'L') {
        let x = cmd.position.x + offsetX;
        let y = cmd.position.y + offsetY;

        if (shouldRotate) {
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const dx = x - midPoint.x;
          const dy = y - midPoint.y;
          x = midPoint.x + dx * cos - dy * sin;
          y = midPoint.y + dx * sin + dy * cos;
        }

        transformedSubPath.push(cmd.type === 'M' ? M(x, y) : L(x, y));
      } else if (cmd.type === 'C') {
        let x = cmd.position.x + offsetX;
        let y = cmd.position.y + offsetY;
        let x1 = cmd.controlPoint1.x + offsetX;
        let y1 = cmd.controlPoint1.y + offsetY;
        let x2 = cmd.controlPoint2.x + offsetX;
        let y2 = cmd.controlPoint2.y + offsetY;

        if (shouldRotate) {
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const dx = x - midPoint.x;
          const dy = y - midPoint.y;
          x = midPoint.x + dx * cos - dy * sin;
          y = midPoint.y + dx * sin + dy * cos;

          const dx1 = x1 - midPoint.x;
          const dy1 = y1 - midPoint.y;
          x1 = midPoint.x + dx1 * cos - dy1 * sin;
          y1 = midPoint.y + dx1 * sin + dy1 * cos;

          const dx2 = x2 - midPoint.x;
          const dy2 = y2 - midPoint.y;
          x2 = midPoint.x + dx2 * cos - dy2 * sin;
          y2 = midPoint.y + dx2 * sin + dy2 * cos;
        }

        transformedSubPath.push(C(x1, y1, x2, y2, x, y));
      }
    }

    if (transformedSubPath.length === 0) return null;

    // Label uses fill only, no stroke
    return {
      subPaths: [transformedSubPath],
      fillColor: labelColor,
      strokeColor: 'none',
      strokeWidth: 0,
      strokeOpacity: 1,
      fillOpacity: 1,
      fillRule: 'nonzero',
    };
  } catch (error) {
    console.warn('Failed to generate label path data:', error);
    return null;
  }
}

/**
 * Generate arrow components as separate PathData objects for group creation
 * Returns an array of path components: heads, line, and optionally label
 */
export async function generateArrowComponents(
  start: Point,
  end: Point,
  config: ArrowConfig,
  strokeColor: string,
  strokeWidth: number,
  fillColor: string,
  precision: number = 1,
  obstacles: Bounds[] = []
): Promise<ArrowPathComponent[]> {
  const components: ArrowPathComponent[] = [];

  // Check if we need pathfinding mode for advanced routing
  const hasObstaclesToAvoid = config.avoidObstacles && obstacles.length > 0 &&
    obstacles.some(obs => lineIntersectsBounds(start.x, start.y, end.x, end.y, obs));
  const usePathfinding = hasObstaclesToAvoid && config.routingMode === 'pathfinding';
  const shouldUseCurve = config.lineStyle === 'curved' || (hasObstaclesToAvoid && !usePathfinding);

  // Calculate angles for heads based on line style or pathfinding
  let startHeadAngle: number;
  let endHeadAngle: number;

  if (usePathfinding) {
    // For pathfinding, use the path to determine angles
    const path = findPathAroundObstacles(start, end, obstacles, config.routingMargin);
    if (path.length > 2) {
      startHeadAngle = Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x) + Math.PI;
      endHeadAngle = Math.atan2(
        path[path.length - 1].y - path[path.length - 2].y,
        path[path.length - 1].x - path[path.length - 2].x
      );
    } else {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      startHeadAngle = angle + Math.PI;
      endHeadAngle = angle;
    }
  } else if (shouldUseCurve) {
    const effectiveCurvature = hasObstaclesToAvoid ? Math.max(config.curvature, 30) : config.curvature;
    const curveData = calculateCurvedPath(start.x, start.y, end.x, end.y, effectiveCurvature, obstacles, config.avoidObstacles);
    startHeadAngle = getBezierEndAngle(
      start.x, start.y, curveData.c1x, curveData.c1y,
      curveData.c2x, curveData.c2y, end.x, end.y, true
    ) + Math.PI;
    endHeadAngle = getBezierEndAngle(
      start.x, start.y, curveData.c1x, curveData.c1y,
      curveData.c2x, curveData.c2y, end.x, end.y, false
    );
  } else {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    startHeadAngle = angle + Math.PI;
    endHeadAngle = angle;
  }

  // 1. Start head (if any)
  if (config.startHead !== 'none') {
    const startHeadPath = generateHeadPathData(
      start, startHeadAngle, config.startHead, config.headSize, strokeColor, strokeWidth
    );
    if (startHeadPath) {
      components.push({ type: 'head', pathData: startHeadPath });
    }
  }

  // 2. End head (if any)
  if (config.endHead !== 'none') {
    const endHeadPath = generateHeadPathData(
      end, endHeadAngle, config.endHead, config.headSize, strokeColor, strokeWidth
    );
    if (endHeadPath) {
      components.push({ type: 'head', pathData: endHeadPath });
    }
  }

  // 3. Main line (supports curved, obstacle avoidance, and pathfinding)
  const linePath = generateLinePathData(
    start, end, config.startHead, config.endHead, config.headSize, strokeColor, strokeWidth,
    config.lineStyle, config.curvature, obstacles, config.avoidObstacles,
    config.routingMode, config.routingMargin
  );
  components.push({ type: 'line', pathData: linePath });

  // 4. Label (if enabled) - fill only, no stroke
  if (config.showLabel) {
    const labelPath = await generateLabelPathData(start, end, config.labelFontSize, strokeWidth, strokeColor, fillColor, precision);
    if (labelPath) {
      components.push({ type: 'label', pathData: labelPath });
    }
  }

  return components;
}

/**
 * Arrow head style options for UI
 */
export const arrowHeadOptions: Array<{ value: ArrowHeadStyle; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'triangleOpen', label: 'Triangle Open' },
  { value: 'chevron', label: 'Chevron' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'diamondOpen', label: 'Diamond Open' },
  { value: 'circle', label: 'Circle' },
  { value: 'circleOpen', label: 'Circle Open' },
  { value: 'bar', label: 'Bar' },
];

/**
 * Preset configurations
 */
export const arrowPresets = {
  simple: {
    startHead: 'none' as ArrowHeadStyle,
    endHead: 'triangle' as ArrowHeadStyle,
    showLabel: false,
  },
  dimension: {
    startHead: 'bar' as ArrowHeadStyle,
    endHead: 'bar' as ArrowHeadStyle,
    showLabel: true,
  },
  connector: {
    startHead: 'circle' as ArrowHeadStyle,
    endHead: 'triangle' as ArrowHeadStyle,
    showLabel: false,
  },
};

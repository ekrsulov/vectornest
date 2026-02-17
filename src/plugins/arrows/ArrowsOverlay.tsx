import React, { useRef, useMemo } from 'react';
import { useColorMode } from '@chakra-ui/react';
import type { ArrowConfig } from './slice';
import { findPathAroundObstacles, pathToSmoothCurves, getArrowHeadPathString, isFilledHead, lineIntersectsBounds, calculateCurvedPath, type Bounds } from './arrowUtils';
import { formatDistance } from '../../utils/measurementUtils';

// Minimum distance (in pixels) the endpoint must move before recalculating pathfinding
const PATHFINDING_DISTANCE_THRESHOLD = 25;
// Minimum time (in ms) between pathfinding calculations
const PATHFINDING_TIME_THRESHOLD = 150;
// Maximum obstacles before applying extra throttling
const HIGH_OBSTACLE_COUNT = 20;
// Extra throttle multiplier for high obstacle counts
const HIGH_OBSTACLE_TIME_MULTIPLIER = 3;
const HIGH_OBSTACLE_DISTANCE_MULTIPLIER = 2;

interface PathfindingCache {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  path: { x: number; y: number }[];
  timestamp: number;
}

/**
 * Custom hook for throttled pathfinding calculation
 * Only recalculates when the endpoint has moved beyond a threshold distance
 * AND a minimum time has passed since the last calculation.
 * More aggressive throttling when there are many obstacles.
 */
function useThrottledPathfinding(
  startPoint: { x: number; y: number } | null,
  endPoint: { x: number; y: number } | null,
  obstacles: Bounds[],
  routingMargin: number,
  enabled: boolean
): { x: number; y: number }[] | null {
  const cacheRef = useRef<PathfindingCache | null>(null);

  return useMemo(() => {
    if (!enabled || !startPoint || !endPoint) {
      return null;
    }

    const now = Date.now();
    const cache = cacheRef.current;

    // Apply more aggressive throttling when there are many obstacles
    const isHighObstacleCount = obstacles.length > HIGH_OBSTACLE_COUNT;
    const distanceThreshold = isHighObstacleCount 
      ? PATHFINDING_DISTANCE_THRESHOLD * HIGH_OBSTACLE_DISTANCE_MULTIPLIER 
      : PATHFINDING_DISTANCE_THRESHOLD;
    const timeThreshold = isHighObstacleCount 
      ? PATHFINDING_TIME_THRESHOLD * HIGH_OBSTACLE_TIME_MULTIPLIER 
      : PATHFINDING_TIME_THRESHOLD;

    // Check if we can use the cached result
    if (cache) {
      const startDist = Math.abs(cache.startPoint.x - startPoint.x) + Math.abs(cache.startPoint.y - startPoint.y);
      const endDist = Math.abs(cache.endPoint.x - endPoint.x) + Math.abs(cache.endPoint.y - endPoint.y);
      const timePassed = now - cache.timestamp;

      // Use cached result if not enough time has passed
      if (timePassed < timeThreshold) {
        return cache.path;
      }

      // Use cached result if haven't moved enough
      if (startDist < distanceThreshold && endDist < distanceThreshold) {
        return cache.path;
      }
    }

    // Calculate new path
    const path = findPathAroundObstacles(startPoint, endPoint, obstacles, routingMargin);

    // Update cache
    cacheRef.current = {
      startPoint: { ...startPoint },
      endPoint: { ...endPoint },
      path,
      timestamp: now,
    };

    return path;
  }, [startPoint, endPoint, obstacles, routingMargin, enabled]);
}

interface ArrowsOverlayProps {
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  config: ArrowConfig;
  color: string;
  strokeWidth: number;
  viewport: { zoom: number };
  precision?: number;
  obstacles?: Bounds[]; // Bounding boxes to avoid
}

/**
 * Calculate angle at a point on a cubic Bezier curve
 */
function getBezierAngleAtT(
  p0x: number, p0y: number,
  c1x: number, c1y: number,
  c2x: number, c2y: number,
  p1x: number, p1y: number,
  t: number
): number {
  // Derivative of cubic Bezier at t
  const dx = 3 * (1 - t) * (1 - t) * (c1x - p0x) +
    6 * (1 - t) * t * (c2x - c1x) +
    3 * t * t * (p1x - c2x);
  const dy = 3 * (1 - t) * (1 - t) * (c1y - p0y) +
    6 * (1 - t) * t * (c2y - c1y) +
    3 * t * t * (p1y - c2y);
  return Math.atan2(dy, dx);
}

export const ArrowsOverlay: React.FC<ArrowsOverlayProps> = ({
  startPoint,
  endPoint,
  config,
  color,
  strokeWidth,
  viewport,
  precision = 1,
  obstacles = [],
}) => {
  const { colorMode } = useColorMode();

  // Pre-calculate these values for the hook (before any conditional returns)
  const hasObstaclesToAvoid = startPoint && endPoint && config.avoidObstacles && obstacles.length > 0 &&
    obstacles.some(obs => lineIntersectsBounds(startPoint.x, startPoint.y, endPoint.x, endPoint.y, obs));
  const usePathfinding = hasObstaclesToAvoid && config.routingMode === 'pathfinding';

  // Use throttled pathfinding hook (must be called before any conditional returns)
  const pathfindingPath = useThrottledPathfinding(
    startPoint,
    endPoint,
    obstacles,
    config.routingMargin,
    usePathfinding ?? false
  );

  if (!startPoint || !endPoint) return null;

  const distance = Math.sqrt(
    Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
  );

  // Don't render if too short
  if (distance < 5) return null;

  const shouldUseCurve = config.lineStyle === 'curved' || (hasObstaclesToAvoid && !usePathfinding);

  // Calculate curve control points if needed (for simple mode)
  const curveData = shouldUseCurve
    ? calculateCurvedPath(
      startPoint.x, startPoint.y,
      endPoint.x, endPoint.y,
      hasObstaclesToAvoid ? Math.max(config.curvature, 30) : config.curvature,
      obstacles,
      config.avoidObstacles
    )
    : null;

  // Calculate angles for arrow heads
  let startAngle: number;
  let endAngle: number;

  if (usePathfinding && pathfindingPath && pathfindingPath.length > 2) {
    // For pathfinding, use the path direction at endpoints
    startAngle = Math.atan2(
      pathfindingPath[1].y - pathfindingPath[0].y,
      pathfindingPath[1].x - pathfindingPath[0].x
    );
    endAngle = Math.atan2(
      pathfindingPath[pathfindingPath.length - 1].y - pathfindingPath[pathfindingPath.length - 2].y,
      pathfindingPath[pathfindingPath.length - 1].x - pathfindingPath[pathfindingPath.length - 2].x
    );
  } else if (shouldUseCurve && curveData) {
    startAngle = getBezierAngleAtT(
      startPoint.x, startPoint.y,
      curveData.c1x, curveData.c1y,
      curveData.c2x, curveData.c2y,
      endPoint.x, endPoint.y,
      0
    );
    endAngle = getBezierAngleAtT(
      startPoint.x, startPoint.y,
      curveData.c1x, curveData.c1y,
      curveData.c2x, curveData.c2y,
      endPoint.x, endPoint.y,
      1
    );
  } else {
    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
    startAngle = angle;
    endAngle = angle;
  }

  // Calculate line endpoints (shortened for non-bar/chevron heads)
  let lineStartX = startPoint.x;
  let lineStartY = startPoint.y;
  let lineEndX = endPoint.x;
  let lineEndY = endPoint.y;

  if (config.startHead !== 'none' && config.startHead !== 'bar' && config.startHead !== 'measure' && config.startHead !== 'chevron') {
    const offset = config.startHead === 'circle' || config.startHead === 'circleOpen'
      ? config.headSize / 2
      : config.headSize * 0.7;
    lineStartX = startPoint.x + Math.cos(startAngle) * offset;
    lineStartY = startPoint.y + Math.sin(startAngle) * offset;
  }

  if (config.endHead !== 'none' && config.endHead !== 'bar' && config.endHead !== 'measure' && config.endHead !== 'chevron') {
    const offset = config.endHead === 'circle' || config.endHead === 'circleOpen'
      ? config.headSize / 2
      : config.headSize * 0.7;
    lineEndX = endPoint.x - Math.cos(endAngle) * offset;
    lineEndY = endPoint.y - Math.sin(endAngle) * offset;
  }

  // Get head paths - use tangent angles for curved lines
  const startHeadPath = getArrowHeadPathString(
    startPoint.x,
    startPoint.y,
    startAngle + Math.PI,
    config.startHead,
    config.headSize
  );

  const endHeadPath = getArrowHeadPathString(
    endPoint.x,
    endPoint.y,
    endAngle,
    config.endHead,
    config.headSize
  );

  // Colors - use provided color
  const strokeColor = color;
  const fillColor = color;

  // Measurement label positioning - offset above the line
  const showLabel = config.showLabel;
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;
  const labelText = formatDistance(distance, 'px', precision);

  // Calculate label rotation (keep text readable)
  const straightAngle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  let labelAngle = (straightAngle * 180) / Math.PI;
  if (labelAngle > 90) labelAngle -= 180;
  if (labelAngle < -90) labelAngle += 180;

  // Label offset perpendicular to line - increased distance so it doesn't touch
  const labelOffset = (config.labelFontSize + 6) / viewport.zoom;
  const labelOffsetX = Math.cos(straightAngle + Math.PI / 2) * labelOffset;
  const labelOffsetY = Math.sin(straightAngle + Math.PI / 2) * labelOffset;

  // For curved lines, position label at curve apex
  let labelX = midX + labelOffsetX;
  let labelY = midY + labelOffsetY;
  if (shouldUseCurve && curveData) {
    // Evaluate Bezier at t=0.5 for curve midpoint
    const t = 0.5;
    const mt = 1 - t;
    labelX = mt * mt * mt * startPoint.x + 3 * mt * mt * t * curveData.c1x + 3 * mt * t * t * curveData.c2x + t * t * t * endPoint.x + labelOffsetX;
    labelY = mt * mt * mt * startPoint.y + 3 * mt * mt * t * curveData.c1y + 3 * mt * t * t * curveData.c2y + t * t * t * endPoint.y + labelOffsetY;
  }

  // Text colors and background
  const textColor = colorMode === 'dark' ? '#e2e8f0' : '#1a202c';
  const textBg = colorMode === 'dark' ? '#1e293bb3' : '#ffffffcc';

  // Build line path
  let linePath: string;
  if (usePathfinding && pathfindingPath && pathfindingPath.length > 2) {
    let pathStr = `M ${lineStartX} ${lineStartY}`;

    if (config.lineStyle === 'curved') {
      // Multi-waypoint path with smooth curves
      const smoothPath = pathToSmoothCurves(pathfindingPath, 0.25);
      for (let i = 0; i < smoothPath.controlPoints.length; i++) {
        const cp = smoothPath.controlPoints[i];
        const targetPoint = i === smoothPath.points.length - 2
          ? { x: lineEndX, y: lineEndY }
          : smoothPath.points[i + 1];
        pathStr += ` C ${cp.c1.x} ${cp.c1.y} ${cp.c2.x} ${cp.c2.y} ${targetPoint.x} ${targetPoint.y}`;
      }
    } else {
      // Straight line segments through waypoints (polyline)
      for (let i = 1; i < pathfindingPath.length - 1; i++) {
        pathStr += ` L ${pathfindingPath[i].x} ${pathfindingPath[i].y}`;
      }
      pathStr += ` L ${lineEndX} ${lineEndY}`;
    }

    linePath = pathStr;
  } else if (shouldUseCurve && curveData) {
    linePath = `M ${lineStartX} ${lineStartY} C ${curveData.c1x} ${curveData.c1y} ${curveData.c2x} ${curveData.c2y} ${lineEndX} ${lineEndY}`;
  } else {
    linePath = `M ${lineStartX} ${lineStartY} L ${lineEndX} ${lineEndY}`;
  }

  return (
    <g className="arrows-overlay" style={{ pointerEvents: 'none' }}>
      {/* Main line (straight or curved) */}
      <path
        d={linePath}
        stroke={strokeColor}
        strokeWidth={strokeWidth / viewport.zoom}
        strokeLinecap="round"
        fill="none"
      />

      {/* Start head */}
      {startHeadPath && (
        <path
          d={startHeadPath}
          fill={isFilledHead(config.startHead) ? fillColor : 'none'}
          stroke={strokeColor}
          strokeWidth={strokeWidth / viewport.zoom}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* End head */}
      {endHeadPath && (
        <path
          d={endHeadPath}
          fill={isFilledHead(config.endHead) ? fillColor : 'none'}
          stroke={strokeColor}
          strokeWidth={strokeWidth / viewport.zoom}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Measurement label - no bold, positioned away from line */}
      {showLabel && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={config.labelFontSize / viewport.zoom}
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="400"
            fill={textColor}
            transform={`rotate(${labelAngle})`}
            style={{
              paintOrder: 'stroke',
              stroke: textBg,
              strokeWidth: `${3 / viewport.zoom}px`,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            {labelText} px
          </text>
        </g>
      )}
    </g>
  );
};

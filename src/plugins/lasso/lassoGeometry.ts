/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a bounding box intersects with a polygon
 */
export function isBoundsIntersectingPolygon(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  polygon: Array<{ x: number; y: number }>
): boolean {
  if (polygon.length < 3) return false;

  // Check if any corner of the bounds is inside the polygon
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];

  for (const corner of corners) {
    if (isPointInPolygon(corner, polygon)) {
      return true;
    }
  }

  // Check if any point of the polygon is inside the bounds
  for (const point of polygon) {
    if (point.x >= bounds.minX && point.x <= bounds.maxX &&
        point.y >= bounds.minY && point.y <= bounds.maxY) {
      return true;
    }
  }

  // Check if any edge of the polygon intersects with the bounds
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    if (isLineIntersectingBounds(p1, p2, bounds)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a line segment intersects with a bounding box
 */
function isLineIntersectingBounds(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  // Check if line segment intersects with any of the four edges of the bounds
  const edges = [
    { x1: bounds.minX, y1: bounds.minY, x2: bounds.maxX, y2: bounds.minY }, // top
    { x1: bounds.maxX, y1: bounds.minY, x2: bounds.maxX, y2: bounds.maxY }, // right
    { x1: bounds.maxX, y1: bounds.maxY, x2: bounds.minX, y2: bounds.maxY }, // bottom
    { x1: bounds.minX, y1: bounds.maxY, x2: bounds.minX, y2: bounds.minY }, // left
  ];

  for (const edge of edges) {
    if (doLinesIntersect(p1.x, p1.y, p2.x, p2.y, edge.x1, edge.y1, edge.x2, edge.y2)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 */
function doLinesIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false; // parallel

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Check if a point is near a line segment (within a certain distance)
 */
function isPointNearLine(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
  threshold: number = 5
): boolean {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    // Line segment is a point
    const distance = Math.sqrt(A * A + B * B);
    return distance <= threshold;
  }

  const param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance <= threshold;
}

/**
 * Check if a point is near any segment of a polyline
 */
export function isPointNearPolyline(
  point: { x: number; y: number },
  polyline: Array<{ x: number; y: number }>,
  threshold: number = 5
): boolean {
  for (let i = 0; i < polyline.length - 1; i++) {
    if (isPointNearLine(point, polyline[i], polyline[i + 1], threshold)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a bounding box intersects with a polyline
 */
export function isBoundsIntersectingPolyline(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  polyline: Array<{ x: number; y: number }>
): boolean {
  if (polyline.length < 2) return false;

  // Check if any point of the polyline is inside the bounds
  for (const point of polyline) {
    if (point.x >= bounds.minX && point.x <= bounds.maxX &&
        point.y >= bounds.minY && point.y <= bounds.maxY) {
      return true;
    }
  }

  // Check if any line segment intersects with the bounds
  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];

    if (isLineIntersectingBounds(p1, p2, bounds)) {
      return true;
    }
  }

  return false;
}

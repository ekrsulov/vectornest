import type { Command, Point } from '../types';
import { PATH_DECIMAL_PRECISION } from '../types';
import { formatToPrecision } from './numberUtils';

/**
 * Apply a 2D transformation matrix to a point
 */
function applyMatrix(point: Point, matrix: number[][]): Point {
  const x = matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2];
  const y = matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2];
  const w = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];

  // Guard against division by zero (degenerate projection)
  const safeW = Math.abs(w) < 1e-10 ? (w < 0 ? -1e-10 : 1e-10) : w;

  return {
    x: formatToPrecision(x / safeW, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(y / safeW, PATH_DECIMAL_PRECISION)
  };
}

/**
 * Create a perspective transformation matrix from four corner points
 * Based on the homography transformation
 */
export function createPerspectiveMatrix(
  srcCorners: { tl: Point; tr: Point; bl: Point; br: Point },
  dstCorners: { tl: Point; tr: Point; bl: Point; br: Point }
): number[][] {
  // Use full homography (projective transform) mapping from 4 source corners to 4 destination corners.
  // The simplified (bilinear) method used previously ignored the bottom-right corner and produced
  // unchanged transforms when only the BR corner moved. Implementing a true homography ensures the
  // transform depends on all four corners.

  // Build the linear system A * h = b, where h = [h11, h12, h13, h21, h22, h23, h31, h32]
  // (h33 is assumed to be 1). Each point correspondence provides two equations:
  // u = (h11*x + h12*y + h13)/(h31*x + h32*y + 1)
  // v = (h21*x + h22*y + h23)/(h31*x + h32*y + 1)
  // Rearranged to linear form for the unknowns h.

  const src = [srcCorners.tl, srcCorners.tr, srcCorners.br, srcCorners.bl];
  const dst = [dstCorners.tl, dstCorners.tr, dstCorners.br, dstCorners.bl];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];

    // u * (h31*x + h32*y + 1) = h11*x + h12*y + h13
    // v * (h31*x + h32*y + 1) = h21*x + h22*y + h23
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  // Solve the linear system using Gaussian elimination with partial pivoting
  const solve = (M: number[][], rhs: number[]): number[] | null => {
    // Convert M to augmented matrix
    const n = M.length;
    const Aaug = M.map((row, i) => row.concat(rhs[i] ?? 0));

    for (let i = 0; i < n; i++) {
      // Partial pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(Aaug[k][i]) > Math.abs(Aaug[maxRow][i])) maxRow = k;
      }
      if (Math.abs(Aaug[maxRow][i]) < 1e-12) return null; // singular
      // Swap rows
      if (maxRow !== i) {
        const temp = Aaug[i];
        Aaug[i] = Aaug[maxRow];
        Aaug[maxRow] = temp;
      }

      // Normalize pivot row
      const pivot = Aaug[i][i];
      for (let j = i; j <= n; j++) Aaug[i][j] /= pivot;

      // Eliminate below
      for (let k = i + 1; k < n; k++) {
        const factor = Aaug[k][i];
        if (Math.abs(factor) < 1e-15) continue;
        for (let j = i; j <= n; j++) Aaug[k][j] -= factor * Aaug[i][j];
      }
    }

    // Back substitution
    const xsol = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = Aaug[i][n];
      for (let j = i + 1; j < n; j++) sum -= Aaug[i][j] * xsol[j];
      xsol[i] = sum / (Aaug[i][i] || 1);
    }
    return xsol;
  };

  const h = solve(A, b);
  if (!h) {
    // Fallback to previous simplified approach if the system is singular
    // NB: This means for degenerate cases the transform may not be perfect, but we avoid breaking.
    const srcTL = srcCorners.tl;
    const srcTR = srcCorners.tr;
    const srcBL = srcCorners.bl;
    const dstTL = dstCorners.tl;
    const dstTR = dstCorners.tr;
    const dstBL = dstCorners.bl;
    const scaleX = (dstTR.x - dstTL.x) / (srcTR.x - srcTL.x || 1);
    const scaleY = (dstBL.y - dstTL.y) / (srcBL.y - srcTL.y || 1);
    const skewX = (dstTR.y - dstTL.y) / (srcTR.x - srcTL.x || 1);
    const skewY = (dstBL.x - dstTL.x) / (srcBL.y - srcTL.y || 1);

    return [
      [scaleX, skewY, dstTL.x - srcTL.x * scaleX - srcTL.y * skewY],
      [skewX, scaleY, dstTL.y - srcTL.x * skewX - srcTL.y * scaleY],
      [0, 0, 1]
    ];
  }

  // h includes [h11, h12, h13, h21, h22, h23, h31, h32]
  const [h11, h12, h13, h21, h22, h23, h31, h32] = h;
  return [
    [h11, h12, h13],
    [h21, h22, h23],
    [h31, h32, 1]
  ];
}

/**
 * Apply distort transformation (free-form corner movement)
 */
export function applyDistortTransform(
  commands: Command[],
  originalBounds: { minX: number; minY: number; maxX: number; maxY: number },
  newCorners: { tl: Point; tr: Point; bl: Point; br: Point }
): Command[] {
  const srcCorners = {
    tl: { x: originalBounds.minX, y: originalBounds.minY },
    tr: { x: originalBounds.maxX, y: originalBounds.minY },
    bl: { x: originalBounds.minX, y: originalBounds.maxY },
    br: { x: originalBounds.maxX, y: originalBounds.maxY }
  };

  const matrix = createPerspectiveMatrix(srcCorners, newCorners);

  return commands.map(cmd => {
    if (cmd.type === 'Z') {
      return cmd;
    }

    if (cmd.type === 'M' || cmd.type === 'L') {
      return {
        ...cmd,
        position: applyMatrix(cmd.position, matrix)
      };
    }

    if (cmd.type === 'C') {
      const transformedCP1 = applyMatrix(cmd.controlPoint1, matrix);
      const transformedCP2 = applyMatrix(cmd.controlPoint2, matrix);

      return {
        ...cmd,
        controlPoint1: {
          ...cmd.controlPoint1,
          x: transformedCP1.x,
          y: transformedCP1.y
        },
        controlPoint2: {
          ...cmd.controlPoint2,
          x: transformedCP2.x,
          y: transformedCP2.y
        },
        position: applyMatrix(cmd.position, matrix)
      };
    }

    return cmd;
  });
}

/**
 * Apply generic skew transformation
 */
function applySkewTransform(
  commands: Command[],
  skewPoint: (point: Point) => Point
): Command[] {
  return commands.map(cmd => {
    if (cmd.type === 'Z') {
      return cmd;
    }

    if (cmd.type === 'M' || cmd.type === 'L') {
      return {
        ...cmd,
        position: skewPoint(cmd.position)
      };
    }

    if (cmd.type === 'C') {
      return {
        ...cmd,
        controlPoint1: {
          ...cmd.controlPoint1,
          ...skewPoint(cmd.controlPoint1)
        },
        controlPoint2: {
          ...cmd.controlPoint2,
          ...skewPoint(cmd.controlPoint2)
        },
        position: skewPoint(cmd.position)
      };
    }

    return cmd;
  });
}

/**
 * Apply skew transformation along X axis
 */
export function applySkewXTransform(
  commands: Command[],
  angle: number,
  originY: number
): Command[] {
  const tanAngle = Math.tan((angle * Math.PI) / 180);

  const skewPoint = (point: Point): Point => {
    const dy = point.y - originY;
    return {
      x: formatToPrecision(point.x + dy * tanAngle, PATH_DECIMAL_PRECISION),
      y: point.y
    };
  };

  return applySkewTransform(commands, skewPoint);
}

/**
 * Apply skew transformation along Y axis
 */
export function applySkewYTransform(
  commands: Command[],
  angle: number,
  originX: number
): Command[] {
  const tanAngle = Math.tan((angle * Math.PI) / 180);

  const skewPoint = (point: Point): Point => {
    const dx = point.x - originX;
    return {
      x: point.x,
      y: formatToPrecision(point.y + dx * tanAngle, PATH_DECIMAL_PRECISION)
    };
  };

  return applySkewTransform(commands, skewPoint);
}

/**
 * Calculate skew angle from edge movement
 */
export function calculateSkewAngleFromDelta(
  delta: number,
  perpDistance: number
): number {
  if (perpDistance === 0) return 0;
  return Math.atan(delta / perpDistance) * (180 / Math.PI);
}

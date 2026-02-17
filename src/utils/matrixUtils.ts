import type { Point } from '../types';

/**
 * 2D Affine Transformation Matrix
 * represented as [a, b, c, d, tx, ty]
 * where:
 * | a c tx |
 * | b d ty |
 * | 0 0 1  |
 */
export type Matrix = [number, number, number, number, number, number];

/**
 * Identity matrix
 */
export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

/**
 * Multiply two matrices (A * B)
 * effectively applying B after A (if thinking in terms of coordinate transforms)
 */
export function multiplyMatrices(m1: Matrix, m2: Matrix): Matrix {
  const [a1, b1, c1, d1, tx1, ty1] = m1;
  const [a2, b2, c2, d2, tx2, ty2] = m2;

  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * tx2 + c1 * ty2 + tx1,
    b1 * tx2 + d1 * ty2 + ty1,
  ];
}

/**
 * Create a translation matrix
 */
export function createTranslateMatrix(tx: number, ty: number): Matrix {
  return [1, 0, 0, 1, tx, ty];
}

/**
 * Create a rotation matrix (angle in degrees)
 */
export function createRotateMatrix(angleDegrees: number, centerX: number = 0, centerY: number = 0): Matrix {
  const rad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Rotation around a point involves translate(-cx, -cy) * rotate * translate(cx, cy)
  // Which simplifies to the following:
  const tx = centerX - centerX * cos + centerY * sin;
  const ty = centerY - centerX * sin - centerY * cos;

  return [cos, sin, -sin, cos, tx, ty];
}

/**
 * Create a scale matrix
 */
export function createScaleMatrix(sx: number, sy: number, centerX: number = 0, centerY: number = 0): Matrix {
  // Scaling around a point involves translate(-cx, -cy) * scale * translate(cx, cy)
  const tx = centerX - centerX * sx;
  const ty = centerY - centerY * sy;

  return [sx, 0, 0, sy, tx, ty];
}

/**
 * Apply matrix transform to a point
 */
export function applyToPoint(matrix: Matrix, point: Point): Point {
  const [a, b, c, d, tx, ty] = matrix;
  return {
    x: a * point.x + c * point.y + tx,
    y: b * point.x + d * point.y + ty,
  };
}

/**
 * Inverse a matrix
 * Returns null if the matrix is not invertible (determinant is 0)
 */
export function inverseMatrix(matrix: Matrix): Matrix | null {
  const [a, b, c, d, tx, ty] = matrix;
  const det = a * d - b * c;

  if (Math.abs(det) < 1e-6) {
    return null;
  }

  const invDet = 1 / det;

  return [
    d * invDet,
    -b * invDet,
    -c * invDet,
    a * invDet,
    (c * ty - d * tx) * invDet,
    (b * tx - a * ty) * invDet,
  ];
}

/**
 * Decomposed matrix components
 */
export interface MatrixDecomposition {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;  // in degrees
  skewX: number;     // in degrees
  skewY: number;     // in degrees
}

/**
 * Decompose a 2D affine transformation matrix into its components:
 * translation, scale, rotation, and skew.
 * Uses QR decomposition approach.
 * 
 * Matrix structure:
 * | a c tx |
 * | b d ty |
 * | 0 0 1  |
 */
export function decomposeMatrix(matrix: Matrix): MatrixDecomposition {
  const [a, b, c, d, tx, ty] = matrix;
  
  // Translation is straightforward
  const translateX = tx;
  const translateY = ty;
  
  // Compute scale X from the first column vector length
  const scaleX = Math.sqrt(a * a + b * b);
  
  // Compute the rotation from the first column
  const rotation = Math.atan2(b, a);
  
  // Compute cos and sin of rotation
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  // Handle degenerate case where scaleX is zero
  if (scaleX === 0) {
    return {
      translateX,
      translateY,
      scaleX: 0,
      scaleY: 0,
      rotation: 0,
      skewX: 0,
      skewY: 0,
    };
  }
  
  // Apply inverse rotation to get the upper triangular matrix (for skew/scale)
  // [a c] * [cos sin]^T = [scaleX, skewX*scaleY]
  // [b d]   [-sin cos]    [0,      scaleY]
  // 
  // After rotation removal:
  // m11 = a*cos + b*sin = scaleX
  // m12 = c*cos + d*sin = skewX * scaleY
  // m21 = -a*sin + b*cos = 0 (by construction)
  // m22 = -c*sin + d*cos = scaleY
  
  const m12 = c * cos + d * sin;
  const m22 = -c * sin + d * cos;
  
  // scaleY is the m22 component
  let scaleY = m22;
  
  // Handle negative scales (reflection)
  // Check the determinant to detect flip
  const det = a * d - b * c;
  if (det < 0) {
    // Flip detected - apply to scaleY
    scaleY = -scaleY;
  }
  
  // skewX is derived from m12 / scaleY
  let skewX = 0;
  if (Math.abs(scaleY) > 1e-6) {
    skewX = Math.atan(m12 / scaleY);
  }
  
  // skewY is typically 0 after this decomposition (absorbed into rotation)
  const skewY = 0;
  
  // Convert to degrees
  const rotationDegrees = (rotation * 180) / Math.PI;
  const skewXDegrees = (skewX * 180) / Math.PI;
  const skewYDegrees = (skewY * 180) / Math.PI;
  
  return {
    translateX: Math.round(translateX * 100) / 100,
    translateY: Math.round(translateY * 100) / 100,
    scaleX: Math.round(scaleX * 1000) / 1000,
    scaleY: Math.round(scaleY * 1000) / 1000,
    rotation: Math.round(rotationDegrees * 100) / 100,
    skewX: Math.round(skewXDegrees * 100) / 100,
    skewY: Math.round(skewYDegrees * 100) / 100,
  };
}

/**
 * Check if a matrix is approximately the identity matrix
 */
export function isIdentityMatrix(matrix: Matrix, tolerance: number = 1e-6): boolean {
  const [a, b, c, d, tx, ty] = matrix;
  return (
    Math.abs(a - 1) < tolerance &&
    Math.abs(b) < tolerance &&
    Math.abs(c) < tolerance &&
    Math.abs(d - 1) < tolerance &&
    Math.abs(tx) < tolerance &&
    Math.abs(ty) < tolerance
  );
}

import type { CanvasElement, SubPath, Command } from '../../types';
import type { ComplianceIssue } from './slice';

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

function getPathBounds(subPaths: SubPath[]): Bounds | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasPoints = false;

  for (const sp of subPaths) {
    for (const cmd of sp as Command[]) {
      if (cmd.type === 'Z') continue;
      hasPoints = true;
      const p = cmd.position;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      if (cmd.type === 'C') {
        for (const cp of [cmd.controlPoint1, cmd.controlPoint2]) {
          if (cp.x < minX) minX = cp.x;
          if (cp.y < minY) minY = cp.y;
          if (cp.x > maxX) maxX = cp.x;
          if (cp.y > maxY) maxY = cp.y;
        }
      }
    }
  }
  if (!hasPoints) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function nearestMultiple(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

function isOnGrid(value: number, grid: number, tolerance: number): boolean {
  const nearest = nearestMultiple(value, grid);
  return Math.abs(value - nearest) <= tolerance;
}

export function analyzeGridCompliance(
  elements: CanvasElement[],
  options: {
    gridSize: number;
    tolerance: number;
    checkPositions: boolean;
    checkDimensions: boolean;
  }
): { issues: ComplianceIssue[]; totalChecks: number; passedChecks: number } {
  const issues: ComplianceIssue[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  const { gridSize, tolerance, checkPositions, checkDimensions } = options;
  if (gridSize <= 0) return { issues, totalChecks: 0, passedChecks: 0 };

  for (const el of elements) {
    if (el.type !== 'path') continue;
    const bounds = getPathBounds(el.data.subPaths);
    if (!bounds) continue;

    if (checkPositions) {
      // Check X position
      totalChecks++;
      if (!isOnGrid(bounds.minX, gridSize, tolerance)) {
        const nearest = nearestMultiple(bounds.minX, gridSize);
        issues.push({
          elementId: el.id,
          type: 'off-grid-x',
          actual: Math.round(bounds.minX * 100) / 100,
          nearest,
          offset: Math.round((bounds.minX - nearest) * 100) / 100,
          description: `X position ${bounds.minX.toFixed(1)} is ${Math.abs(bounds.minX - nearest).toFixed(1)}px off grid`,
        });
      } else {
        passedChecks++;
      }

      // Check Y position
      totalChecks++;
      if (!isOnGrid(bounds.minY, gridSize, tolerance)) {
        const nearest = nearestMultiple(bounds.minY, gridSize);
        issues.push({
          elementId: el.id,
          type: 'off-grid-y',
          actual: Math.round(bounds.minY * 100) / 100,
          nearest,
          offset: Math.round((bounds.minY - nearest) * 100) / 100,
          description: `Y position ${bounds.minY.toFixed(1)} is ${Math.abs(bounds.minY - nearest).toFixed(1)}px off grid`,
        });
      } else {
        passedChecks++;
      }
    }

    if (checkDimensions) {
      // Check width
      totalChecks++;
      if (!isOnGrid(bounds.width, gridSize, tolerance)) {
        const nearest = nearestMultiple(bounds.width, gridSize);
        issues.push({
          elementId: el.id,
          type: 'off-grid-width',
          actual: Math.round(bounds.width * 100) / 100,
          nearest,
          offset: Math.round((bounds.width - nearest) * 100) / 100,
          description: `Width ${bounds.width.toFixed(1)} is ${Math.abs(bounds.width - nearest).toFixed(1)}px off grid unit`,
        });
      } else {
        passedChecks++;
      }

      // Check height
      totalChecks++;
      if (!isOnGrid(bounds.height, gridSize, tolerance)) {
        const nearest = nearestMultiple(bounds.height, gridSize);
        issues.push({
          elementId: el.id,
          type: 'off-grid-height',
          actual: Math.round(bounds.height * 100) / 100,
          nearest,
          offset: Math.round((bounds.height - nearest) * 100) / 100,
          description: `Height ${bounds.height.toFixed(1)} is ${Math.abs(bounds.height - nearest).toFixed(1)}px off grid unit`,
        });
      } else {
        passedChecks++;
      }
    }
  }

  return { issues, totalChecks, passedChecks };
}

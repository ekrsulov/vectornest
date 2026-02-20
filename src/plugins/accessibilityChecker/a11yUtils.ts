import type { CanvasElement, SubPath, Command } from '../../types';
import type { A11yIssue, A11ySeverity } from './slice';

interface ElBounds {
  width: number;
  height: number;
  area: number;
}

function getPathBounds(subPaths: SubPath[]): ElBounds | null {
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
    }
  }
  if (!hasPoints) return null;
  const w = maxX - minX;
  const h = maxY - minY;
  return { width: w, height: h, area: w * h };
}

function issue(
  elementId: string,
  type: A11yIssue['type'],
  severity: A11ySeverity,
  value: number,
  threshold: number,
  description: string,
  suggestion: string
): A11yIssue {
  return { elementId, type, severity, value: Math.round(value * 10) / 10, threshold, description, suggestion };
}

export function checkAccessibility(
  elements: CanvasElement[],
  options: {
    minTouchTarget: number;
    minElementSize: number;
    minStrokeWidth: number;
    checkTouchTargets: boolean;
    checkMinSize: boolean;
    checkThinStrokes: boolean;
    checkTinyElements: boolean;
  }
): A11yIssue[] {
  const issues: A11yIssue[] = [];

  for (const el of elements) {
    if (el.type !== 'path') continue;
    const bounds = getPathBounds(el.data.subPaths);
    if (!bounds) continue;

    // Touch target check (WCAG 2.5.8 - minimum 44x44 CSS pixels)
    if (options.checkTouchTargets) {
      const minDim = Math.min(bounds.width, bounds.height);
      if (minDim < options.minTouchTarget) {
        const severity: A11ySeverity = minDim < options.minTouchTarget * 0.5 ? 'fail' : 'warning';
        issues.push(issue(
          el.id, 'touch-target', severity, minDim, options.minTouchTarget,
          `Touch target is ${minDim.toFixed(1)}px (min: ${options.minTouchTarget}px)`,
          `Increase size to at least ${options.minTouchTarget}×${options.minTouchTarget}px`
        ));
      }
    }

    // Minimum visible size
    if (options.checkMinSize) {
      const maxDim = Math.max(bounds.width, bounds.height);
      if (maxDim < options.minElementSize && maxDim > 0) {
        issues.push(issue(
          el.id, 'min-size', 'warning', maxDim, options.minElementSize,
          `Element is only ${maxDim.toFixed(1)}px (hard to see)`,
          `Scale up to at least ${options.minElementSize}px`
        ));
      }
    }

    // Tiny element check (area-based)
    if (options.checkTinyElements) {
      if (bounds.area > 0 && bounds.area < 16) {
        issues.push(issue(
          el.id, 'tiny-element', 'fail', bounds.area, 16,
          `Element area is ${bounds.area.toFixed(1)}px² (nearly invisible)`,
          'Consider removing or enlarging this element'
        ));
      }
    }

    // Thin stroke check
    if (options.checkThinStrokes) {
      const sw = el.data.strokeWidth ?? 0;
      const hasStroke = el.data.strokeColor && el.data.strokeColor !== 'none';
      if (hasStroke && sw > 0 && sw < options.minStrokeWidth) {
        issues.push(issue(
          el.id, 'thin-stroke', 'warning', sw, options.minStrokeWidth,
          `Stroke width ${sw}px may not render on screen`,
          `Increase stroke to at least ${options.minStrokeWidth}px`
        ));
      }
    }
  }

  return issues;
}

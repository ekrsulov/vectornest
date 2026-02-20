import type { CanvasElement, SubPath, Command } from '../../types';
import type { AuditIssue, AuditSummary, IssueSeverity, IssueCategory } from './slice';

interface AuditOptions {
  checkEmptyGroups: boolean;
  checkZeroSize: boolean;
  checkInvisible: boolean;
  checkOutOfBounds: boolean;
  checkComplexity: boolean;
  checkMissingStyle: boolean;
  complexityThreshold: number;
  boundsLimit: number;
}

function countPoints(subPaths: SubPath[]): number {
  let count = 0;
  for (const sp of subPaths) {
    for (const cmd of sp as Command[]) {
      if (cmd.type !== 'Z') count++;
    }
  }
  return count;
}

function getPathBounds(subPaths: SubPath[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } | null {
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
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function addIssue(
  issues: AuditIssue[],
  elementId: string,
  category: IssueCategory,
  severity: IssueSeverity,
  description: string,
  suggestion: string
): void {
  issues.push({ elementId, category, severity, description, suggestion });
}

export function auditDocument(
  elements: CanvasElement[],
  options: AuditOptions
): { issues: AuditIssue[]; summary: AuditSummary } {
  const issues: AuditIssue[] = [];
  let pathCount = 0;
  let groupCount = 0;
  let otherCount = 0;

  for (const el of elements) {
    if (el.type === 'path') {
      pathCount++;

      const points = countPoints(el.data.subPaths);
      const bounds = getPathBounds(el.data.subPaths);

      // Check zero-size paths (no points or zero dimensions)
      if (options.checkZeroSize) {
        if (points === 0) {
          addIssue(issues, el.id, 'zero-size', 'error',
            'Path has no points',
            'Remove this empty path element');
        } else if (bounds && bounds.width === 0 && bounds.height === 0) {
          addIssue(issues, el.id, 'zero-size', 'warning',
            'Path has zero dimensions (single point)',
            'This path is invisible, consider removing it');
        }
      }

      // Check invisible elements
      if (options.checkInvisible) {
        const fillColor = el.data.fillColor ?? 'none';
        const strokeColor = el.data.strokeColor ?? 'none';
        const fillOpacity = el.data.fillOpacity ?? 1;
        const strokeOpacity = el.data.strokeOpacity ?? 1;
        const strokeWidth = el.data.strokeWidth ?? 0;

        const hasFill = fillColor !== 'none' && fillColor !== 'transparent' && fillOpacity > 0;
        const hasStroke = strokeColor !== 'none' && strokeColor !== 'transparent' && strokeOpacity > 0 && strokeWidth > 0;

        if (!hasFill && !hasStroke && points > 0) {
          addIssue(issues, el.id, 'invisible', 'warning',
            'Path has no visible fill or stroke',
            'Add fill/stroke or remove if unnecessary');
        }

        if (fillOpacity === 0 && strokeOpacity === 0) {
          addIssue(issues, el.id, 'invisible', 'warning',
            'Element is fully transparent (opacity 0)',
            'Increase opacity or remove element');
        }
      }

      // Check out of bounds
      if (options.checkOutOfBounds && bounds) {
        const limit = options.boundsLimit;
        if (bounds.minX < -limit || bounds.minY < -limit || bounds.maxX > limit || bounds.maxY > limit) {
          addIssue(issues, el.id, 'out-of-bounds', 'info',
            `Element extends beyond ${limit}px from origin`,
            'Move element closer to canvas center');
        }
      }

      // Check excessive complexity
      if (options.checkComplexity && points > options.complexityThreshold) {
        addIssue(issues, el.id, 'excessive-complexity', 'warning',
          `Path has ${points} points (threshold: ${options.complexityThreshold})`,
          'Simplify path to improve performance');
      }

      // Check missing style
      if (options.checkMissingStyle) {
        const fillColor = el.data.fillColor;
        const strokeColor = el.data.strokeColor;
        if ((!fillColor || fillColor === 'none') && (!strokeColor || strokeColor === 'none')) {
          addIssue(issues, el.id, 'missing-style', 'info',
            'Path has no fill and no stroke color set',
            'Set a fill or stroke color');
        }
      }

    } else if (el.type === 'group') {
      groupCount++;

      // Check empty groups
      if (options.checkEmptyGroups) {
        if (!el.data.childIds || el.data.childIds.length === 0) {
          addIssue(issues, el.id, 'empty-group', 'warning',
            'Group has no children',
            'Remove empty group or add elements to it');
        }
      }
    } else {
      otherCount++;
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  const summary: AuditSummary = {
    totalElements: elements.length,
    pathCount,
    groupCount,
    otherCount,
    issueCount: issues.length,
    errorCount,
    warningCount,
    infoCount,
  };

  return { issues, summary };
}

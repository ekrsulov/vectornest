import type { AlignmentIssue } from './slice';
import type { CanvasElement, SubPath, Command } from '../../types';

interface ElementBounds {
  id: string;
  minX: number; minY: number;
  maxX: number; maxY: number;
  cx: number; cy: number;
  width: number; height: number;
}

function getPathBounds(el: CanvasElement): ElementBounds | null {
  if (el.type !== 'path') return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasPoints = false;
  el.data.subPaths.forEach((sp: SubPath) => {
    sp.forEach((c: Command) => {
      if (c.type === 'Z') return;
      hasPoints = true;
      const p = c.position;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
  });
  if (!hasPoints) return null;
  return {
    id: el.id,
    minX, minY, maxX, maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export interface AlignmentLine {
  type: 'perfect' | 'near-miss';
  axis: 'horizontal' | 'vertical';
  position: number;
  elementIds: string[];
  offset: number;
}

export function analyzeAlignments(
  elements: CanvasElement[],
  tolerance: number
): { issues: AlignmentIssue[]; lines: AlignmentLine[] } {
  const boundsList: ElementBounds[] = [];
  for (const el of elements) {
    const b = getPathBounds(el);
    if (b) boundsList.push(b);
  }

  if (boundsList.length < 2) return { issues: [], lines: [] };

  const issues: AlignmentIssue[] = [];
  const lines: AlignmentLine[] = [];

  // Check horizontal alignment (same Y values)
  const yEdges = boundsList.flatMap((b) => [
    { id: b.id, value: b.minY, label: 'top' },
    { id: b.id, value: b.cy, label: 'center-y' },
    { id: b.id, value: b.maxY, label: 'bottom' },
  ]);

  // Check vertical alignment (same X values)
  const xEdges = boundsList.flatMap((b) => [
    { id: b.id, value: b.minX, label: 'left' },
    { id: b.id, value: b.cx, label: 'center-x' },
    { id: b.id, value: b.maxX, label: 'right' },
  ]);

  // Find near-alignment pairs in Y (horizontal alignment)
  for (let i = 0; i < yEdges.length; i++) {
    for (let j = i + 1; j < yEdges.length; j++) {
      if (yEdges[i].id === yEdges[j].id) continue;
      const diff = Math.abs(yEdges[i].value - yEdges[j].value);
      if (diff <= tolerance && diff > 0.1) {
        issues.push({
          type: 'near-align-h',
          elementIds: [yEdges[i].id, yEdges[j].id],
          offset: diff,
          description: `${yEdges[i].label} ↔ ${yEdges[j].label} off by ${diff.toFixed(1)}px`,
        });
        lines.push({
          type: 'near-miss',
          axis: 'horizontal',
          position: (yEdges[i].value + yEdges[j].value) / 2,
          elementIds: [yEdges[i].id, yEdges[j].id],
          offset: diff,
        });
      } else if (diff <= 0.1) {
        lines.push({
          type: 'perfect',
          axis: 'horizontal',
          position: yEdges[i].value,
          elementIds: [yEdges[i].id, yEdges[j].id],
          offset: 0,
        });
      }
    }
  }

  // Find near-alignment pairs in X (vertical alignment)
  for (let i = 0; i < xEdges.length; i++) {
    for (let j = i + 1; j < xEdges.length; j++) {
      if (xEdges[i].id === xEdges[j].id) continue;
      const diff = Math.abs(xEdges[i].value - xEdges[j].value);
      if (diff <= tolerance && diff > 0.1) {
        issues.push({
          type: 'near-align-v',
          elementIds: [xEdges[i].id, xEdges[j].id],
          offset: diff,
          description: `${xEdges[i].label} ↔ ${xEdges[j].label} off by ${diff.toFixed(1)}px`,
        });
        lines.push({
          type: 'near-miss',
          axis: 'vertical',
          position: (xEdges[i].value + xEdges[j].value) / 2,
          elementIds: [xEdges[i].id, xEdges[j].id],
          offset: diff,
        });
      } else if (diff <= 0.1) {
        lines.push({
          type: 'perfect',
          axis: 'vertical',
          position: xEdges[i].value,
          elementIds: [xEdges[i].id, xEdges[j].id],
          offset: 0,
        });
      }
    }
  }

  // Check near-same dimensions
  for (let i = 0; i < boundsList.length; i++) {
    for (let j = i + 1; j < boundsList.length; j++) {
      const wDiff = Math.abs(boundsList[i].width - boundsList[j].width);
      if (wDiff <= tolerance && wDiff > 0.1) {
        issues.push({
          type: 'near-same-width',
          elementIds: [boundsList[i].id, boundsList[j].id],
          offset: wDiff,
          description: `Width differs by ${wDiff.toFixed(1)}px`,
        });
      }

      const hDiff = Math.abs(boundsList[i].height - boundsList[j].height);
      if (hDiff <= tolerance && hDiff > 0.1) {
        issues.push({
          type: 'near-same-height',
          elementIds: [boundsList[i].id, boundsList[j].id],
          offset: hDiff,
          description: `Height differs by ${hDiff.toFixed(1)}px`,
        });
      }
    }
  }

  // Deduplicate lines by position (merge close lines)
  const dedupedLines: AlignmentLine[] = [];
  for (const line of lines) {
    const existing = dedupedLines.find(
      (l) => l.axis === line.axis && l.type === line.type && Math.abs(l.position - line.position) < 0.5
    );
    if (existing) {
      for (const id of line.elementIds) {
        if (!existing.elementIds.includes(id)) {
          existing.elementIds.push(id);
        }
      }
    } else {
      dedupedLines.push({ ...line });
    }
  }

  // Sort issues by offset (smallest = most important to fix)
  issues.sort((a, b) => a.offset - b.offset);

  return { issues, lines: dedupedLines };
}

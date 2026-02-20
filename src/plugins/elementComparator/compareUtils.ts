import type { CanvasElement, SubPath, Command } from '../../types';
import type { ComparisonDiff } from './slice';

function getPathBounds(subPaths: SubPath[]): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let has = false;
  for (const sp of subPaths) {
    for (const cmd of sp as Command[]) {
      if (cmd.type === 'Z') continue;
      has = true;
      const p = cmd.position;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!has) return null;
  return { x: Math.round(minX * 10) / 10, y: Math.round(minY * 10) / 10, w: Math.round((maxX - minX) * 10) / 10, h: Math.round((maxY - minY) * 10) / 10 };
}

function countPoints(subPaths: SubPath[]): { total: number; lines: number; curves: number; subPaths: number } {
  let total = 0, lines = 0, curves = 0;
  for (const sp of subPaths) {
    for (const cmd of sp as Command[]) {
      if (cmd.type === 'Z') continue;
      total++;
      if (cmd.type === 'L') lines++;
      if (cmd.type === 'C') curves++;
    }
  }
  return { total, lines, curves, subPaths: subPaths.length };
}

function diff(property: string, a: string, b: string, category: ComparisonDiff['category']): ComparisonDiff {
  return { property, valueA: a, valueB: b, isDifferent: a !== b, category };
}

export function compareElements(elA: CanvasElement, elB: CanvasElement): ComparisonDiff[] {
  const diffs: ComparisonDiff[] = [];

  // Type comparison
  diffs.push(diff('Type', elA.type, elB.type, 'structure'));

  if (elA.type === 'path' && elB.type === 'path') {
    const boundsA = getPathBounds(elA.data.subPaths);
    const boundsB = getPathBounds(elB.data.subPaths);

    // Geometry
    diffs.push(diff('X Position', boundsA ? `${boundsA.x}` : 'N/A', boundsB ? `${boundsB.x}` : 'N/A', 'geometry'));
    diffs.push(diff('Y Position', boundsA ? `${boundsA.y}` : 'N/A', boundsB ? `${boundsB.y}` : 'N/A', 'geometry'));
    diffs.push(diff('Width', boundsA ? `${boundsA.w}` : 'N/A', boundsB ? `${boundsB.w}` : 'N/A', 'geometry'));
    diffs.push(diff('Height', boundsA ? `${boundsA.h}` : 'N/A', boundsB ? `${boundsB.h}` : 'N/A', 'geometry'));

    const statsA = countPoints(elA.data.subPaths);
    const statsB = countPoints(elB.data.subPaths);
    diffs.push(diff('Sub-Paths', `${statsA.subPaths}`, `${statsB.subPaths}`, 'structure'));
    diffs.push(diff('Total Points', `${statsA.total}`, `${statsB.total}`, 'structure'));
    diffs.push(diff('Line Segments', `${statsA.lines}`, `${statsB.lines}`, 'structure'));
    diffs.push(diff('Curve Segments', `${statsA.curves}`, `${statsB.curves}`, 'structure'));

    // Style
    diffs.push(diff('Fill Color', elA.data.fillColor ?? 'none', elB.data.fillColor ?? 'none', 'style'));
    diffs.push(diff('Fill Opacity', `${elA.data.fillOpacity ?? 1}`, `${elB.data.fillOpacity ?? 1}`, 'style'));
    diffs.push(diff('Stroke Color', elA.data.strokeColor ?? 'none', elB.data.strokeColor ?? 'none', 'style'));
    diffs.push(diff('Stroke Width', `${elA.data.strokeWidth ?? 0}`, `${elB.data.strokeWidth ?? 0}`, 'style'));
    diffs.push(diff('Stroke Opacity', `${elA.data.strokeOpacity ?? 1}`, `${elB.data.strokeOpacity ?? 1}`, 'style'));
    diffs.push(diff('Stroke Linecap', elA.data.strokeLinecap ?? 'butt', elB.data.strokeLinecap ?? 'butt', 'style'));
    diffs.push(diff('Stroke Linejoin', elA.data.strokeLinejoin ?? 'miter', elB.data.strokeLinejoin ?? 'miter', 'style'));
    diffs.push(diff('Fill Rule', elA.data.fillRule ?? 'nonzero', elB.data.fillRule ?? 'nonzero', 'style'));
  }

  return diffs;
}

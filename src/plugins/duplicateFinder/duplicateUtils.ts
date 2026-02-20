import type { CanvasElement, SubPath, Command } from '../../types';
import type { DuplicateGroup } from './slice';

interface ShapeFingerprint {
  id: string;
  pointCount: number;
  subPathCount: number;
  width: number;
  height: number;
  aspectRatio: number;
  cx: number;
  cy: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getFingerprint(el: CanvasElement): ShapeFingerprint | null {
  if (el.type !== 'path') return null;

  let pointCount = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasPoints = false;

  for (const sp of el.data.subPaths as SubPath[]) {
    for (const cmd of sp as Command[]) {
      if (cmd.type === 'Z') continue;
      hasPoints = true;
      pointCount++;
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

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    id: el.id,
    pointCount,
    subPathCount: el.data.subPaths.length,
    width,
    height,
    aspectRatio: height > 0 ? width / height : 0,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    fillColor: el.data.fillColor ?? 'none',
    strokeColor: el.data.strokeColor ?? 'none',
    strokeWidth: el.data.strokeWidth ?? 0,
    minX,
    minY,
    maxX,
    maxY,
  };
}

function shapesSimilar(a: ShapeFingerprint, b: ShapeFingerprint, tolerance: number): number {
  // Compare point count
  if (a.pointCount !== b.pointCount) return 0;
  if (a.subPathCount !== b.subPathCount) return 0;

  // Compare dimensions
  const widthDiff = Math.abs(a.width - b.width);
  const heightDiff = Math.abs(a.height - b.height);
  if (widthDiff > tolerance || heightDiff > tolerance) return 0;

  // Compare aspect ratio
  const aspectDiff = Math.abs(a.aspectRatio - b.aspectRatio);
  if (aspectDiff > 0.1) return 0;

  // Score: exact match on dimensions = 100, decreasing with difference
  const dimScore = Math.max(0, 100 - (widthDiff + heightDiff) * 10);
  return dimScore;
}

function boundsOverlap(a: ShapeFingerprint, b: ShapeFingerprint, tolerance: number): boolean {
  // Check if bounding boxes overlap within tolerance
  return (
    a.minX < b.maxX + tolerance &&
    a.maxX > b.minX - tolerance &&
    a.minY < b.maxY + tolerance &&
    a.maxY > b.minY - tolerance
  );
}

function positionsClose(a: ShapeFingerprint, b: ShapeFingerprint, tolerance: number): boolean {
  const dx = Math.abs(a.cx - b.cx);
  const dy = Math.abs(a.cy - b.cy);
  return dx <= tolerance && dy <= tolerance;
}

export function findDuplicates(
  elements: CanvasElement[],
  options: {
    shapeTolerance: number;
    positionTolerance: number;
    checkShape: boolean;
    checkStyle: boolean;
    checkOverlap: boolean;
  }
): DuplicateGroup[] {
  const fingerprints: ShapeFingerprint[] = [];
  for (const el of elements) {
    const fp = getFingerprint(el);
    if (fp) fingerprints.push(fp);
  }

  const groups: DuplicateGroup[] = [];
  const assigned = new Set<string>();

  // Find shape duplicates
  if (options.checkShape) {
    for (let i = 0; i < fingerprints.length; i++) {
      if (assigned.has(fingerprints[i].id)) continue;
      const group: string[] = [fingerprints[i].id];
      let totalSimilarity = 100;
      let matchCount = 0;

      for (let j = i + 1; j < fingerprints.length; j++) {
        if (assigned.has(fingerprints[j].id)) continue;
        const sim = shapesSimilar(fingerprints[i], fingerprints[j], options.shapeTolerance);
        if (sim >= 80) {
          group.push(fingerprints[j].id);
          totalSimilarity += sim;
          matchCount++;
        }
      }

      if (group.length > 1) {
        const avgSim = Math.round(totalSimilarity / (matchCount + 1));
        const matchType = avgSim >= 95 ? 'exact-shape' as const : 'similar-shape' as const;
        groups.push({
          elementIds: group,
          matchType,
          similarity: avgSim,
          description: `${group.length} elements with ${matchType === 'exact-shape' ? 'identical' : 'similar'} shape (${avgSim}% match)`,
        });
        for (const id of group) assigned.add(id);
      }
    }
  }

  // Find style duplicates (elements with same fill, stroke, stroke-width)
  if (options.checkStyle) {
    const styleGroups = new Map<string, string[]>();
    for (const fp of fingerprints) {
      if (assigned.has(fp.id)) continue;
      const key = `${fp.fillColor}|${fp.strokeColor}|${fp.strokeWidth.toFixed(1)}`;
      const existing = styleGroups.get(key);
      if (existing) {
        existing.push(fp.id);
      } else {
        styleGroups.set(key, [fp.id]);
      }
    }
    for (const [_key, ids] of styleGroups) {
      if (ids.length > 1) {
        groups.push({
          elementIds: ids,
          matchType: 'same-style',
          similarity: 100,
          description: `${ids.length} elements with identical styling`,
        });
      }
    }
  }

  // Find overlapping duplicates (same shape at same position)
  if (options.checkOverlap) {
    for (let i = 0; i < fingerprints.length; i++) {
      for (let j = i + 1; j < fingerprints.length; j++) {
        const a = fingerprints[i];
        const b = fingerprints[j];
        const shapeSim = shapesSimilar(a, b, options.shapeTolerance);
        if (shapeSim >= 80 && positionsClose(a, b, options.positionTolerance) && boundsOverlap(a, b, 0)) {
          // Check not already in a group
          const alreadyGrouped = groups.some(
            (g) => g.matchType === 'overlapping' && g.elementIds.includes(a.id) && g.elementIds.includes(b.id)
          );
          if (!alreadyGrouped) {
            groups.push({
              elementIds: [a.id, b.id],
              matchType: 'overlapping',
              similarity: shapeSim,
              description: `Overlapping duplicate elements at (${a.cx.toFixed(0)}, ${a.cy.toFixed(0)})`,
            });
          }
        }
      }
    }
  }

  return groups;
}

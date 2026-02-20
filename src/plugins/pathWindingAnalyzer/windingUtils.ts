import type { CanvasElement, SubPath, Command } from '../../types';
import type { WindingResult } from './slice';

/**
 * Compute signed area of a subpath using the shoelace formula.
 * Positive = CW (screen coords), Negative = CCW.
 * For cubic curves, approximate by sampling control polygon.
 */
function signedArea(cmds: Command[]): number {
  let area = 0;
  const points: Array<{ x: number; y: number }> = [];

  for (const cmd of cmds) {
    if (cmd.type === 'Z') continue;
    if (cmd.type === 'C') {
      points.push(
        { x: cmd.controlPoint1.x, y: cmd.controlPoint1.y },
        { x: cmd.controlPoint2.x, y: cmd.controlPoint2.y },
        { x: cmd.position.x, y: cmd.position.y }
      );
    } else {
      points.push({ x: cmd.position.x, y: cmd.position.y });
    }
  }

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return area / 2;
}

export function analyzeWinding(elements: CanvasElement[]): WindingResult[] {
  const results: WindingResult[] = [];

  for (const el of elements) {
    if (el.type !== 'path') continue;

    const subPathWindings: WindingResult['subPathWindings'] = [];
    let hasMixed = false;
    let firstDir: 'CW' | 'CCW' | null = null;

    for (let idx = 0; idx < el.data.subPaths.length; idx++) {
      const sp = el.data.subPaths[idx] as SubPath;
      const cmds = sp as Command[];
      if (cmds.length < 3) continue;

      const sa = signedArea(cmds);
      const direction: 'CW' | 'CCW' = sa >= 0 ? 'CW' : 'CCW';

      if (firstDir === null) firstDir = direction;
      else if (direction !== firstDir) hasMixed = true;

      subPathWindings.push({
        index: idx,
        direction,
        area: Math.round(Math.abs(sa) * 100) / 100,
      });
    }

    if (subPathWindings.length === 0) continue;

    const fillRule = (el.data?.fillRule as 'nonzero' | 'evenodd') ?? 'nonzero';

    results.push({
      elementId: el.id,
      label: el.id.slice(0, 8),
      subPathWindings,
      fillRule,
      hasConflict: fillRule === 'nonzero' && hasMixed,
    });
  }

  return results;
}

import type { CanvasElement, SubPath, Command } from '../../types';
import type { PathComplexityResult } from './slice';

function angleDiff(a1: number, a2: number): number {
  let d = a2 - a1;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return Math.abs(d);
}

export function scorePathComplexity(elements: CanvasElement[]): PathComplexityResult[] {
  const results: PathComplexityResult[] = [];

  for (const el of elements) {
    if (el.type !== 'path') continue;

    let totalPoints = 0;
    let totalCurves = 0;
    let totalCusps = 0;
    let totalLength = 0;
    const subPaths = el.data.subPaths as SubPath[];

    for (const sp of subPaths) {
      const cmds = sp as Command[];
      for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i];
        if (cmd.type === 'Z') continue;
        totalPoints++;

        if (cmd.type === 'C') {
          totalCurves++;
        }

        // Detect cusps: sharp angle changes between consecutive segments
        if (i > 0 && i < cmds.length - 1) {
          const prev = cmds[i - 1];
          const next = cmds[i + 1];
          if (prev.type !== 'Z' && next.type !== 'Z') {
            const inAngle = Math.atan2(
              cmd.position.y - prev.position.y,
              cmd.position.x - prev.position.x
            ) * (180 / Math.PI);
            const outAngle = Math.atan2(
              next.position.y - cmd.position.y,
              next.position.x - cmd.position.x
            ) * (180 / Math.PI);
            if (angleDiff(inAngle, outAngle) > 120) {
              totalCusps++;
            }
          }
        }

        // Estimate path length
        if (i > 0) {
          const prev = cmds[i - 1];
          if (prev.type !== 'Z') {
            const dx = cmd.position.x - prev.position.x;
            const dy = cmd.position.y - prev.position.y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
          }
        }
      }
    }

    const density = totalLength > 0 ? (totalPoints / totalLength) * 100 : 0;

    // Composite score: weighted combination
    const score = Math.min(100, Math.round(
      totalPoints * 1.5 +
      totalCurves * 2 +
      totalCusps * 5 +
      subPaths.length * 3 +
      density * 10
    ));

    const grade: PathComplexityResult['grade'] =
      score < 20 ? 'simple' :
      score < 50 ? 'moderate' :
      score < 80 ? 'complex' : 'very-complex';

    const label = el.data.metadata?.name as string ||
      el.data.metadata?.label as string || el.id.slice(0, 8);

    results.push({
      elementId: el.id,
      label,
      score,
      grade,
      points: totalPoints,
      curves: totalCurves,
      cusps: totalCusps,
      subPaths: subPaths.length,
      density: Math.round(density * 100) / 100,
    });
  }

  return results;
}

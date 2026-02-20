import type { CanvasElement, SubPath, Command } from '../../types';
import type { SelectionStats } from './slice';

function estimatePerimeter(el: CanvasElement): number {
  if (el.type !== 'path') return 0;
  let perim = 0;
  for (const sp of el.data.subPaths as SubPath[]) {
    const cmds = sp as Command[];
    for (let i = 1; i < cmds.length; i++) {
      const prev = cmds[i - 1];
      const cmd = cmds[i];
      if (cmd.type === 'Z') {
        const first = cmds[0];
        if (first.type !== 'Z' && prev.type !== 'Z') {
          const dx = prev.position.x - first.position.x;
          const dy = prev.position.y - first.position.y;
          perim += Math.sqrt(dx * dx + dy * dy);
        }
        continue;
      }
      if (prev.type === 'Z') continue;
      if (cmd.type === 'L' || cmd.type === 'M') {
        const dx = cmd.position.x - prev.position.x;
        const dy = cmd.position.y - prev.position.y;
        perim += Math.sqrt(dx * dx + dy * dy);
      } else if (cmd.type === 'C') {
        const chord = Math.sqrt(
          (cmd.position.x - prev.position.x) ** 2 +
          (cmd.position.y - prev.position.y) ** 2
        );
        const cp = Math.sqrt(
          (cmd.controlPoint1.x - prev.position.x) ** 2 +
          (cmd.controlPoint1.y - prev.position.y) ** 2
        ) + Math.sqrt(
          (cmd.controlPoint2.x - cmd.controlPoint1.x) ** 2 +
          (cmd.controlPoint2.y - cmd.controlPoint1.y) ** 2
        ) + Math.sqrt(
          (cmd.position.x - cmd.controlPoint2.x) ** 2 +
          (cmd.position.y - cmd.controlPoint2.y) ** 2
        );
        perim += (chord + cp) / 2;
      }
    }
  }
  return perim;
}

export function computeSelectionStats(elements: CanvasElement[]): SelectionStats {
  let pathCount = 0;
  let groupCount = 0;
  let otherCount = 0;
  let totalArea = 0;
  let totalPerimeter = 0;
  let totalPoints = 0;
  let totalSegments = 0;
  let closedPaths = 0;
  let openPaths = 0;

  const widths: number[] = [];
  const heights: number[] = [];

  for (const el of elements) {
    if (el.type === 'path') {
      pathCount++;
      const allPts = (el.data.subPaths as SubPath[]).flatMap((sp: SubPath) =>
        (sp as Command[]).filter((c: Command) => c.type !== 'Z').map((c) => (c as Exclude<Command, { type: 'Z' }>).position)
      );
      if (allPts.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of allPts) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        const w = maxX - minX;
        const h = maxY - minY;
        widths.push(w);
        heights.push(h);
        totalArea += w * h;
      }

      totalPerimeter += estimatePerimeter(el);

      for (const sp of el.data.subPaths as SubPath[]) {
        const cmds = sp as Command[];
        const pts = cmds.filter((c: Command) => c.type !== 'Z');
        totalPoints += pts.length;
        totalSegments += Math.max(0, cmds.length - 1);
        const hasClose = cmds.some((c: Command) => c.type === 'Z');
        if (hasClose) closedPaths++;
        else openPaths++;
      }
    } else if (el.type === 'group') {
      groupCount++;
    } else {
      otherCount++;
    }
  }

  const avgWidth = widths.length > 0 ? widths.reduce((s, v) => s + v, 0) / widths.length : 0;
  const avgHeight = heights.length > 0 ? heights.reduce((s, v) => s + v, 0) / heights.length : 0;

  return {
    count: elements.length,
    pathCount,
    groupCount,
    otherCount,
    totalArea: Math.round(totalArea),
    totalPerimeter: Math.round(totalPerimeter),
    avgWidth: Math.round(avgWidth * 10) / 10,
    avgHeight: Math.round(avgHeight * 10) / 10,
    minWidth: widths.length > 0 ? Math.round(Math.min(...widths) * 10) / 10 : 0,
    maxWidth: widths.length > 0 ? Math.round(Math.max(...widths) * 10) / 10 : 0,
    minHeight: heights.length > 0 ? Math.round(Math.min(...heights) * 10) / 10 : 0,
    maxHeight: heights.length > 0 ? Math.round(Math.max(...heights) * 10) / 10 : 0,
    totalPoints,
    totalSegments,
    closedPaths,
    openPaths,
  };
}

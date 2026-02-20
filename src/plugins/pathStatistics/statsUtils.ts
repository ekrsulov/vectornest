import type { CanvasElement, SubPath, Command } from '../../types';
import type { PathStats } from './slice';

function lineLength(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function estimateSegmentLength(prev: { x: number; y: number } | null, cmd: Command): number {
  if (!prev) return 0;
  if (cmd.type === 'Z' || cmd.type === 'M') return 0;
  if (cmd.type === 'L') return lineLength(prev, cmd.position);
  if (cmd.type === 'C') {
    const chord = lineLength(prev, cmd.position);
    const cp1 = lineLength(prev, cmd.controlPoint1);
    const cp2 = lineLength(cmd.controlPoint1, cmd.controlPoint2);
    const cp3 = lineLength(cmd.controlPoint2, cmd.position);
    return (chord + cp1 + cp2 + cp3) / 2;
  }
  return 0;
}

export function computePathStats(elements: CanvasElement[]): PathStats {
  let totalPaths = 0;
  let totalPoints = 0;
  let totalSegments = 0;
  let totalSubPaths = 0;
  let lineSegments = 0;
  let curveSegments = 0;
  let closeCommands = 0;
  let totalPathLength = 0;
  let shortestPath = Infinity;
  let longestPath = 0;

  for (const el of elements) {
    if (el.type !== 'path') continue;
    totalPaths++;
    totalSubPaths += el.data.subPaths.length;

    let pathLength = 0;
    let prev: { x: number; y: number } | null = null;

    for (const sp of el.data.subPaths as SubPath[]) {
      for (const cmd of sp as Command[]) {
        if (cmd.type === 'Z') {
          closeCommands++;
          continue;
        }
        totalPoints++;
        const segLen = estimateSegmentLength(prev, cmd);
        pathLength += segLen;

        if (cmd.type === 'L') { lineSegments++; totalSegments++; }
        if (cmd.type === 'C') { curveSegments++; totalSegments++; }

        prev = cmd.position;
      }
    }

    totalPathLength += pathLength;
    if (pathLength < shortestPath) shortestPath = pathLength;
    if (pathLength > longestPath) longestPath = pathLength;
  }

  if (totalPaths === 0) {
    return {
      totalPaths: 0, totalPoints: 0, totalSegments: 0, totalSubPaths: 0,
      lineSegments: 0, curveSegments: 0, closeCommands: 0, curveRatio: 0,
      avgPointsPerPath: 0, avgSegmentsPerPath: 0,
      totalPathLength: 0, avgPathLength: 0, shortestPath: 0, longestPath: 0,
      nodeDensity: 0, efficiencyScore: 100,
    };
  }

  const curveRatio = totalSegments > 0 ? Math.round((curveSegments / totalSegments) * 100) : 0;
  const avgPointsPerPath = Math.round((totalPoints / totalPaths) * 10) / 10;
  const avgSegmentsPerPath = Math.round((totalSegments / totalPaths) * 10) / 10;
  const avgPathLength = Math.round(totalPathLength / totalPaths);
  const nodeDensity = totalPathLength > 0 ? Math.round((totalPoints / totalPathLength) * 1000) / 10 : 0;

  // Efficiency: penalize high node density (ideal is ~5 nodes per 100px length)
  const idealDensity = 5;
  const densityRatio = nodeDensity > 0 ? idealDensity / nodeDensity : 1;
  const efficiencyScore = Math.min(100, Math.round(Math.min(densityRatio, 1 / densityRatio) * 100));

  return {
    totalPaths, totalPoints, totalSegments, totalSubPaths,
    lineSegments, curveSegments, closeCommands, curveRatio,
    avgPointsPerPath, avgSegmentsPerPath,
    totalPathLength: Math.round(totalPathLength),
    avgPathLength,
    shortestPath: shortestPath === Infinity ? 0 : Math.round(shortestPath),
    longestPath: Math.round(longestPath),
    nodeDensity, efficiencyScore,
  };
}

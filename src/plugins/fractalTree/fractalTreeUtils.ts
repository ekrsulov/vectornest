import type { SubPath, Command, Point } from '../../types';

/** Simple seeded PRNG (mulberry32) */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TreeParams {
  branchAngle: number;
  depth: number;
  trunkLength: number;
  lengthRatio: number;
  angleVariation: number;
  lengthVariation: number;
  startX: number;
  startY: number;
  seed: number;
}

interface BranchSegment {
  from: Point;
  to: Point;
  depthLevel: number;
}

/**
 * Recursively generate branch segments for a fractal tree.
 */
function generateBranches(
  from: Point,
  angle: number,
  length: number,
  currentDepth: number,
  params: TreeParams,
  rng: () => number,
  segments: BranchSegment[]
): void {
  if (currentDepth > params.depth || length < 1) return;

  // Apply random variation
  const angleVar = (rng() - 0.5) * 2 * params.angleVariation * params.branchAngle;
  const lengthVar = 1 + (rng() - 0.5) * 2 * params.lengthVariation;
  const actualLength = length * lengthVar;
  const actualAngle = angle + angleVar;

  // Compute endpoint
  const rad = (actualAngle * Math.PI) / 180;
  const to: Point = {
    x: from.x + Math.cos(rad) * actualLength,
    y: from.y - Math.sin(rad) * actualLength, // Y-up
  };

  segments.push({ from, to, depthLevel: currentDepth });

  // Branch left
  const nextLength = actualLength * params.lengthRatio;
  generateBranches(to, actualAngle + params.branchAngle, nextLength, currentDepth + 1, params, rng, segments);

  // Branch right
  generateBranches(to, actualAngle - params.branchAngle, nextLength, currentDepth + 1, params, rng, segments);
}

/**
 * Generate a fractal tree as an array of SubPaths.
 * Each branch is a separate subpath for detailed control.
 */
export function generateFractalTree(params: TreeParams): SubPath[] {
  const rng = mulberry32(params.seed);
  const segments: BranchSegment[] = [];
  const start: Point = { x: params.startX, y: params.startY };

  // Start growing upward (90 degrees)
  generateBranches(start, 90, params.trunkLength, 0, params, rng, segments);

  // Convert segments to subpaths
  const subPaths: SubPath[] = [];

  // Group consecutive segments into connected paths for efficiency
  // Each branch segment becomes its own subpath
  for (const seg of segments) {
    const cmds: Command[] = [
      { type: 'M', position: seg.from },
      { type: 'L', position: seg.to },
    ];
    subPaths.push(cmds);
  }

  return subPaths;
}

/**
 * Generate a more organic tree with curved branches.
 */
export function generateOrganicTree(params: TreeParams): SubPath[] {
  const rng = mulberry32(params.seed);
  const subPaths: SubPath[] = [];
  const start: Point = { x: params.startX, y: params.startY };

  function growBranch(from: Point, angle: number, length: number, depth: number): void {
    if (depth > params.depth || length < 1) return;

    const angleVar = (rng() - 0.5) * 2 * params.angleVariation * params.branchAngle;
    const lengthVar = 1 + (rng() - 0.5) * 2 * params.lengthVariation;
    const actualLength = length * lengthVar;
    const actualAngle = angle + angleVar;

    const rad = (actualAngle * Math.PI) / 180;
    const to: Point = {
      x: from.x + Math.cos(rad) * actualLength,
      y: from.y - Math.sin(rad) * actualLength,
    };

    // Curved branch with slight bend
    const midAngle = actualAngle + (rng() - 0.5) * 15;
    const midRad = (midAngle * Math.PI) / 180;
    const midDist = actualLength * 0.5;
    const cp: Point = {
      x: from.x + Math.cos(midRad) * midDist + (rng() - 0.5) * 5,
      y: from.y - Math.sin(midRad) * midDist + (rng() - 0.5) * 5,
    };

    subPaths.push([
      { type: 'M', position: from },
      {
        type: 'C',
        controlPoint1: {
          x: cp.x,
          y: cp.y,
          commandIndex: 0,
          pointIndex: 0,
          anchor: to,
          isControl: true,
        },
        controlPoint2: {
          x: (cp.x + to.x) / 2,
          y: (cp.y + to.y) / 2,
          commandIndex: 0,
          pointIndex: 1,
          anchor: to,
          isControl: true,
        },
        position: to,
      },
    ]);

    const nextLength = actualLength * params.lengthRatio;
    growBranch(to, actualAngle + params.branchAngle, nextLength, depth + 1);
    growBranch(to, actualAngle - params.branchAngle, nextLength, depth + 1);

    // Add occasional third branch for more organic look
    if (rng() < 0.3 && depth < params.depth - 1) {
      const thirdAngle = actualAngle + (rng() - 0.5) * params.branchAngle * 0.5;
      growBranch(to, thirdAngle, nextLength * 0.8, depth + 1);
    }
  }

  growBranch(start, 90, params.trunkLength, 0);
  return subPaths;
}

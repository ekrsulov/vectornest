import type { Point, SubPath, Command, PathData } from '../../types';

/** Easing functions */
const easings: Record<string, (t: number) => number> = {
  'linear': (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

/** Linearly interpolate between two points */
const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** Interpolate between two numbers */
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Parse hex color to RGB */
const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

/** RGB to hex color */
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/** Interpolate between two hex colors */
const lerpColor = (a: string, b: string, t: number): string => {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(lerp(ar, br, t), lerp(ag, bg, t), lerp(ab, bb, t));
};

/**
 * Convert a cubic curve command to the "same" type as `target` by
 * generating a synthetic cubic curve from a line segment.
 */
const promoteToC = (
  cmd: Command & { type: 'M' | 'L' },
  prevPos: Point
): Command & { type: 'C' } => {
  const pos = cmd.position;
  // Create a cubic bezier that traces the straight line by placing
  // control points at 1/3 and 2/3 along the segment
  return {
    type: 'C',
    controlPoint1: {
      x: prevPos.x + (pos.x - prevPos.x) / 3,
      y: prevPos.y + (pos.y - prevPos.y) / 3,
      commandIndex: 0,
      pointIndex: 0,
      anchor: prevPos,
      isControl: true,
    },
    controlPoint2: {
      x: prevPos.x + (2 * (pos.x - prevPos.x)) / 3,
      y: prevPos.y + (2 * (pos.y - prevPos.y)) / 3,
      commandIndex: 0,
      pointIndex: 1,
      anchor: pos,
      isControl: true,
    },
    position: { ...pos },
  };
};

/**
 * Interpolate two sub-paths that have the same number of commands.
 * Commands are interpolated element-wise. If command types differ
 * (L vs C), the line segment is promoted to a cubic bezier first.
 */
const interpolateSubPaths = (a: SubPath, b: SubPath, t: number): SubPath => {
  const len = Math.min(a.length, b.length);
  const result: Command[] = [];

  let prevPosA: Point = { x: 0, y: 0 };
  let prevPosB: Point = { x: 0, y: 0 };

  for (let i = 0; i < len; i++) {
    let cmdA = a[i];
    let cmdB = b[i];

    if (cmdA.type === 'Z' || cmdB.type === 'Z') {
      result.push({ type: 'Z' });
      continue;
    }

    // Promote L→C if types differ (keeping M as-is)
    if (cmdA.type !== cmdB.type) {
      if (cmdA.type === 'C' && (cmdB.type === 'M' || cmdB.type === 'L')) {
        cmdB = promoteToC(cmdB, prevPosB);
      } else if (cmdB.type === 'C' && (cmdA.type === 'M' || cmdA.type === 'L')) {
        cmdA = promoteToC(cmdA, prevPosA);
      }
    }

    if (cmdA.type === 'M' || cmdA.type === 'L') {
      const bCmd = cmdB as { position: Point };
      const pos = lerpPoint(cmdA.position, bCmd.position, t);
      prevPosA = cmdA.position;
      prevPosB = bCmd.position;
      result.push({ type: cmdA.type, position: pos });
    } else if (cmdA.type === 'C' && cmdB.type === 'C') {
      const pos = lerpPoint(cmdA.position, cmdB.position, t);
      const cp1 = lerpPoint(cmdA.controlPoint1, cmdB.controlPoint1, t);
      const cp2 = lerpPoint(cmdA.controlPoint2, cmdB.controlPoint2, t);
      prevPosA = cmdA.position;
      prevPosB = cmdB.position;
      result.push({
        type: 'C',
        controlPoint1: { ...cmdA.controlPoint1, ...cp1 },
        controlPoint2: { ...cmdA.controlPoint2, ...cp2 },
        position: pos,
      });
    } else {
      // Fallback: just take A's command
      if (cmdA.type !== 'Z') {
        prevPosA = cmdA.position;
      }
      result.push(cmdA);
    }
  }

  return result;
};

/**
 * Generate `steps` intermediate path data objects by morphing from pathA to pathB.
 */
export const generateMorphSteps = (
  pathA: PathData,
  pathB: PathData,
  steps: number,
  easing: string,
  distributeColors: boolean
): PathData[] => {
  const easeFn = easings[easing] ?? easings.linear;
  const result: PathData[] = [];

  // Use the minimum subpath count from both paths
  const subPathCount = Math.min(pathA.subPaths.length, pathB.subPaths.length);

  for (let step = 1; step <= steps; step++) {
    const rawT = step / (steps + 1);
    const t = easeFn(rawT);

    const morphedSubPaths: SubPath[] = [];
    for (let sp = 0; sp < subPathCount; sp++) {
      morphedSubPaths.push(interpolateSubPaths(pathA.subPaths[sp], pathB.subPaths[sp], t));
    }

    // Interpolate visual properties
    const morphedData: PathData = {
      ...pathA,
      subPaths: morphedSubPaths,
      fillOpacity: lerp(pathA.fillOpacity ?? 1, pathB.fillOpacity ?? 1, t),
      strokeOpacity: lerp(pathA.strokeOpacity ?? 1, pathB.strokeOpacity ?? 1, t),
      strokeWidth: lerp(pathA.strokeWidth ?? 1, pathB.strokeWidth ?? 1, t),
    };

    if (distributeColors) {
      const fillA = pathA.fillColor ?? '#000000';
      const fillB = pathB.fillColor ?? '#000000';
      const strokeA = pathA.strokeColor ?? 'none';
      const strokeB = pathB.strokeColor ?? 'none';

      if (fillA !== 'none' && fillB !== 'none') {
        morphedData.fillColor = lerpColor(fillA, fillB, t);
      }
      if (strokeA !== 'none' && strokeB !== 'none') {
        morphedData.strokeColor = lerpColor(strokeA, strokeB, t);
      }
    }

    result.push(morphedData);
  }

  return result;
};

import type { SubPath, Command, Point, ControlPoint } from '../../types';
import type { KnotStyle } from './slice';

function makeCP(p: Point, anchor: Point): ControlPoint {
  return { x: p.x, y: p.y, commandIndex: 0, pointIndex: 0, anchor, isControl: true };
}

function rotatePoint(p: Point, cx: number, cy: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/* ------------------------------------------------------------------ */
/*  Basic interlace knot (circular with over-under crossings)         */
/* ------------------------------------------------------------------ */
function generateBasicKnot(
  loops: number, size: number, gap: number, curvature: number,
  cx: number, cy: number, rotation: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const angleStep = (Math.PI * 2) / loops;
  const innerR = size * 0.4;
  const outerR = size;
  const cpFactor = curvature * 0.8;

  // Outer strand
  for (let i = 0; i < loops; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 0.5) * angleStep;
    const a3 = (i + 1) * angleStep;

    const p1: Point = { x: cx + outerR * Math.cos(a1), y: cy + outerR * Math.sin(a1) };
    const peak: Point = { x: cx + (outerR + size * 0.3) * Math.cos(a2), y: cy + (outerR + size * 0.3) * Math.sin(a2) };
    const p3: Point = { x: cx + outerR * Math.cos(a3), y: cy + outerR * Math.sin(a3) };

    const cp1: Point = {
      x: p1.x + (peak.x - p1.x) * cpFactor,
      y: p1.y + (peak.y - p1.y) * cpFactor,
    };
    const cp2: Point = {
      x: p3.x + (peak.x - p3.x) * cpFactor,
      y: p3.y + (peak.y - p3.y) * cpFactor,
    };

    const rp1 = rotatePoint(p1, cx, cy, rotation);
    const rp3 = rotatePoint(p3, cx, cy, rotation);
    const rcp1 = rotatePoint(cp1, cx, cy, rotation);
    const rcp2 = rotatePoint(cp2, cx, cy, rotation);

    subPaths.push([
      { type: 'M', position: rp1 },
      {
        type: 'C',
        controlPoint1: makeCP(rcp1, rp3),
        controlPoint2: makeCP(rcp2, rp3),
        position: rp3,
      },
    ]);

    // Inner connecting strand
    const ip1: Point = { x: cx + innerR * Math.cos(a1), y: cy + innerR * Math.sin(a1) };
    const ip3: Point = { x: cx + innerR * Math.cos(a3), y: cy + innerR * Math.sin(a3) };
    const midAngle = (a1 + a3) / 2;
    const valley: Point = {
      x: cx + (innerR - size * 0.15) * Math.cos(midAngle),
      y: cy + (innerR - size * 0.15) * Math.sin(midAngle),
    };

    const icp1: Point = {
      x: ip1.x + (valley.x - ip1.x) * cpFactor,
      y: ip1.y + (valley.y - ip1.y) * cpFactor,
    };
    const icp2: Point = {
      x: ip3.x + (valley.x - ip3.x) * cpFactor,
      y: ip3.y + (valley.y - ip3.y) * cpFactor,
    };

    const rip1 = rotatePoint(ip1, cx, cy, rotation);
    const rip3 = rotatePoint(ip3, cx, cy, rotation);
    const ricp1 = rotatePoint(icp1, cx, cy, rotation);
    const ricp2 = rotatePoint(icp2, cx, cy, rotation);

    subPaths.push([
      { type: 'M', position: rip1 },
      {
        type: 'C',
        controlPoint1: makeCP(ricp1, rip3),
        controlPoint2: makeCP(ricp2, rip3),
        position: rip3,
      },
    ]);

    // Cross-connector strands (over-under weave)
    const connP1 = rotatePoint(
      { x: cx + outerR * Math.cos(a3), y: cy + outerR * Math.sin(a3) },
      cx, cy, rotation
    );
    const connP2 = rotatePoint(
      { x: cx + innerR * Math.cos(a3 + gap * 0.01), y: cy + innerR * Math.sin(a3 + gap * 0.01) },
      cx, cy, rotation
    );

    subPaths.push([
      { type: 'M', position: connP1 },
      { type: 'L', position: connP2 },
    ]);
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Triquetra (3-pointed Celtic knot)                                 */
/* ------------------------------------------------------------------ */
function generateTriquetra(
  size: number, curvature: number,
  cx: number, cy: number, rotation: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const r = size;

  for (let i = 0; i < 3; i++) {
    const a = (i * 120 + rotation) * Math.PI / 180;
    const aNext = ((i + 1) * 120 + rotation) * Math.PI / 180;

    const p1: Point = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    const p2: Point = { x: cx + r * Math.cos(aNext), y: cy + r * Math.sin(aNext) };

    const midA = (a + aNext) / 2;
    const bulge = r * curvature * 0.8;
    const cp1: Point = {
      x: cx + (r + bulge) * Math.cos(a + (aNext - a) * 0.3),
      y: cy + (r + bulge) * Math.sin(a + (aNext - a) * 0.3),
    };
    const cp2: Point = {
      x: cx + (r + bulge) * Math.cos(a + (aNext - a) * 0.7),
      y: cy + (r + bulge) * Math.sin(a + (aNext - a) * 0.7),
    };

    // Outer curve
    subPaths.push([
      { type: 'M', position: p1 },
      {
        type: 'C',
        controlPoint1: makeCP(cp1, p2),
        controlPoint2: makeCP(cp2, p2),
        position: p2,
      },
    ]);

    // Inner curve (opposite bulge)
    const innerBulge = r * curvature * 0.3;
    const icp1: Point = {
      x: cx + (r - innerBulge) * Math.cos(midA - 0.2),
      y: cy + (r - innerBulge) * Math.sin(midA - 0.2),
    };
    const icp2: Point = {
      x: cx + (r - innerBulge) * Math.cos(midA + 0.2),
      y: cy + (r - innerBulge) * Math.sin(midA + 0.2),
    };

    subPaths.push([
      { type: 'M', position: p1 },
      {
        type: 'C',
        controlPoint1: makeCP(icp1, p2),
        controlPoint2: makeCP(icp2, p2),
        position: p2,
      },
    ]);
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Quaternary knot (4-fold symmetry)                                 */
/* ------------------------------------------------------------------ */
function generateQuaternary(
  size: number, curvature: number,
  cx: number, cy: number, rotation: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const r = size;

  for (let i = 0; i < 4; i++) {
    const a = (i * 90 + rotation) * Math.PI / 180;
    const aNext = ((i + 1) * 90 + rotation) * Math.PI / 180;

    const p1: Point = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    const p2: Point = { x: cx + r * Math.cos(aNext), y: cy + r * Math.sin(aNext) };

    const bulge = r * curvature;
    const midA = (a + aNext) / 2;

    const cp1: Point = {
      x: cx + (r + bulge) * Math.cos(midA),
      y: cy + (r + bulge) * Math.sin(midA),
    };
    const cp2: Point = {
      x: cx + (r + bulge) * Math.cos(midA),
      y: cy + (r + bulge) * Math.sin(midA),
    };

    subPaths.push([
      { type: 'M', position: p1 },
      {
        type: 'C',
        controlPoint1: makeCP(cp1, p2),
        controlPoint2: makeCP(cp2, p2),
        position: p2,
      },
    ]);

    // Inner weave strand
    const icp: Point = {
      x: cx + (r * 0.3) * Math.cos(midA),
      y: cy + (r * 0.3) * Math.sin(midA),
    };

    subPaths.push([
      { type: 'M', position: p1 },
      {
        type: 'C',
        controlPoint1: makeCP(icp, p2),
        controlPoint2: makeCP(icp, p2),
        position: p2,
      },
    ]);
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Ring knot (concentric interlaced rings)                           */
/* ------------------------------------------------------------------ */
function generateRingKnot(
  size: number, curvature: number, rings: number, gap: number,
  cx: number, cy: number, rotation: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const segments = 24;

  for (let ring = 0; ring < rings; ring++) {
    const r = size * 0.5 + ring * gap * 3;
    const wobbleAmp = r * (1 - curvature) * 0.15;

    const pts: Point[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const wobble = wobbleAmp * Math.sin(a * (3 + ring));
      const rr = r + wobble;
      const p: Point = { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) };
      pts.push(rotatePoint(p, cx, cy, rotation));
    }

    // Build smooth curve
    const cmds: Command[] = [{ type: 'M', position: pts[0] }];
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const mid: Point = { x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 };
      cmds.push({
        type: 'C',
        controlPoint1: makeCP(mid, curr),
        controlPoint2: makeCP(mid, curr),
        position: curr,
      });
    }
    cmds.push({ type: 'Z' });

    subPaths.push(cmds);
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Shield knot (protective knot symbol)                              */
/* ------------------------------------------------------------------ */
function generateShieldKnot(
  size: number, curvature: number,
  cx: number, cy: number, rotation: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const r = size;
  const inset = r * 0.4;

  // Four outer arcs
  for (let i = 0; i < 4; i++) {
    const a = (i * 90 + rotation) * Math.PI / 180;
    const aNext = ((i + 1) * 90 + rotation) * Math.PI / 180;

    const p1: Point = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    const p2: Point = { x: cx + r * Math.cos(aNext), y: cy + r * Math.sin(aNext) };

    const midA = (a + aNext) / 2;
    const bulge = r * curvature * 0.5;
    const cp: Point = {
      x: cx + (r + bulge) * Math.cos(midA),
      y: cy + (r + bulge) * Math.sin(midA),
    };

    subPaths.push([
      { type: 'M', position: p1 },
      {
        type: 'C',
        controlPoint1: makeCP(cp, p2),
        controlPoint2: makeCP(cp, p2),
        position: p2,
      },
    ]);

    // Inner square corner connections
    const ip1: Point = { x: cx + inset * Math.cos(a), y: cy + inset * Math.sin(a) };
    const ip2: Point = { x: cx + inset * Math.cos(aNext), y: cy + inset * Math.sin(aNext) };

    subPaths.push([
      { type: 'M', position: ip1 },
      { type: 'L', position: ip2 },
    ]);

    // Cross strands connecting outer to inner
    subPaths.push([
      { type: 'M', position: p1 },
      { type: 'L', position: ip1 },
    ]);
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export function generateCelticKnot(params: {
  style: KnotStyle;
  size: number;
  loops: number;
  strandGap: number;
  curvature: number;
  rotation: number;
  centerX: number;
  centerY: number;
  rings: number;
}): SubPath[] {
  const { style, size, loops, strandGap, curvature, rotation, centerX, centerY, rings } = params;

  switch (style) {
    case 'basic':
      return generateBasicKnot(loops, size, strandGap, curvature, centerX, centerY, rotation);
    case 'triquetra':
      return generateTriquetra(size, curvature, centerX, centerY, rotation);
    case 'quaternary':
      return generateQuaternary(size, curvature, centerX, centerY, rotation);
    case 'ring':
      return generateRingKnot(size, curvature, rings, strandGap, centerX, centerY, rotation);
    case 'shield':
      return generateShieldKnot(size, curvature, centerX, centerY, rotation);
  }
}

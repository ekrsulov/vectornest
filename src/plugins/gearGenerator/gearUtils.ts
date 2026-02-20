import type { SubPath, Command, Point } from '../../types';
import type { GearType } from './slice';

function rotP(x: number, y: number, cx: number, cy: number, rad: number): Point {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function makePolygon(pts: Point[]): SubPath {
  if (pts.length < 2) return [];
  const cmds: Command[] = [{ type: 'M', position: pts[0] }];
  for (let i = 1; i < pts.length; i++) {
    cmds.push({ type: 'L', position: pts[i] });
  }
  cmds.push({ type: 'Z' });
  return cmds;
}

function makeCircle(cx: number, cy: number, r: number, segments: number = 36): SubPath {
  const pts: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return makePolygon(pts);
}

/* ------------------------------------------------------------------ */
/*  Spur gear (standard involute-approximation teeth)                 */
/* ------------------------------------------------------------------ */
function generateSpurGear(
  teeth: number, outerR: number, innerR: number,
  toothWidth: number, rotation: number,
  cx: number, cy: number
): SubPath {
  const pts: Point[] = [];
  const anglePerTooth = (Math.PI * 2) / teeth;
  const toothArc = anglePerTooth * toothWidth;
  const gapArc = anglePerTooth - toothArc;
  const rotRad = (rotation * Math.PI) / 180;

  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * anglePerTooth + rotRad;

    // Root start (inner circle, gap start)
    pts.push(rotP(
      cx + innerR * Math.cos(baseAngle),
      cy + innerR * Math.sin(baseAngle),
      cx, cy, 0
    ));

    // Tooth rise (from inner to outer, left flank)
    const toothStart = baseAngle + gapArc * 0.5;
    pts.push(rotP(
      cx + outerR * Math.cos(toothStart),
      cy + outerR * Math.sin(toothStart),
      cx, cy, 0
    ));

    // Tooth top (outer circle, across tooth width)
    const toothEnd = toothStart + toothArc;
    pts.push(rotP(
      cx + outerR * Math.cos(toothEnd),
      cy + outerR * Math.sin(toothEnd),
      cx, cy, 0
    ));

    // Tooth fall (from outer to inner, right flank)
    const gapEnd = baseAngle + anglePerTooth;
    pts.push(rotP(
      cx + innerR * Math.cos(gapEnd),
      cy + innerR * Math.sin(gapEnd),
      cx, cy, 0
    ));
  }

  return makePolygon(pts);
}

/* ------------------------------------------------------------------ */
/*  Internal gear (teeth point inward)                                */
/* ------------------------------------------------------------------ */
function generateInternalGear(
  teeth: number, outerR: number, innerR: number,
  toothWidth: number, rotation: number,
  cx: number, cy: number
): SubPath[] {
  // Outer ring
  const outerCircle = makeCircle(cx, cy, outerR + (outerR - innerR) * 0.3, 72);

  // Internal tooth profile (teeth pointing inward)
  const pts: Point[] = [];
  const anglePerTooth = (Math.PI * 2) / teeth;
  const toothArc = anglePerTooth * toothWidth;
  const gapArc = anglePerTooth - toothArc;
  const rotRad = (rotation * Math.PI) / 180;

  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * anglePerTooth + rotRad;

    pts.push({
      x: cx + outerR * Math.cos(baseAngle),
      y: cy + outerR * Math.sin(baseAngle),
    });

    const toothStart = baseAngle + gapArc * 0.5;
    pts.push({
      x: cx + innerR * Math.cos(toothStart),
      y: cy + innerR * Math.sin(toothStart),
    });

    const toothEnd = toothStart + toothArc;
    pts.push({
      x: cx + innerR * Math.cos(toothEnd),
      y: cy + innerR * Math.sin(toothEnd),
    });

    pts.push({
      x: cx + outerR * Math.cos(baseAngle + anglePerTooth),
      y: cy + outerR * Math.sin(baseAngle + anglePerTooth),
    });
  }

  return [outerCircle, makePolygon(pts)];
}

/* ------------------------------------------------------------------ */
/*  Star gear (decorative)                                            */
/* ------------------------------------------------------------------ */
function generateStarGear(
  points: number, outerR: number, innerR: number,
  rotation: number, cx: number, cy: number
): SubPath {
  const pts: Point[] = [];
  const angleStep = Math.PI / points;
  const rotRad = (rotation * Math.PI) / 180;

  for (let i = 0; i < points * 2; i++) {
    const a = i * angleStep + rotRad;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }

  return makePolygon(pts);
}

/* ------------------------------------------------------------------ */
/*  Ratchet (one-way teeth)                                           */
/* ------------------------------------------------------------------ */
function generateRatchet(
  teeth: number, outerR: number, innerR: number,
  rotation: number, cx: number, cy: number
): SubPath {
  const pts: Point[] = [];
  const anglePerTooth = (Math.PI * 2) / teeth;
  const rotRad = (rotation * Math.PI) / 180;

  for (let i = 0; i < teeth; i++) {
    const a = i * anglePerTooth + rotRad;
    const aNext = (i + 1) * anglePerTooth + rotRad;

    // Inner starting point
    pts.push({
      x: cx + innerR * Math.cos(a),
      y: cy + innerR * Math.sin(a),
    });

    // Outer tip (asymmetric — near end of arc for ratchet effect)
    const tipAngle = a + anglePerTooth * 0.85;
    pts.push({
      x: cx + outerR * Math.cos(tipAngle),
      y: cy + outerR * Math.sin(tipAngle),
    });

    // Drop back to inner for next tooth
    pts.push({
      x: cx + innerR * Math.cos(aNext),
      y: cy + innerR * Math.sin(aNext),
    });
  }

  return makePolygon(pts);
}

/* ------------------------------------------------------------------ */
/*  Sprocket (with spoke holes)                                       */
/* ------------------------------------------------------------------ */
function generateSprocket(
  teeth: number, outerR: number, innerR: number,
  toothWidth: number, spokes: number, rotation: number,
  cx: number, cy: number
): SubPath[] {
  const subPaths: SubPath[] = [];

  // Main gear body
  subPaths.push(generateSpurGear(teeth, outerR, innerR, toothWidth, rotation, cx, cy));

  // Spoke cutouts (lightening holes)
  const holeR = (innerR - 20) * 0.3;
  if (holeR > 3) {
    const spokeAngle = (Math.PI * 2) / spokes;
    const spokeR = innerR * 0.55;
    const rotRad = (rotation * Math.PI) / 180;

    for (let i = 0; i < spokes; i++) {
      const a = i * spokeAngle + rotRad;
      const hx = cx + spokeR * Math.cos(a);
      const hy = cy + spokeR * Math.sin(a);
      subPaths.push(makeCircle(hx, hy, holeR, 24));
    }
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export function generateGear(params: {
  gearType: GearType;
  teeth: number;
  outerRadius: number;
  innerRadius: number;
  hubRadius: number;
  toothWidth: number;
  rotation: number;
  centerX: number;
  centerY: number;
  showHub: boolean;
  spokes: number;
}): SubPath[] {
  const {
    gearType, teeth, outerRadius, innerRadius, hubRadius,
    toothWidth, rotation, centerX, centerY, showHub, spokes,
  } = params;

  const subPaths: SubPath[] = [];

  switch (gearType) {
    case 'spur':
      subPaths.push(generateSpurGear(teeth, outerRadius, innerRadius, toothWidth, rotation, centerX, centerY));
      break;
    case 'internal':
      subPaths.push(...generateInternalGear(teeth, outerRadius, innerRadius, toothWidth, rotation, centerX, centerY));
      break;
    case 'star':
      subPaths.push(generateStarGear(teeth, outerRadius, innerRadius, rotation, centerX, centerY));
      break;
    case 'ratchet':
      subPaths.push(generateRatchet(teeth, outerRadius, innerRadius, rotation, centerX, centerY));
      break;
    case 'sprocket':
      subPaths.push(...generateSprocket(teeth, outerRadius, innerRadius, toothWidth, spokes, rotation, centerX, centerY));
      break;
  }

  // Hub hole
  if (showHub && hubRadius > 0) {
    subPaths.push(makeCircle(centerX, centerY, hubRadius, 32));
  }

  return subPaths;
}

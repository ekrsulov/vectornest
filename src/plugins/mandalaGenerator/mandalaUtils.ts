import type { SubPath, Command, Point, ControlPoint } from '../../types';
import type { MandalaLayer } from './slice';

function makeCP(p: Point, anchor: Point): ControlPoint {
  return { x: p.x, y: p.y, commandIndex: 0, pointIndex: 0, anchor, isControl: true };
}

/* ------------------------------------------------------------------ */
/*  Layer generators                                                  */
/* ------------------------------------------------------------------ */

/** Petal shapes around a ring */
function generatePetals(
  segments: number, innerR: number, outerR: number,
  curvature: number, rotOffset: number,
  cx: number, cy: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const angleStep = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    const a = i * angleStep + rotOffset;
    const aNext = (i + 1) * angleStep + rotOffset;
    const aMid = (a + aNext) / 2;

    // Petal tip at outer radius
    const tip: Point = { x: cx + outerR * Math.cos(aMid), y: cy + outerR * Math.sin(aMid) };

    // Base points on inner ring
    const base1: Point = { x: cx + innerR * Math.cos(a), y: cy + innerR * Math.sin(a) };
    const base2: Point = { x: cx + innerR * Math.cos(aNext), y: cy + innerR * Math.sin(aNext) };

    // Control points for curvature
    const bulge = (outerR - innerR) * curvature;
    const cp1: Point = {
      x: cx + (innerR + bulge) * Math.cos(a + angleStep * 0.15),
      y: cy + (innerR + bulge) * Math.sin(a + angleStep * 0.15),
    };
    const cp2: Point = {
      x: cx + (outerR - bulge * 0.3) * Math.cos(aMid - angleStep * 0.1),
      y: cy + (outerR - bulge * 0.3) * Math.sin(aMid - angleStep * 0.1),
    };
    const cp3: Point = {
      x: cx + (outerR - bulge * 0.3) * Math.cos(aMid + angleStep * 0.1),
      y: cy + (outerR - bulge * 0.3) * Math.sin(aMid + angleStep * 0.1),
    };
    const cp4: Point = {
      x: cx + (innerR + bulge) * Math.cos(aNext - angleStep * 0.15),
      y: cy + (innerR + bulge) * Math.sin(aNext - angleStep * 0.15),
    };

    subPaths.push([
      { type: 'M', position: base1 },
      {
        type: 'C',
        controlPoint1: makeCP(cp1, tip),
        controlPoint2: makeCP(cp2, tip),
        position: tip,
      },
      {
        type: 'C',
        controlPoint1: makeCP(cp3, base2),
        controlPoint2: makeCP(cp4, base2),
        position: base2,
      },
      { type: 'Z' },
    ]);
  }

  return subPaths;
}

/** Concentric circle at a given radius */
function generateCircleRing(
  innerR: number, outerR: number, rotOffset: number,
  cx: number, cy: number
): SubPath[] {
  const mid = (innerR + outerR) / 2;
  const segments = 48;
  const pts: Point[] = [];

  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2 + rotOffset;
    pts.push({ x: cx + mid * Math.cos(a), y: cy + mid * Math.sin(a) });
  }

  const cmds: Command[] = [{ type: 'M', position: pts[0] }];
  for (let i = 1; i < pts.length; i++) {
    cmds.push({ type: 'L', position: pts[i] });
  }
  cmds.push({ type: 'Z' });

  return [cmds];
}

/** Dot pattern around a ring */
function generateDots(
  segments: number, innerR: number, outerR: number,
  rotOffset: number, cx: number, cy: number, density: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const mid = (innerR + outerR) / 2;
  const dotR = Math.min((outerR - innerR) * 0.3, 4) * density * 0.5;
  const numDots = segments * density;
  const angleStep = (Math.PI * 2) / numDots;

  for (let i = 0; i < numDots; i++) {
    const a = i * angleStep + rotOffset;
    const dotCx = cx + mid * Math.cos(a);
    const dotCy = cy + mid * Math.sin(a);

    // Diamond dot
    const pts: Point[] = [
      { x: dotCx, y: dotCy - dotR },
      { x: dotCx + dotR, y: dotCy },
      { x: dotCx, y: dotCy + dotR },
      { x: dotCx - dotR, y: dotCy },
    ];

    const cmds: Command[] = [{ type: 'M', position: pts[0] }];
    for (let j = 1; j < pts.length; j++) {
      cmds.push({ type: 'L', position: pts[j] });
    }
    cmds.push({ type: 'Z' });
    subPaths.push(cmds);
  }

  return subPaths;
}

/** Wavy ring */
function generateWaves(
  segments: number, innerR: number, outerR: number,
  rotOffset: number, cx: number, cy: number
): SubPath[] {
  const mid = (innerR + outerR) / 2;
  const amp = (outerR - innerR) * 0.35;
  const totalPts = segments * 4;
  const pts: Point[] = [];

  for (let i = 0; i <= totalPts; i++) {
    const a = (i / totalPts) * Math.PI * 2 + rotOffset;
    const wave = amp * Math.sin(a * segments);
    const r = mid + wave;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }

  const cmds: Command[] = [{ type: 'M', position: pts[0] }];
  for (let i = 1; i < pts.length; i++) {
    cmds.push({ type: 'L', position: pts[i] });
  }
  cmds.push({ type: 'Z' });

  return [cmds];
}

/** Pointed spikes around a ring */
function generateSpikes(
  segments: number, innerR: number, outerR: number,
  rotOffset: number, cx: number, cy: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const angleStep = (Math.PI * 2) / segments;
  const baseWidth = angleStep * 0.25;

  for (let i = 0; i < segments; i++) {
    const a = i * angleStep + rotOffset;
    const tip: Point = { x: cx + outerR * Math.cos(a), y: cy + outerR * Math.sin(a) };
    const baseL: Point = { x: cx + innerR * Math.cos(a - baseWidth), y: cy + innerR * Math.sin(a - baseWidth) };
    const baseR: Point = { x: cx + innerR * Math.cos(a + baseWidth), y: cy + innerR * Math.sin(a + baseWidth) };

    subPaths.push([
      { type: 'M', position: baseL },
      { type: 'L', position: tip },
      { type: 'L', position: baseR },
      { type: 'Z' },
    ] as Command[]);
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Layer style cycling for multi-layer mandalas                      */
/* ------------------------------------------------------------------ */
const LAYER_SEQUENCE: MandalaLayer[] = ['petals', 'dots', 'waves', 'circles', 'spikes'];

function getLayerStyle(baseStyle: MandalaLayer, layerIndex: number): MandalaLayer {
  const baseIdx = LAYER_SEQUENCE.indexOf(baseStyle);
  return LAYER_SEQUENCE[(baseIdx + layerIndex) % LAYER_SEQUENCE.length];
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export function generateMandala(params: {
  segments: number;
  layerCount: number;
  radius: number;
  layerStyle: MandalaLayer;
  petalCurvature: number;
  innerRatio: number;
  rotation: number;
  alternateRotation: boolean;
  centerX: number;
  centerY: number;
  seed: number;
  density: number;
}): SubPath[] {
  const {
    segments, layerCount, radius, layerStyle, petalCurvature,
    innerRatio, rotation, alternateRotation, centerX, centerY,
    density,
  } = params;

  const allSubPaths: SubPath[] = [];
  const rotRad = (rotation * Math.PI) / 180;
  const halfSegment = Math.PI / segments;

  const innermost = radius * innerRatio;
  const layerThickness = (radius - innermost) / layerCount;

  for (let l = 0; l < layerCount; l++) {
    const layerInner = innermost + l * layerThickness;
    const layerOuter = layerInner + layerThickness;
    const layerRot = rotRad + (alternateRotation && l % 2 === 1 ? halfSegment : 0);
    const style = getLayerStyle(layerStyle, l);

    let layerPaths: SubPath[];

    switch (style) {
      case 'petals':
        layerPaths = generatePetals(segments, layerInner, layerOuter, petalCurvature, layerRot, centerX, centerY);
        break;
      case 'circles':
        layerPaths = generateCircleRing(layerInner, layerOuter, layerRot, centerX, centerY);
        break;
      case 'dots':
        layerPaths = generateDots(segments, layerInner, layerOuter, layerRot, centerX, centerY, density);
        break;
      case 'waves':
        layerPaths = generateWaves(segments, layerInner, layerOuter, layerRot, centerX, centerY);
        break;
      case 'spikes':
        layerPaths = generateSpikes(segments, layerInner, layerOuter, layerRot, centerX, centerY);
        break;
    }

    allSubPaths.push(...layerPaths);
  }

  // Center dot
  const cdR = innermost * 0.6;
  if (cdR > 2) {
    const cdPts: Point[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      cdPts.push({ x: centerX + cdR * Math.cos(a), y: centerY + cdR * Math.sin(a) });
    }
    const cdCmds: Command[] = [{ type: 'M', position: cdPts[0] }];
    for (let i = 1; i < cdPts.length; i++) {
      cdCmds.push({ type: 'L', position: cdPts[i] });
    }
    cdCmds.push({ type: 'Z' });
    allSubPaths.push(cdCmds);
  }

  return allSubPaths;
}

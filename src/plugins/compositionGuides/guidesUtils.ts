import type { GuideType } from './slice';

export interface GuideLine {
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface GuideArc {
  cx: number; cy: number;
  r: number;
  startAngle: number;
  endAngle: number;
}

export interface GuideData {
  lines: GuideLine[];
  arcs: GuideArc[];
}

const PHI = (1 + Math.sqrt(5)) / 2;

function thirdsGuide(w: number, h: number): GuideData {
  const x1 = w / 3, x2 = (2 * w) / 3;
  const y1 = h / 3, y2 = (2 * h) / 3;
  return {
    lines: [
      { x1, y1: 0, x2: x1, y2: h },
      { x1: x2, y1: 0, x2: x2, y2: h },
      { x1: 0, y1, x2: w, y2: y1 },
      { x1: 0, y1: y2, x2: w, y2: y2 },
    ],
    arcs: [],
  };
}

function goldenGuide(w: number, h: number): GuideData {
  const gx = w / PHI;
  const gy = h / PHI;
  return {
    lines: [
      { x1: gx, y1: 0, x2: gx, y2: h },
      { x1: w - gx, y1: 0, x2: w - gx, y2: h },
      { x1: 0, y1: gy, x2: w, y2: gy },
      { x1: 0, y1: h - gy, x2: w, y2: h - gy },
    ],
    arcs: [],
  };
}

function diagonalGuide(w: number, h: number): GuideData {
  return {
    lines: [
      { x1: 0, y1: 0, x2: w, y2: h },
      { x1: w, y1: 0, x2: 0, y2: h },
      // Diagonal from corner to opposite side midpoint (baroque diagonal)
      { x1: 0, y1: 0, x2: w, y2: h / 2 },
      { x1: w, y1: 0, x2: 0, y2: h / 2 },
      { x1: 0, y1: h, x2: w, y2: h / 2 },
      { x1: w, y1: h, x2: 0, y2: h / 2 },
    ],
    arcs: [],
  };
}

function centerCrossGuide(w: number, h: number): GuideData {
  const cx = w / 2;
  const cy = h / 2;
  return {
    lines: [
      { x1: cx, y1: 0, x2: cx, y2: h },
      { x1: 0, y1: cy, x2: w, y2: cy },
    ],
    arcs: [],
  };
}

function phiGridGuide(w: number, h: number): GuideData {
  // Phi grid: divide into phi ratios repeatedly
  const lines: GuideLine[] = [];
  const r1 = 1 / PHI;
  const r2 = 1 - r1;

  // Vertical divisions
  [r1, r2].forEach((r) => {
    lines.push({ x1: w * r, y1: 0, x2: w * r, y2: h });
  });
  // Subdivisions
  [r1 * r1, r1 * r2, r2 + r1 * r1, 1 - r1 * r1].forEach((r) => {
    if (r > 0 && r < 1) {
      lines.push({ x1: w * r, y1: 0, x2: w * r, y2: h });
    }
  });

  // Horizontal divisions
  [r1, r2].forEach((r) => {
    lines.push({ x1: 0, y1: h * r, x2: w, y2: h * r });
  });
  [r1 * r1, r1 * r2, r2 + r1 * r1, 1 - r1 * r1].forEach((r) => {
    if (r > 0 && r < 1) {
      lines.push({ x1: 0, y1: h * r, x2: w, y2: h * r });
    }
  });

  return { lines, arcs: [] };
}

function fibonacciSpiralGuide(w: number, h: number): GuideData {
  // Golden rectangle subdivision with quarter-circle arcs
  const lines: GuideLine[] = [];
  const arcs: GuideArc[] = [];

  // Start with the whole rectangle, subdivide
  let x = 0, y = 0, cw = w, ch = h;

  for (let i = 0; i < 8; i++) {
    const side = i % 4;
    const ratio = 1 / PHI;

    let arcCx: number, arcCy: number, arcR: number;
    let startAngle: number;

    switch (side) {
      case 0: {
        // Cut from right
        const sw = cw * (1 - ratio);
        lines.push({ x1: x + cw - sw, y1: y, x2: x + cw - sw, y2: y + ch });
        arcR = Math.min(sw, ch);
        arcCx = x + cw - sw;
        arcCy = y + ch;
        startAngle = -90;
        cw -= sw;
        break;
      }
      case 1: {
        // Cut from bottom
        const sh = ch * (1 - ratio);
        lines.push({ x1: x, y1: y + ch - sh, x2: x + cw, y2: y + ch - sh });
        arcR = Math.min(cw, sh);
        arcCx = x;
        arcCy = y + ch - sh;
        startAngle = 0;
        ch -= sh;
        break;
      }
      case 2: {
        // Cut from left
        const sw = cw * (1 - ratio);
        lines.push({ x1: x + sw, y1: y, x2: x + sw, y2: y + ch });
        arcR = Math.min(sw, ch);
        arcCx = x + sw;
        arcCy = y;
        startAngle = 90;
        x += sw;
        cw -= sw;
        break;
      }
      case 3: {
        // Cut from top
        const sh = ch * (1 - ratio);
        lines.push({ x1: x, y1: y + sh, x2: x + cw, y2: y + sh });
        arcR = Math.min(cw, sh);
        arcCx = x + cw;
        arcCy = y + sh;
        startAngle = 180;
        y += sh;
        ch -= sh;
        break;
      }
      default:
        arcCx = 0; arcCy = 0; arcR = 0; startAngle = 0;
    }

    arcs.push({
      cx: arcCx, cy: arcCy, r: arcR,
      startAngle, endAngle: startAngle + 90,
    });
  }

  return { lines, arcs };
}

export function generateGuides(
  guideTypes: GuideType[], w: number, h: number
): GuideData {
  const allLines: GuideLine[] = [];
  const allArcs: GuideArc[] = [];

  for (const type of guideTypes) {
    let data: GuideData;
    switch (type) {
      case 'thirds': data = thirdsGuide(w, h); break;
      case 'golden': data = goldenGuide(w, h); break;
      case 'diagonal': data = diagonalGuide(w, h); break;
      case 'centerCross': data = centerCrossGuide(w, h); break;
      case 'phiGrid': data = phiGridGuide(w, h); break;
      case 'fibonacciSpiral': data = fibonacciSpiralGuide(w, h); break;
    }
    allLines.push(...data.lines);
    allArcs.push(...data.arcs);
  }

  return { lines: allLines, arcs: allArcs };
}

/** Convert an arc to SVG path d string */
export function arcToSvgPath(arc: GuideArc): string {
  const startRad = (arc.startAngle * Math.PI) / 180;
  const endRad = (arc.endAngle * Math.PI) / 180;
  const x1 = arc.cx + arc.r * Math.cos(startRad);
  const y1 = arc.cy + arc.r * Math.sin(startRad);
  const x2 = arc.cx + arc.r * Math.cos(endRad);
  const y2 = arc.cy + arc.r * Math.sin(endRad);
  const largeArc = Math.abs(arc.endAngle - arc.startAngle) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${arc.r} ${arc.r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

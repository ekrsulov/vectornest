/**
 * TextPath preset definitions.
 *
 * Each preset provides a generator that returns an SVG `d` string
 * for a given size, along with sensible default textPath parameters.
 */

export type TextPathCategory = 'circular' | 'arc' | 'wave' | 'linear' | 'advanced';

export interface TextPathPreset {
  /** Unique preset identifier */
  id: string;
  /** Display label */
  label: string;
  /** Category for filtering */
  category: TextPathCategory;
  /** Generate the SVG path `d` string.  `size` is the bounding dimension (width/height). */
  generatePath: (size: number) => string;
  /** Default startOffset percentage (0–100) */
  defaultStartOffset: number;
  /** Default text-anchor */
  defaultTextAnchor: 'start' | 'middle' | 'end';
}

// Cubic-bezier kappa constant for approximating circular arcs
// k = 4/3 * tan(π/8) ≈ 0.5523 (quarter-circle approximation)
const K = 0.5522847498;

// ── Circular presets ─────────────────────────────────────────────

const circleTop: TextPathPreset = {
  id: 'circle-full',
  label: 'Circle',
  category: 'circular',
  generatePath: (size) => {
    const r = size / 2;
    const cx = size / 2;
    const cy = size / 2;
    const k = K * r;
    // Full circle via 4 cubic bezier quarters, starting left, going CCW over the top
    return [
      `M ${cx - r},${cy}`,
      `C ${cx - r},${cy - k} ${cx - k},${cy - r} ${cx},${cy - r}`,
      `C ${cx + k},${cy - r} ${cx + r},${cy - k} ${cx + r},${cy}`,
      `C ${cx + r},${cy + k} ${cx + k},${cy + r} ${cx},${cy + r}`,
      `C ${cx - k},${cy + r} ${cx - r},${cy + k} ${cx - r},${cy}`,
      'Z',
    ].join(' ');
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

const circleBottom: TextPathPreset = {
  id: 'circle-bottom',
  label: 'Circle (reversed)',
  category: 'circular',
  generatePath: (size) => {
    const r = size / 2;
    const cx = size / 2;
    const cy = size / 2;
    const k = K * r;
    // Full circle starting right, going CW through the bottom first
    return [
      `M ${cx + r},${cy}`,
      `C ${cx + r},${cy + k} ${cx + k},${cy + r} ${cx},${cy + r}`,
      `C ${cx - k},${cy + r} ${cx - r},${cy + k} ${cx - r},${cy}`,
      `C ${cx - r},${cy - k} ${cx - k},${cy - r} ${cx},${cy - r}`,
      `C ${cx + k},${cy - r} ${cx + r},${cy - k} ${cx + r},${cy}`,
      'Z',
    ].join(' ');
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

const ellipse: TextPathPreset = {
  id: 'ellipse',
  label: 'Ellipse',
  category: 'circular',
  generatePath: (size) => {
    const rx = size / 2;
    const ry = size / 3;
    const cx = size / 2;
    const cy = size / 2;
    const kx = K * rx;
    const ky = K * ry;
    return [
      `M ${cx - rx},${cy}`,
      `C ${cx - rx},${cy - ky} ${cx - kx},${cy - ry} ${cx},${cy - ry}`,
      `C ${cx + kx},${cy - ry} ${cx + rx},${cy - ky} ${cx + rx},${cy}`,
      `C ${cx + rx},${cy + ky} ${cx + kx},${cy + ry} ${cx},${cy + ry}`,
      `C ${cx - kx},${cy + ry} ${cx - rx},${cy + ky} ${cx - rx},${cy}`,
      'Z',
    ].join(' ');
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

// ── Arc presets ──────────────────────────────────────────────────

const archTop: TextPathPreset = {
  id: 'arch-top',
  label: 'Arch (top)',
  category: 'arc',
  generatePath: (size) => {
    // Q p0=(0,h) p1=(size/2,-0.3h) p2=(size,h) converted to cubic
    // cp1 = p0 + 2/3*(p1-p0), cp2 = p2 + 2/3*(p1-p2)
    const h = size * 0.4;
    const cy = h * (0.4 / 3); // h*(1 - 2*1.3/3) = h*0.1333
    return `M 0,${h} C ${size / 3},${cy} ${(size * 2) / 3},${cy} ${size},${h}`;
  },
  defaultStartOffset: 50,
  defaultTextAnchor: 'start',
};

const archBottom: TextPathPreset = {
  id: 'arch-bottom',
  label: 'Arch (bottom)',
  category: 'arc',
  generatePath: (size) => {
    // Q p0=(0,0) p1=(size/2, h*1.3) p2=(size,0) converted to cubic
    const h = size * 0.4;
    const cy = h * (1.3 * 2) / 3; // h*0.8667
    return `M 0,0 C ${size / 3},${cy} ${(size * 2) / 3},${cy} ${size},0`;
  },
  defaultStartOffset: 50,
  defaultTextAnchor: 'start',
};

const semicircleTop: TextPathPreset = {
  id: 'semicircle-top',
  label: 'Half-circle (top)',
  category: 'arc',
  generatePath: (size) => {
    const r = size / 2;
    const cx = size / 2;
    const cy = size / 2;
    const k = K * r;
    // Top semicircle via two quarter-circle cubics
    return [
      `M ${cx - r},${cy}`,
      `C ${cx - r},${cy - k} ${cx - k},${cy - r} ${cx},${cy - r}`,
      `C ${cx + k},${cy - r} ${cx + r},${cy - k} ${cx + r},${cy}`,
    ].join(' ');
  },
  defaultStartOffset: 50,
  defaultTextAnchor: 'start',
};

const semicircleBottom: TextPathPreset = {
  id: 'semicircle-bottom',
  label: 'Half-circle (bottom)',
  category: 'arc',
  generatePath: (size) => {
    const r = size / 2;
    const cx = size / 2;
    const cy = size / 2;
    const k = K * r;
    // Bottom semicircle via two quarter-circle cubics
    return [
      `M ${cx - r},${cy}`,
      `C ${cx - r},${cy + k} ${cx - k},${cy + r} ${cx},${cy + r}`,
      `C ${cx + k},${cy + r} ${cx + r},${cy + k} ${cx + r},${cy}`,
    ].join(' ');
  },
  defaultStartOffset: 50,
  defaultTextAnchor: 'start',
};

const crescent: TextPathPreset = {
  id: 'crescent',
  label: 'Crescent',
  category: 'arc',
  generatePath: (size) => {
    const r = size / 2;
    const cx = size / 2;
    const cy = size / 2;
    const k = K * r;
    // Quarter arc top-right: from (cx, cy-r) to (cx+r, cy) via cubic bezier
    return `M ${cx},${cy - r} C ${cx + k},${cy - r} ${cx + r},${cy - k} ${cx + r},${cy}`;
  },
  defaultStartOffset: 50,
  defaultTextAnchor: 'start',
};

// ── Wave presets ─────────────────────────────────────────────────

const wave: TextPathPreset = {
  id: 'wave',
  label: 'Wave',
  category: 'wave',
  generatePath: (size) => {
    const a = size * 0.15;
    const mid = size / 2;
    // S command expanded to explicit C (S mirrors previous cp2)
    // S cp2=(size*0.75,mid+a) → cp1 reflected = (size*0.75,mid+a)
    return `M 0,${mid} C ${size * 0.25},${mid - a} ${size * 0.25},${mid - a} ${mid},${mid} C ${size * 0.75},${mid + a} ${size * 0.75},${mid + a} ${size},${mid}`;
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

const doubleWave: TextPathPreset = {
  id: 'double-wave',
  label: 'Double Wave',
  category: 'wave',
  generatePath: (size) => {
    const a = size * 0.12;
    const mid = size / 2;
    const q = size / 4;
    // All S commands expanded to explicit C commands
    return [
      `M 0,${mid}`,
      `C ${q * 0.5},${mid - a} ${q * 0.5},${mid - a} ${q},${mid}`,
      `C ${q * 1.5},${mid + a} ${q * 1.5},${mid + a} ${q * 2},${mid}`,
      `C ${q * 2.5},${mid - a} ${q * 2.5},${mid - a} ${q * 3},${mid}`,
      `C ${q * 3.5},${mid + a} ${q * 3.5},${mid + a} ${q * 4},${mid}`,
    ].join(' ');
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

const zigzag: TextPathPreset = {
  id: 'zigzag',
  label: 'Zigzag',
  category: 'wave',
  generatePath: (size) => {
    const a = size * 0.15;
    const mid = size / 2;
    const seg = size / 6;
    return `M 0,${mid} L ${seg},${mid - a} L ${seg * 2},${mid + a} L ${seg * 3},${mid - a} L ${seg * 4},${mid + a} L ${seg * 5},${mid - a} L ${seg * 6},${mid}`;
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

// ── Linear presets ───────────────────────────────────────────────

const diagonal: TextPathPreset = {
  id: 'diagonal',
  label: 'Diagonal',
  category: 'linear',
  generatePath: (size) => {
    return `M 0,${size} L ${size},0`;
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

const diagonalUp: TextPathPreset = {
  id: 'diagonal-up',
  label: 'Diagonal (up)',
  category: 'linear',
  generatePath: (size) => {
    return `M 0,${size * 0.8} L ${size},${size * 0.2}`;
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

const vertical: TextPathPreset = {
  id: 'vertical',
  label: 'Vertical',
  category: 'linear',
  generatePath: (size) => {
    return `M ${size / 2},0 L ${size / 2},${size}`;
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

// ── Advanced presets ─────────────────────────────────────────────

const spiral: TextPathPreset = {
  id: 'spiral',
  label: 'Spiral',
  category: 'advanced',
  generatePath: (size) => {
    const cx = size / 2;
    const cy = size / 2;
    const turns = 2;
    const maxR = size / 2;
    const steps = turns * 36;
    const parts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * turns * 2 * Math.PI;
      const r = t * maxR;
      const x = (cx + r * Math.cos(angle)).toFixed(2);
      const y = (cy + r * Math.sin(angle)).toFixed(2);
      parts.push(i === 0 ? `M ${x},${y}` : `L ${x},${y}`);
    }
    return parts.join(' ');
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

const heart: TextPathPreset = {
  id: 'heart',
  label: 'Heart',
  category: 'advanced',
  generatePath: (size) => {
    const s = size;
    // Heart shape using cubic Béziers
    return `M ${s / 2},${s * 0.85} C ${s * 0.15},${s * 0.55} 0,${s * 0.3} ${s * 0.25},${s * 0.1} C ${s * 0.35},${s * 0.02} ${s * 0.45},${s * 0.05} ${s / 2},${s * 0.2} C ${s * 0.55},${s * 0.05} ${s * 0.65},${s * 0.02} ${s * 0.75},${s * 0.1} C ${s},${s * 0.3} ${s * 0.85},${s * 0.55} ${s / 2},${s * 0.85} Z`;
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

const star: TextPathPreset = {
  id: 'star',
  label: 'Star',
  category: 'advanced',
  generatePath: (size) => {
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2;
    const innerR = size / 4.5;
    const points = 5;
    const parts: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const x = (cx + r * Math.cos(angle)).toFixed(2);
      const y = (cy + r * Math.sin(angle)).toFixed(2);
      parts.push(i === 0 ? `M ${x},${y}` : `L ${x},${y}`);
    }
    parts.push('Z');
    return parts.join(' ');
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

const diamond: TextPathPreset = {
  id: 'diamond',
  label: 'Diamond',
  category: 'advanced',
  generatePath: (size) => {
    const mid = size / 2;
    return `M ${mid},0 L ${size},${mid} L ${mid},${size} L 0,${mid} Z`;
  },
  defaultStartOffset: 0,
  defaultTextAnchor: 'start',
};

// ── Category labels ──────────────────────────────────────────────

export const CATEGORY_LABELS: Record<TextPathCategory, string> = {
  circular: 'Circular',
  arc: 'Arcs',
  wave: 'Waves',
  linear: 'Linear',
  advanced: 'Advanced',
};

export const CATEGORY_ORDER: TextPathCategory[] = ['circular', 'arc', 'wave', 'linear', 'advanced'];

// ── Merged list ──────────────────────────────────────────────────

export const TEXT_PATH_PRESETS: TextPathPreset[] = [
  // Circular
  circleTop,
  circleBottom,
  ellipse,
  // Arcs
  archTop,
  archBottom,
  semicircleTop,
  semicircleBottom,
  crescent,
  // Waves
  wave,
  doubleWave,
  zigzag,
  // Linear
  diagonal,
  diagonalUp,
  vertical,
  // Advanced
  spiral,
  heart,
  star,
  diamond,
];

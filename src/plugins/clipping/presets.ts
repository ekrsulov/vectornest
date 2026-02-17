/**
 * Animated ClipPath presets
 */

export interface ClipPathBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClipPathPreset {
  id: string;
  name: string;
  /** Generate clipPath content with animations */
  generateContent: (bbox: ClipPathBBox) => string;
  /** Whether this preset has animations */
  hasAnimation: boolean;
}

export const CLIPPATH_PRESETS: ClipPathPreset[] = [
  // Static presets
  {
    id: 'clip-circle',
    name: 'Circle',
    hasAnimation: false,
    generateContent: (bbox) => {
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const r = Math.min(bbox.width, bbox.height) * 0.45;
      return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    },
  },
  {
    id: 'clip-diamond',
    name: 'Diamond',
    hasAnimation: false,
    generateContent: (bbox) => {
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const hw = bbox.width * 0.45;
      const hh = bbox.height * 0.45;
      return `<polygon points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}"/>`;
    },
  },
  {
    id: 'clip-heart',
    name: 'Heart',
    hasAnimation: false,
    generateContent: (bbox) => {
      // Heart based on 100x100 reference: M 50 92 ... Z
      // Scale to fit bbox while preserving aspect ratio
      const scale = Math.min(bbox.width, bbox.height) / 100;
      const offsetX = bbox.x + (bbox.width - 100 * scale) / 2;
      const offsetY = bbox.y + (bbox.height - 100 * scale) / 2;

      const transform = (x: number, y: number) => [
        offsetX + x * scale,
        offsetY + y * scale,
      ];

      const [p1, p2] = transform(50, 92);
      const [p3, p4] = transform(22, 72);
      const [p5, p6] = transform(8, 55);
      const [p7, p8] = transform(10, 36);
      const [p9, p10] = transform(12, 18);
      const [p11, p12] = transform(28, 10);
      const [p13, p14] = transform(40, 14);
      const [p15, p16] = transform(46, 16);
      const [p17, p18] = transform(49, 20);
      const [p19, p20] = transform(50, 24);
      const [p21, p22] = transform(51, 20);
      const [p23, p24] = transform(54, 16);
      const [p25, p26] = transform(60, 14);
      const [p27, p28] = transform(72, 10);
      const [p29, p30] = transform(88, 18);
      const [p31, p32] = transform(90, 36);
      const [p33, p34] = transform(92, 55);
      const [p35, p36] = transform(78, 72);

      return `<path d="
        M ${p1} ${p2}
        C ${p3} ${p4} ${p5} ${p6} ${p7} ${p8}
        C ${p9} ${p10} ${p11} ${p12} ${p13} ${p14}
        C ${p15} ${p16} ${p17} ${p18} ${p19} ${p20}
        C ${p21} ${p22} ${p23} ${p24} ${p25} ${p26}
        C ${p27} ${p28} ${p29} ${p30} ${p31} ${p32}
        C ${p33} ${p34} ${p35} ${p36} ${p1} ${p2}
        Z"/>`;
    },
  },
  {
    id: 'clip-triangle',
    name: 'Triangle',
    hasAnimation: false,
    generateContent: (bbox) => {
      const cx = bbox.x + bbox.width / 2;
      const top = bbox.y + bbox.height * 0.1;
      const bottom = bbox.y + bbox.height * 0.9;
      const left = bbox.x + bbox.width * 0.1;
      const right = bbox.x + bbox.width * 0.9;
      return `<polygon points="${cx},${top} ${right},${bottom} ${left},${bottom}"/>`;
    },
  },
  // Animated presets
  {
    id: 'clip-iris-open',
    name: 'Iris Open',
    hasAnimation: true,
    generateContent: (bbox) => {
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const maxR = Math.max(bbox.width, bbox.height) * 0.7;
      return `<circle cx="${cx}" cy="${cy}" r="0">
  <animate attributeName="r" from="0" to="${maxR}" dur="2s" repeatCount="indefinite" calcMode="ease-in-out" />
</circle>`;
    },
  },
  {
    id: 'clip-iris-close',
    name: 'Iris Close',
    hasAnimation: true,
    generateContent: (bbox) => {
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const maxR = Math.max(bbox.width, bbox.height) * 0.7;
      return `<circle cx="${cx}" cy="${cy}" r="${maxR}">
  <animate attributeName="r" from="${maxR}" to="0" dur="2s" repeatCount="indefinite" calcMode="ease-in-out" />
</circle>`;
    },
  },
  {
    id: 'clip-reveal-horizontal',
    name: 'Reveal Horizontal',
    hasAnimation: true,
    generateContent: (bbox) => {
      const startX = bbox.x - bbox.width;
      const endX = bbox.x;
      return `<rect x="${startX}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}">
  <animate attributeName="x" from="${startX}" to="${endX}" dur="2s" repeatCount="indefinite" calcMode="linear" />
</rect>`;
    },
  },
  {
    id: 'clip-reveal-vertical',
    name: 'Reveal Vertical',
    hasAnimation: true,
    generateContent: (bbox) => {
      const startY = bbox.y - bbox.height;
      const endY = bbox.y;
      return `<rect x="${bbox.x}" y="${startY}" width="${bbox.width}" height="${bbox.height}">
  <animate attributeName="y" from="${startY}" to="${endY}" dur="2s" repeatCount="indefinite" calcMode="linear" />
</rect>`;
    },
  },
  {
    id: 'clip-spotlight',
    name: 'Spotlight',
    hasAnimation: true,
    generateContent: (bbox) => {
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const r = Math.min(bbox.width, bbox.height) * 0.35;
      const pathRadius = Math.min(bbox.width, bbox.height) * 0.2;
      return `<circle cx="${cx}" cy="${cy}" r="${r}">
  <animateMotion dur="4s" repeatCount="indefinite" path="M 0,0 A ${pathRadius},${pathRadius} 0 1,1 0.1,0 A ${pathRadius},${pathRadius} 0 1,1 0,0" />
</circle>`;
    },
  },
  {
    id: 'clip-diamond-grow',
    name: 'Diamond Grow',
    hasAnimation: true,
    generateContent: (bbox) => {
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const maxSize = Math.min(bbox.width, bbox.height) * 0.45;
      const minPoints = `${cx},${cy} ${cx},${cy} ${cx},${cy} ${cx},${cy}`;
      const maxPoints = `${cx},${cy - maxSize} ${cx + maxSize},${cy} ${cx},${cy + maxSize} ${cx - maxSize},${cy}`;
      return `<polygon points="${minPoints}">
  <animate attributeName="points" values="${minPoints};${maxPoints};${minPoints}" dur="2s" repeatCount="indefinite" calcMode="ease-in-out" />
</polygon>`;
    },
  },
];

/**
 * Generate clipPath SVG content from preset
 */
export const generateClipPathFromPreset = (
  preset: ClipPathPreset,
  bbox: ClipPathBBox = { x: 0, y: 0, width: 100, height: 100 }
): {
  id: string;
  name: string;
  rawContent: string;
  clipPathUnits: 'userSpaceOnUse';
} => {
  const id = `${preset.id}-${Date.now()}`;
  return {
    id,
    name: preset.name,
    rawContent: preset.generateContent(bbox),
    clipPathUnits: 'userSpaceOnUse',
  };
};

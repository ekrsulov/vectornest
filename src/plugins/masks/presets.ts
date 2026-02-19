/**
 * Bounding box for generating dynamic mask presets
 */
export interface MaskBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Default bbox when no selection is available (centered at origin)
 */
const DEFAULT_BBOX: MaskBBox = { x: 0, y: 0, width: 100, height: 100 };

/**
 * Mask preset definition with dynamic content generator
 */
interface MaskPreset {
  id: string;
  name: string;
  /** Generate content based on bounding box */
  generateContent: (bbox: MaskBBox) => string;
  /** Generate mask attributes (x, y, width, height) based on bbox */
  generateAttrs: (bbox: MaskBBox) => { x: string; y: string; width: string; height: string };
  /** Static preview SVG for the preset card (complete SVG markup with unique IDs) */
  previewSvg: string;
}

/**
 * Helper to generate unique gradient/element IDs per mask instance
 */
const uniqueId = (base: string) => `${base}-${Date.now()}`;

export const MASK_PRESETS: MaskPreset[] = [
  {
    id: 'mask-soft-spot',
    name: 'Soft Spot',
    generateContent: (bbox) => {
      const gradId = uniqueId('soft-spot-grad');
      // For userSpaceOnUse, coordinates must be absolute
      return `<defs>
  <radialGradient id="${gradId}" cx="50%" cy="50%" r="60%">
    <stop offset="0%" stop-color="white" stop-opacity="1"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="url(#${gradId})"/>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="prev-soft-spot" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="currentColor" stop-opacity="1"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></radialGradient><mask id="prev-mask-soft-spot"><rect width="24" height="24" fill="url(#prev-soft-spot)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-soft-spot)"/></svg>`,
  },
  {
    id: 'mask-diagonal-wipe',
    name: 'Diagonal Wipe',
    generateContent: (bbox) => {
      const gradId = uniqueId('diagonal-wipe-grad');
      // Animation moves the rect across the entire bbox
      // For userSpaceOnUse, use absolute coordinates
      const startX = bbox.x - bbox.width;
      const endX = bbox.x + bbox.width * 0.3;
      return `<defs>
  <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="30%" stop-color="white" stop-opacity="1"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width * 2}" height="${bbox.height * 2}" fill="url(#${gradId})">
  <animate attributeName="x" begin="0s" dur="2s" repeatCount="indefinite" values="${startX};${endX};${startX}" calcMode="linear" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="prev-diag-wipe" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="30%" stop-color="white" stop-opacity="1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient><mask id="prev-mask-diag-wipe"><rect width="24" height="24" fill="url(#prev-diag-wipe)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-diag-wipe)"/></svg>`,
  },
  {
    id: 'mask-ring',
    name: 'Ring',
    generateContent: (bbox) => {
      // For userSpaceOnUse, center is at absolute position
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const outerR = Math.min(bbox.width, bbox.height) * 0.45;
      const innerR = outerR * 0.5;
      return `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="white"/>
<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="black"/>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-ring"><circle cx="12" cy="12" r="10" fill="white"/><circle cx="12" cy="12" r="5" fill="black"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-ring)"/></svg>`,
  },
  {
    id: 'mask-horizontal-fade',
    name: 'Horizontal Fade',
    generateContent: (bbox) => {
      const gradId = uniqueId('h-fade-grad');
      return `<defs>
  <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="white"/>
    <stop offset="100%" stop-color="black"/>
  </linearGradient>
</defs>
<rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="url(#${gradId})"/>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="prev-h-fade" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="black"/></linearGradient><mask id="prev-mask-h-fade"><rect width="24" height="24" fill="url(#prev-h-fade)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-h-fade)"/></svg>`,
  },
  {
    id: 'mask-vertical-fade',
    name: 'Vertical Fade',
    generateContent: (bbox) => {
      const gradId = uniqueId('v-fade-grad');
      return `<defs>
  <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="white"/>
    <stop offset="100%" stop-color="black"/>
  </linearGradient>
</defs>
<rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="url(#${gradId})"/>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="prev-v-fade" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="black"/></linearGradient><mask id="prev-mask-v-fade"><rect width="24" height="24" fill="url(#prev-v-fade)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-v-fade)"/></svg>`,
  },
  {
    id: 'mask-animated-reveal',
    name: 'Animated Reveal',
    generateContent: (bbox) => {
      const gradId = uniqueId('reveal-grad');
      // For userSpaceOnUse, center is at absolute position
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const spotR = Math.min(bbox.width, bbox.height) * 0.4;
      // Animation start/end positions in absolute coordinates
      const startX = bbox.x - bbox.width / 2;
      const endX = bbox.x;
      return `<defs>
  <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="white"/>
    <stop offset="100%" stop-color="black"/>
  </linearGradient>
</defs>
<rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="url(#${gradId})">
  <animate attributeName="x" begin="0s" from="${startX}" to="${endX}" dur="4s" repeatCount="indefinite" calcMode="linear" />
</rect>
<circle cx="${cx}" cy="${cy}" r="${spotR}" fill="white"/>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="prev-reveal-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="black"/></linearGradient><mask id="prev-mask-reveal"><rect width="24" height="24" fill="url(#prev-reveal-grad)"/><circle cx="12" cy="12" r="5" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-reveal)"/></svg>`,
  },
  {
    id: 'mask-reveal-horizontal',
    name: 'Reveal Horizontal',
    generateContent: (bbox) => {
      // Horizontal curtain that reveals content from left to right
      const startX = bbox.x - bbox.width;
      const endX = bbox.x;
      return `<rect x="${startX}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="white">
  <animate attributeName="x" begin="0s" from="${startX}" to="${endX}" dur="2s" repeatCount="indefinite" calcMode="linear" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-reveal-h"><rect x="0" y="0" width="16" height="24" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-reveal-h)"/></svg>`,
  },
  {
    id: 'mask-reveal-vertical',
    name: 'Reveal Vertical',
    generateContent: (bbox) => {
      // Vertical curtain that reveals content from top to bottom
      const startY = bbox.y - bbox.height;
      const endY = bbox.y;
      return `<rect x="${bbox.x}" y="${startY}" width="${bbox.width}" height="${bbox.height}" fill="white">
  <animate attributeName="y" begin="0s" from="${startY}" to="${endY}" dur="2s" repeatCount="indefinite" calcMode="linear" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-reveal-v"><rect x="0" y="0" width="24" height="16" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-reveal-v)"/></svg>`,
  },
  {
    id: 'mask-spotlight',
    name: 'Spotlight',
    generateContent: (bbox) => {
      const gradId = uniqueId('spotlight-grad');
      // Circle with soft edge that moves across the content
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const radius = Math.min(bbox.width, bbox.height) * 0.35;
      // Motion path - circular motion around center
      const pathRadius = Math.min(bbox.width, bbox.height) * 0.2;
      return `<defs>
  <radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white" stop-opacity="1"/>
    <stop offset="70%" stop-color="white" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
</defs>
<circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#${gradId})">
  <animateMotion dur="4s" repeatCount="indefinite" path="M 0,0 A ${pathRadius},${pathRadius} 0 1,1 0.1,0 A ${pathRadius},${pathRadius} 0 1,1 0,0" />
</circle>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="prev-spotlight" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white" stop-opacity="1"/><stop offset="70%" stop-color="white" stop-opacity="0.8"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient><mask id="prev-mask-spotlight"><circle cx="12" cy="12" r="8" fill="url(#prev-spotlight)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-spotlight)"/></svg>`,
  },
  {
    id: 'mask-spotlight-sweep',
    name: 'Spotlight Sweep',
    generateContent: (bbox) => {
      const gradId = uniqueId('spotlight-sweep-grad');
      // Spotlight that sweeps horizontally across content
      const startCx = bbox.x;
      const endCx = bbox.x + bbox.width;
      const cy = bbox.y + bbox.height / 2;
      const radius = Math.min(bbox.width, bbox.height) * 0.5;
      return `<defs>
  <radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white" stop-opacity="1"/>
    <stop offset="60%" stop-color="white" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
</defs>
<circle cx="${startCx}" cy="${cy}" r="${radius}" fill="url(#${gradId})">
  <animate attributeName="cx" begin="0s" values="${startCx};${endCx};${startCx}" dur="3s" repeatCount="indefinite" calcMode="linear" />
</circle>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="prev-spotlight-sweep" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white" stop-opacity="1"/><stop offset="60%" stop-color="white" stop-opacity="0.6"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient><mask id="prev-mask-spotlight-sweep"><circle cx="8" cy="12" r="10" fill="url(#prev-spotlight-sweep)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-spotlight-sweep)"/></svg>`,
  },
  {
    id: 'mask-iris-open',
    name: 'Iris Open',
    generateContent: (bbox) => {
      // Circle that grows from center (like camera iris opening)
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const minR = 0;
      const maxR = Math.max(bbox.width, bbox.height) * 0.75;
      return `<circle cx="${cx}" cy="${cy}" r="${minR}" fill="white">
  <animate attributeName="r" begin="0s" from="${minR}" to="${maxR}" dur="2s" repeatCount="indefinite" calcMode="ease-in-out" />
</circle>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-iris-open"><circle cx="12" cy="12" r="8" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-iris-open)"/></svg>`,
  },
  {
    id: 'mask-iris-close',
    name: 'Iris Close',
    generateContent: (bbox) => {
      // Circle that shrinks to center (like camera iris closing)
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const maxR = Math.max(bbox.width, bbox.height) * 0.75;
      const minR = 0;
      return `<circle cx="${cx}" cy="${cy}" r="${maxR}" fill="white">
  <animate attributeName="r" begin="0s" from="${maxR}" to="${minR}" dur="2s" repeatCount="indefinite" calcMode="ease-in-out" />
</circle>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-iris-close"><circle cx="12" cy="12" r="4" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-iris-close)"/></svg>`,
  },
  {
    id: 'mask-blinds-horizontal',
    name: 'Blinds Horizontal',
    generateContent: (bbox) => {
      // Horizontal blinds that open
      const numBlinds = 5;
      const blindHeight = bbox.height / numBlinds;
      const blinds = Array.from({ length: numBlinds }, (_, i) => {
        const y = bbox.y + i * blindHeight;
        return `<rect x="${bbox.x}" y="${y}" width="${bbox.width}" height="0" fill="white">
  <animate attributeName="height" begin="0s" from="0" to="${blindHeight}" dur="1.5s" repeatCount="indefinite" calcMode="ease-in-out" />
</rect>`;
      }).join('\n');
      return blinds;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-blinds-h"><rect x="0" y="0" width="24" height="4" fill="white"/><rect x="0" y="5" width="24" height="4" fill="white"/><rect x="0" y="10" width="24" height="4" fill="white"/><rect x="0" y="15" width="24" height="4" fill="white"/><rect x="0" y="20" width="24" height="4" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-blinds-h)"/></svg>`,
  },
  {
    id: 'mask-blinds-vertical',
    name: 'Blinds Vertical',
    generateContent: (bbox) => {
      // Vertical blinds that open
      const numBlinds = 5;
      const blindWidth = bbox.width / numBlinds;
      const blinds = Array.from({ length: numBlinds }, (_, i) => {
        const x = bbox.x + i * blindWidth;
        return `<rect x="${x}" y="${bbox.y}" width="0" height="${bbox.height}" fill="white">
  <animate attributeName="width" begin="${i * 0.1}s" from="0" to="${blindWidth}" dur="1.5s" repeatCount="indefinite" calcMode="ease-in-out" />
</rect>`;
      }).join('\n');
      return blinds;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-blinds-v"><rect x="0" y="0" width="4" height="24" fill="white"/><rect x="5" y="0" width="4" height="24" fill="white"/><rect x="10" y="0" width="4" height="24" fill="white"/><rect x="15" y="0" width="4" height="24" fill="white"/><rect x="20" y="0" width="4" height="24" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-blinds-v)"/></svg>`,
  },
  {
    id: 'mask-wipe-left',
    name: 'Wipe Left',
    generateContent: (bbox) => {
      // Solid wipe from right to left
      const startX = bbox.x + bbox.width;
      const endX = bbox.x - bbox.width;
      return `<rect x="${startX}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="white">
  <animate attributeName="x" begin="0s" from="${startX}" to="${endX}" dur="2s" repeatCount="indefinite" calcMode="linear" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-wipe-left"><rect x="8" y="0" width="16" height="24" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-wipe-left)"/></svg>`,
  },
  {
    id: 'mask-wipe-up',
    name: 'Wipe Up',
    generateContent: (bbox) => {
      // Solid wipe from bottom to top
      const startY = bbox.y + bbox.height;
      const endY = bbox.y - bbox.height;
      return `<rect x="${bbox.x}" y="${startY}" width="${bbox.width}" height="${bbox.height}" fill="white">
  <animate attributeName="y" begin="0s" from="${startY}" to="${endY}" dur="2s" repeatCount="indefinite" calcMode="linear" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-wipe-up"><rect x="0" y="8" width="24" height="16" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-wipe-up)"/></svg>`,
  },
  {
    id: 'mask-pulse',
    name: 'Pulse',
    generateContent: (bbox) => {
      const gradId = uniqueId('pulse-grad');
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const minR = Math.min(bbox.width, bbox.height) * 0.3;
      const maxR = Math.min(bbox.width, bbox.height) * 0.5;
      return `<defs>
  <radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white" stop-opacity="1"/>
    <stop offset="80%" stop-color="white" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
</defs>
<circle cx="${cx}" cy="${cy}" r="${minR}" fill="url(#${gradId})">
  <animate attributeName="r" begin="0s" values="${minR};${maxR};${minR}" dur="1.5s" repeatCount="indefinite" calcMode="ease-in-out" />
</circle>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="prev-pulse" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white" stop-opacity="1"/><stop offset="80%" stop-color="white" stop-opacity="0.5"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient><mask id="prev-mask-pulse"><circle cx="12" cy="12" r="9" fill="url(#prev-pulse)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-pulse)"/></svg>`,
  },
  {
    id: 'mask-diamond-open',
    name: 'Diamond Open',
    generateContent: (bbox) => {
      // Diamond shape that grows from center
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const maxSize = Math.max(bbox.width, bbox.height) * 0.8;
      // Diamond points: top, right, bottom, left
      return `<polygon points="${cx},${cy} ${cx},${cy} ${cx},${cy} ${cx},${cy}" fill="white">
  <animate attributeName="points" begin="0s" dur="2s" repeatCount="indefinite" calcMode="ease-in-out"
    values="${cx},${cy} ${cx},${cy} ${cx},${cy} ${cx},${cy};
            ${cx},${cy - maxSize} ${cx + maxSize},${cy} ${cx},${cy + maxSize} ${cx - maxSize},${cy};
            ${cx},${cy} ${cx},${cy} ${cx},${cy} ${cx},${cy}" />
</polygon>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-diamond"><polygon points="12,2 22,12 12,22 2,12" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-diamond)"/></svg>`,
  },
  {
    id: 'mask-split-horizontal',
    name: 'Split Horizontal',
    generateContent: (bbox) => {
      // Two rectangles that split apart horizontally from center
      const midY = bbox.y + bbox.height / 2;
      const halfH = bbox.height / 2;
      return `<rect x="${bbox.x}" y="${midY}" width="${bbox.width}" height="0" fill="white">
  <animate attributeName="y" begin="0s" from="${midY}" to="${bbox.y}" dur="1.5s" repeatCount="indefinite" calcMode="ease-in-out" />
  <animate attributeName="height" begin="0s" from="0" to="${halfH}" dur="1.5s" repeatCount="indefinite" calcMode="ease-in-out" />
</rect>
<rect x="${bbox.x}" y="${midY}" width="${bbox.width}" height="0" fill="white">
  <animate attributeName="height" begin="0s" from="0" to="${halfH}" dur="1.5s" repeatCount="indefinite" calcMode="ease-in-out" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-split-h"><rect x="0" y="2" width="24" height="8" fill="white"/><rect x="0" y="14" width="24" height="8" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-split-h)"/></svg>`,
  },
  {
    id: 'mask-split-vertical',
    name: 'Split Vertical',
    generateContent: (bbox) => {
      // Two rectangles that split apart vertically from center
      const midX = bbox.x + bbox.width / 2;
      const halfW = bbox.width / 2;
      return `<rect x="${midX}" y="${bbox.y}" width="0" height="${bbox.height}" fill="white">
  <animate attributeName="x" begin="0s" from="${midX}" to="${bbox.x}" dur="1.5s" repeatCount="indefinite" calcMode="ease-in-out" />
  <animate attributeName="width" begin="0s" from="0" to="${halfW}" dur="1.5s" repeatCount="indefinite" calcMode="ease-in-out" />
</rect>
<rect x="${midX}" y="${bbox.y}" width="0" height="${bbox.height}" fill="white">
  <animate attributeName="width" begin="0s" from="0" to="${halfW}" dur="1.5s" repeatCount="indefinite" calcMode="ease-in-out" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-split-v"><rect x="2" y="0" width="8" height="24" fill="white"/><rect x="14" y="0" width="8" height="24" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-split-v)"/></svg>`,
  },
  {
    id: 'mask-clock-wipe',
    name: 'Clock Wipe',
    generateContent: (bbox) => {
      // Pie slice that rotates around center like a clock
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const r = Math.max(bbox.width, bbox.height) * 0.75;
      // Create a pie slice using path - full rotation
      return `<g transform-origin="${cx} ${cy}">
  <path d="M ${cx},${cy} L ${cx},${cy - r} A ${r},${r} 0 1,1 ${cx - 0.001},${cy - r} Z" fill="white">
    <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="3s" repeatCount="indefinite" />
  </path>
</g>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-clock"><path d="M 12,12 L 12,0 A 12,12 0 0,1 24,12 Z" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-clock)"/></svg>`,
  },
  {
    id: 'mask-spiral',
    name: 'Spiral',
    generateContent: (bbox) => {
      // Spiral that rotates and scales
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const r = Math.min(bbox.width, bbox.height) * 0.45;
      // Spiral path approximation
      const spiral = `M ${cx},${cy} 
        Q ${cx + r * 0.3},${cy - r * 0.3} ${cx + r * 0.5},${cy}
        Q ${cx + r * 0.7},${cy + r * 0.5} ${cx},${cy + r * 0.6}
        Q ${cx - r * 0.8},${cy + r * 0.7} ${cx - r * 0.7},${cy}
        Q ${cx - r * 0.9},${cy - r * 0.8} ${cx},${cy - r * 0.9}
        Q ${cx + r},${cy - r} ${cx + r},${cy}
        Q ${cx + r},${cy + r} ${cx},${cy + r}
        Q ${cx - r},${cy + r} ${cx - r},${cy}
        Q ${cx - r},${cy - r} ${cx},${cy - r} Z`;
      return `<path d="${spiral}" fill="white" stroke="white" stroke-width="${r * 0.4}">
  <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="4s" repeatCount="indefinite" />
</path>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-spiral"><path d="M 12,12 Q 15,9 15,12 Q 15,15 12,15 Q 9,15 9,12 Q 9,6 12,6 Q 18,6 18,12 Q 18,18 12,18 Q 3,18 3,12 Q 3,3 12,3 Q 21,3 21,12" fill="none" stroke="white" stroke-width="4"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-spiral)"/></svg>`,
  },
  {
    id: 'mask-zoom-in',
    name: 'Zoom In',
    generateContent: (bbox) => {
      const gradId = uniqueId('zoom-grad');
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const minScale = 0.1;
      const maxScale = 1.5;
      return `<defs>
  <radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white" stop-opacity="1"/>
    <stop offset="90%" stop-color="white" stop-opacity="1"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="url(#${gradId})" transform-origin="${cx} ${cy}">
  <animateTransform attributeName="transform" type="scale" from="${minScale}" to="${maxScale}" dur="2.5s" repeatCount="indefinite" calcMode="ease-in-out" />
  <animateTransform attributeName="transform" type="translate" values="${cx * (1 - minScale)},${cy * (1 - minScale)};${cx * (1 - maxScale)},${cy * (1 - maxScale)}" dur="2.5s" repeatCount="indefinite" additive="sum" calcMode="ease-in-out" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="prev-zoom" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white" stop-opacity="1"/><stop offset="90%" stop-color="white" stop-opacity="1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient><mask id="prev-mask-zoom"><rect width="24" height="24" fill="url(#prev-zoom)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-zoom)"/></svg>`,
  },
  {
    id: 'mask-checkerboard',
    name: 'Checkerboard',
    generateContent: (bbox) => {
      // 4x4 checkerboard pattern where squares appear in sequence
      const cols = 4;
      const rows = 4;
      const cellW = bbox.width / cols;
      const cellH = bbox.height / rows;
      const cells: string[] = [];
      let delay = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = bbox.x + c * cellW;
          const y = bbox.y + r * cellH;
          // Checkerboard pattern - alternate start times
          const isEven = (r + c) % 2 === 0;
          delay = isEven ? 0 : 0.5;
          cells.push(`<rect x="${x}" y="${y}" width="0" height="0" fill="white">
  <animate attributeName="width" begin="${delay}s" from="0" to="${cellW}" dur="1s" repeatCount="indefinite" calcMode="ease-in-out" />
  <animate attributeName="height" begin="${delay}s" from="0" to="${cellH}" dur="1s" repeatCount="indefinite" calcMode="ease-in-out" />
</rect>`);
        }
      }
      return cells.join('\n');
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-checker"><rect x="0" y="0" width="6" height="6" fill="white"/><rect x="12" y="0" width="6" height="6" fill="white"/><rect x="6" y="6" width="6" height="6" fill="white"/><rect x="18" y="6" width="6" height="6" fill="white"/><rect x="0" y="12" width="6" height="6" fill="white"/><rect x="12" y="12" width="6" height="6" fill="white"/><rect x="6" y="18" width="6" height="6" fill="white"/><rect x="18" y="18" width="6" height="6" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-checker)"/></svg>`,
  },
  {
    id: 'mask-radial-burst',
    name: 'Radial Burst',
    generateContent: (bbox) => {
      // Multiple circles bursting outward from center
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const maxR = Math.max(bbox.width, bbox.height) * 0.6;
      const numCircles = 3;
      const circles = Array.from({ length: numCircles }, (_, i) => {
        const delay = i * 0.4;
        return `<circle cx="${cx}" cy="${cy}" r="0" fill="none" stroke="white" stroke-width="${maxR * 0.15}" opacity="0.8">
  <animate attributeName="r" begin="${delay}s" from="0" to="${maxR}" dur="1.5s" repeatCount="indefinite" />
  <animate attributeName="opacity" begin="${delay}s" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
</circle>`;
      }).join('\n');
      // Add solid center circle
      return `<circle cx="${cx}" cy="${cy}" r="${maxR * 0.2}" fill="white"/>
${circles}`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-burst"><circle cx="12" cy="12" r="4" fill="white"/><circle cx="12" cy="12" r="7" fill="none" stroke="white" stroke-width="2" opacity="0.7"/><circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="2" opacity="0.4"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-burst)"/></svg>`,
  },
  {
    id: 'mask-bounce',
    name: 'Bounce',
    generateContent: (bbox) => {
      const gradId = uniqueId('bounce-grad');
      // Circle that bounces up and down with squash/stretch
      const cx = bbox.x + bbox.width / 2;
      const topY = bbox.y + bbox.height * 0.25;
      const bottomY = bbox.y + bbox.height * 0.75;
      const r = Math.min(bbox.width, bbox.height) * 0.3;
      return `<defs>
  <radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white"/>
    <stop offset="100%" stop-color="white" stop-opacity="0.7"/>
  </radialGradient>
</defs>
<ellipse cx="${cx}" cy="${topY}" rx="${r}" ry="${r}" fill="url(#${gradId})">
  <animate attributeName="cy" values="${topY};${bottomY};${topY}" dur="1s" repeatCount="indefinite" calcMode="spline" keySplines="0.5 0 0.5 1; 0.5 0 0.5 1" />
  <animate attributeName="ry" values="${r};${r * 0.7};${r}" dur="1s" repeatCount="indefinite" calcMode="spline" keySplines="0.5 0 0.5 1; 0.5 0 0.5 1" />
  <animate attributeName="rx" values="${r};${r * 1.2};${r}" dur="1s" repeatCount="indefinite" calcMode="spline" keySplines="0.5 0 0.5 1; 0.5 0 0.5 1" />
</ellipse>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="prev-bounce" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0.7"/></radialGradient><mask id="prev-mask-bounce"><ellipse cx="12" cy="14" rx="8" ry="6" fill="url(#prev-bounce)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-bounce)"/></svg>`,
  },
  {
    id: 'mask-typewriter',
    name: 'Typewriter',
    generateContent: (bbox) => {
      // Vertical line that reveals content like a typewriter
      const lineWidth = 3;
      const startX = bbox.x;
      const endX = bbox.x + bbox.width;
      return `<rect x="${bbox.x}" y="${bbox.y}" width="0" height="${bbox.height}" fill="white">
  <animate attributeName="width" begin="0s" from="0" to="${bbox.width}" dur="3s" repeatCount="indefinite" calcMode="linear" />
</rect>
<rect x="${startX}" y="${bbox.y}" width="${lineWidth}" height="${bbox.height}" fill="white">
  <animate attributeName="x" begin="0s" from="${startX}" to="${endX}" dur="3s" repeatCount="indefinite" calcMode="linear" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-typewriter"><rect x="0" y="0" width="14" height="24" fill="white"/><rect x="14" y="0" width="2" height="24" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-typewriter)"/></svg>`,
  },
  {
    id: 'mask-scanner',
    name: 'Scanner',
    generateContent: (bbox) => {
      const gradId = uniqueId('scanner-grad');
      // Scanning line that moves up and down with trailing glow
      const lineHeight = bbox.height * 0.1;
      const startY = bbox.y - lineHeight;
      const endY = bbox.y + bbox.height;
      return `<defs>
  <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="white" stop-opacity="0"/>
    <stop offset="40%" stop-color="white" stop-opacity="1"/>
    <stop offset="60%" stop-color="white" stop-opacity="1"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect x="${bbox.x}" y="${startY}" width="${bbox.width}" height="${lineHeight}" fill="url(#${gradId})">
  <animate attributeName="y" values="${startY};${endY};${startY}" dur="2s" repeatCount="indefinite" calcMode="linear" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="prev-scanner" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="40%" stop-color="white" stop-opacity="1"/><stop offset="60%" stop-color="white" stop-opacity="1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient><mask id="prev-mask-scanner"><rect x="0" y="8" width="24" height="6" fill="url(#prev-scanner)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-scanner)"/></svg>`,
  },
  {
    id: 'mask-corner-vignette',
    name: 'Corner Vignette',
    generateContent: (bbox) => {
      const gradId = uniqueId('vignette-grad');
      // Radial gradient from center, fading to black at corners
      return `<defs>
  <radialGradient id="${gradId}" cx="50%" cy="50%" r="70%">
    <stop offset="0%" stop-color="white" stop-opacity="1"/>
    <stop offset="70%" stop-color="white" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="black" stop-opacity="1"/>
  </radialGradient>
</defs>
<rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="url(#${gradId})"/>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="prev-vignette" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="white" stop-opacity="1"/><stop offset="70%" stop-color="white" stop-opacity="0.8"/><stop offset="100%" stop-color="black" stop-opacity="1"/></radialGradient><mask id="prev-mask-vignette"><rect width="24" height="24" fill="url(#prev-vignette)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-vignette)"/></svg>`,
  },
  {
    id: 'mask-shutter',
    name: 'Shutter',
    generateContent: (bbox) => {
      // Camera shutter effect - 6 triangular blades rotating open
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const r = Math.max(bbox.width, bbox.height) * 0.7;
      const blades = 6;
      const bladeAngle = 360 / blades;
      const bladesContent = Array.from({ length: blades }, (_, i) => {
        const startAngle = i * bladeAngle;
        const rad1 = (startAngle * Math.PI) / 180;
        const rad2 = ((startAngle + bladeAngle * 0.8) * Math.PI) / 180;
        const x1 = cx + r * Math.cos(rad1);
        const y1 = cy + r * Math.sin(rad1);
        const x2 = cx + r * Math.cos(rad2);
        const y2 = cy + r * Math.sin(rad2);
        return `<polygon points="${cx},${cy} ${x1},${y1} ${x2},${y2}" fill="white">
  <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="${bladeAngle} ${cx} ${cy}" dur="0.5s" repeatCount="indefinite" />
</polygon>`;
      }).join('\n');
      return bladesContent;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-shutter"><polygon points="12,12 12,0 20,4" fill="white"/><polygon points="12,12 20,4 24,12" fill="white"/><polygon points="12,12 24,12 20,20" fill="white"/><polygon points="12,12 20,20 12,24" fill="white"/><polygon points="12,12 12,24 4,20" fill="white"/><polygon points="12,12 4,20 0,12" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-shutter)"/></svg>`,
  },
  {
    id: 'mask-glitch',
    name: 'Glitch',
    generateContent: (bbox) => {
      // Glitch effect with random horizontal bars
      const numBars = 8;
      const bars = Array.from({ length: numBars }, (_, i) => {
        const y = bbox.y + (i / numBars) * bbox.height;
        const h = bbox.height / numBars;
        const offset = (i % 2 === 0 ? 1 : -1) * bbox.width * 0.1;
        const delay = i * 0.05;
        return `<rect x="${bbox.x}" y="${y}" width="${bbox.width}" height="${h}" fill="white">
  <animate attributeName="x" values="${bbox.x};${bbox.x + offset};${bbox.x - offset};${bbox.x}" dur="0.3s" begin="${delay}s" repeatCount="indefinite" calcMode="discrete" />
</rect>`;
      }).join('\n');
      return bars;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-glitch"><rect x="0" y="0" width="24" height="3" fill="white"/><rect x="2" y="3" width="24" height="3" fill="white"/><rect x="-1" y="6" width="24" height="3" fill="white"/><rect x="3" y="9" width="24" height="3" fill="white"/><rect x="0" y="12" width="24" height="3" fill="white"/><rect x="-2" y="15" width="24" height="3" fill="white"/><rect x="1" y="18" width="24" height="3" fill="white"/><rect x="0" y="21" width="24" height="3" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-glitch)"/></svg>`,
  },
  {
    id: 'mask-kaleidoscope',
    name: 'Kaleidoscope',
    generateContent: (bbox) => {
      // Rotating kaleidoscope pattern
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const r = Math.min(bbox.width, bbox.height) * 0.5;
      const segments = 8;
      const segmentAngle = 360 / segments;
      const segs = Array.from({ length: segments }, (_, i) => {
        const startAngle = i * segmentAngle;
        const rad1 = (startAngle * Math.PI) / 180;
        const rad2 = ((startAngle + segmentAngle) * Math.PI) / 180;
        const x1 = cx + r * Math.cos(rad1);
        const y1 = cy + r * Math.sin(rad1);
        const x2 = cx + r * Math.cos(rad2);
        const y2 = cy + r * Math.sin(rad2);
        const fill = i % 2 === 0 ? 'white' : 'gray';
        return `<polygon points="${cx},${cy} ${x1},${y1} ${x2},${y2}" fill="${fill}"/>`;
      }).join('\n');
      return `<g>
  ${segs}
  <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="8s" repeatCount="indefinite" />
</g>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-kaleidoscope"><polygon points="12,12 12,0 24,0" fill="white"/><polygon points="12,12 24,0 24,12" fill="gray"/><polygon points="12,12 24,12 24,24" fill="white"/><polygon points="12,12 24,24 12,24" fill="gray"/><polygon points="12,12 12,24 0,24" fill="white"/><polygon points="12,12 0,24 0,12" fill="gray"/><polygon points="12,12 0,12 0,0" fill="white"/><polygon points="12,12 0,0 12,0" fill="gray"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-kaleidoscope)"/></svg>`,
  },
  {
    id: 'mask-liquid',
    name: 'Liquid',
    generateContent: (bbox) => {
      const gradId = uniqueId('liquid-grad');
      // Morphing blob shape
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const r = Math.min(bbox.width, bbox.height) * 0.4;
      // Two blob states for morphing
      const blob1 = `M ${cx},${cy - r} 
        C ${cx + r * 1.2},${cy - r * 0.8} ${cx + r},${cy + r * 0.5} ${cx + r * 0.5},${cy + r}
        C ${cx},${cy + r * 1.2} ${cx - r * 0.8},${cy + r} ${cx - r * 0.5},${cy + r * 0.3}
        C ${cx - r * 1.2},${cy - r * 0.2} ${cx - r * 0.8},${cy - r * 0.8} ${cx},${cy - r} Z`;
      const blob2 = `M ${cx},${cy - r * 0.8} 
        C ${cx + r * 0.8},${cy - r * 1.1} ${cx + r * 1.2},${cy + r * 0.3} ${cx + r * 0.3},${cy + r * 0.8}
        C ${cx - r * 0.2},${cy + r * 1.1} ${cx - r * 1.1},${cy + r * 0.5} ${cx - r * 0.8},${cy - r * 0.2}
        C ${cx - r * 0.5},${cy - r * 1.2} ${cx - r * 0.2},${cy - r} ${cx},${cy - r * 0.8} Z`;
      return `<defs>
  <radialGradient id="${gradId}" cx="50%" cy="50%" r="60%">
    <stop offset="0%" stop-color="white"/>
    <stop offset="100%" stop-color="white" stop-opacity="0.5"/>
  </radialGradient>
</defs>
<path d="${blob1}" fill="url(#${gradId})">
  <animate attributeName="d" values="${blob1};${blob2};${blob1}" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
</path>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="prev-liquid" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0.5"/></radialGradient><mask id="prev-mask-liquid"><path d="M 12,4 C 16,3 18,8 16,12 C 18,16 14,19 10,18 C 6,20 4,14 6,10 C 4,6 8,3 12,4 Z" fill="url(#prev-liquid)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-liquid)"/></svg>`,
  },
  {
    id: 'mask-cinema-bars',
    name: 'Cinema Bars',
    generateContent: (bbox) => {
      // Cinematic letterbox bars that animate in/out
      const barHeight = bbox.height * 0.15;
      return `<rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width}" height="${bbox.height}" fill="white"/>
<rect x="${bbox.x}" y="${bbox.y}" width="${bbox.width}" height="0" fill="black">
  <animate attributeName="height" values="0;${barHeight};${barHeight};0" dur="4s" repeatCount="indefinite" />
</rect>
<rect x="${bbox.x}" y="${bbox.y + bbox.height}" width="${bbox.width}" height="0" fill="black">
  <animate attributeName="y" values="${bbox.y + bbox.height};${bbox.y + bbox.height - barHeight};${bbox.y + bbox.height - barHeight};${bbox.y + bbox.height}" dur="4s" repeatCount="indefinite" />
  <animate attributeName="height" values="0;${barHeight};${barHeight};0" dur="4s" repeatCount="indefinite" />
</rect>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-cinema"><rect width="24" height="24" fill="white"/><rect x="0" y="0" width="24" height="4" fill="black"/><rect x="0" y="20" width="24" height="4" fill="black"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-cinema)"/></svg>`,
  },
  {
    id: 'mask-starburst',
    name: 'Starburst',
    generateContent: (bbox) => {
      // Star shape that rotates and pulses
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const outerR = Math.min(bbox.width, bbox.height) * 0.45;
      const innerR = outerR * 0.4;
      const points = 12;
      let starPath = '';
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        starPath += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
      }
      starPath += ' Z';
      return `<path d="${starPath}" fill="white">
  <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="6s" repeatCount="indefinite" />
  <animateTransform attributeName="transform" type="scale" values="1;1.1;1" dur="1s" repeatCount="indefinite" additive="sum" />
  <animateTransform attributeName="transform" type="translate" values="0,0;${-cx * 0.1},${-cy * 0.1};0,0" dur="1s" repeatCount="indefinite" additive="sum" />
</path>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><mask id="prev-mask-starburst"><path d="M 12,2 L 13.5,9 L 20,5 L 15,10.5 L 22,12 L 15,13.5 L 20,19 L 13.5,15 L 12,22 L 10.5,15 L 4,19 L 9,13.5 L 2,12 L 9,10.5 L 4,5 L 10.5,9 Z" fill="white"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-starburst)"/></svg>`,
  },
  {
    id: 'mask-pendulum',
    name: 'Pendulum',
    generateContent: (bbox) => {
      const gradId = uniqueId('pendulum-grad');
      // Swinging pendulum effect
      const cx = bbox.x + bbox.width / 2;
      const topY = bbox.y;
      const r = Math.min(bbox.width, bbox.height) * 0.35;
      const cy = bbox.y + bbox.height * 0.7;
      return `<defs>
  <radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white"/>
    <stop offset="100%" stop-color="white" stop-opacity="0.6"/>
  </radialGradient>
</defs>
<g transform-origin="${cx} ${topY}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gradId})"/>
  <animateTransform attributeName="transform" type="rotate" values="-30 ${cx} ${topY};30 ${cx} ${topY};-30 ${cx} ${topY}" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
</g>`;
    },
    generateAttrs: (bbox) => ({
      x: String(bbox.x),
      y: String(bbox.y),
      width: String(bbox.width),
      height: String(bbox.height),
    }),
    previewSvg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="prev-pendulum" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0.6"/></radialGradient><mask id="prev-mask-pendulum"><circle cx="8" cy="16" r="6" fill="url(#prev-pendulum)"/></mask></defs><rect width="24" height="24" fill="currentColor" mask="url(#prev-mask-pendulum)"/></svg>`,
  },
];

/**
 * Generate mask definition from preset and bounding box
 */
export const generateMaskFromPreset = (
  preset: MaskPreset,
  bbox: MaskBBox = DEFAULT_BBOX
): {
  id: string;
  name: string;
  content: string;
  x: string;
  y: string;
  width: string;
  height: string;
  originX: number;
  originY: number;
  version: number;
  maskUnits: 'userSpaceOnUse';
  maskContentUnits: 'userSpaceOnUse';
} => {
  const attrs = preset.generateAttrs(bbox);
  return {
    id: `${preset.id}-${Date.now()}`,
    name: preset.name,
    content: preset.generateContent(bbox),
    ...attrs,
    // originX/originY track movement DELTA from original position
    // They start at 0 and get updated when the masked element moves
    originX: 0,
    originY: 0,
    version: 0,
    maskUnits: 'userSpaceOnUse',
    maskContentUnits: 'userSpaceOnUse',
  };
};

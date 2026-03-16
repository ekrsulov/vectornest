import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

interface VisualComparisonResult {
  mismatchPixels: number;
  mismatchRatio: number;
  maxChannelDelta: number;
  expectedPngBase64: string;
  actualPngBase64: string;
  diffPngBase64: string;
}

const viewportlessCenteredSymbolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-400 -400 800 800" width="100%" height="100%">
  <defs>
    <linearGradient id="g" x1="-1" y1="-1" x2="1" y2="1">
      <stop offset="0" stop-color="#ff007f" />
      <stop offset="1" stop-color="#00ffff" />
    </linearGradient>
    <pattern id="p" width="50" height="50" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M0,0 L50,50 M50,0 L0,50" stroke="url(#g)" stroke-width="2" opacity="0.4"/>
    </pattern>
    <filter id="f" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="15" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="c">
      <polygon points="0,-350 350,0 0,350 -350,0">
        <animateTransform attributeName="transform" type="rotate" values="0; 360" dur="20s" repeatCount="indefinite"/>
      </polygon>
    </clipPath>
    <mask id="m">
      <rect x="-400" y="-400" width="800" height="800" fill="#fff"/>
      <circle cx="0" cy="0" r="280" fill="#000">
        <animate attributeName="r" values="100;300;100" dur="6s" repeatCount="indefinite"/>
      </circle>
    </mask>
    <symbol id="s">
      <g filter="url(#f)">
        <polygon points="0,-300 300,0 0,300 -300,0" fill="url(#p)" stroke="url(#g)" stroke-width="6"/>
        <polygon points="0,-200 200,0 0,200 -200,0" fill="none" stroke="#fff" stroke-width="2"/>
        <circle cx="0" cy="0" r="120" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="20 40">
          <animateTransform attributeName="transform" type="rotate" values="360; 0" dur="10s" repeatCount="indefinite"/>
        </circle>
      </g>
    </symbol>
  </defs>
  <rect x="-400" y="-400" width="800" height="800" fill="#050510"/>
  <use href="#s" clip-path="url(#c)" mask="url(#m)">
    <animateTransform attributeName="transform" type="rotate" values="0; 360" dur="40s" repeatCount="indefinite"/>
  </use>
  <g>
    <animateTransform attributeName="transform" type="scale" values="0.4; 0.6; 0.4" dur="8s" repeatCount="indefinite"/>
    <use href="#s">
      <animateTransform attributeName="transform" type="rotate" values="360; 0" dur="20s" repeatCount="indefinite"/>
    </use>
  </g>
</svg>`;

const liquidPatternSymbolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%" style="background:#0a0a0a;">
  <defs>
    <filter id="liquid">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise">
        <animate attributeName="baseFrequency" values="0.02;0.05;0.02" dur="8s" repeatCount="indefinite" />
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" xChannelSelector="R" yChannelSelector="G" />
    </filter>
    <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff0055">
        <animate attributeName="stop-color" values="#ff0055;#00ffaa;#5500ff;#ff0055" dur="6s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#ffe600"/>
    </linearGradient>
    <pattern id="stripes" width="20" height="20" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="10" height="20" fill="url(#rainbow)"/>
    </pattern>
    <clipPath id="hexa">
      <polygon points="400,100 660,250 660,550 400,700 140,550 140,250" />
    </clipPath>
    <mask id="fadeMask">
      <radialGradient id="fadeGrad" cx="50%" cy="50%" r="50%">
        <stop offset="40%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#222222" />
      </radialGradient>
      <circle cx="400" cy="400" r="400" fill="url(#fadeGrad)"/>
    </mask>
    <symbol id="blob" viewBox="0 0 200 200">
      <path d="M100,20 C150,20 180,50 180,100 C180,150 150,180 100,180 C50,180 20,150 20,100 C20,50 50,20 100,20 Z" fill="url(#stripes)" filter="url(#liquid)"/>
    </symbol>
    <path id="wavePath" d="M 0,400 Q 200,200 400,400 T 800,400 T 1200,400" fill="none" />
  </defs>
  <g mask="url(#fadeMask)">
    <g clip-path="url(#hexa)">
      <rect width="800" height="800" fill="#151515" />
      <use href="#blob" x="100" y="100" width="600" height="600">
        <animateTransform attributeName="transform" type="rotate" values="0 400 400; 360 400 400" dur="15s" repeatCount="indefinite" />
      </use>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="360 400 400; 0 400 400" dur="10s" repeatCount="indefinite" />
        <use href="#blob" x="250" y="250" width="300" height="300" opacity="0.8" />
      </g>
    </g>
  </g>
  <text font-family="sans-serif" font-weight="bold" font-size="28" fill="#ffffff">
    <textPath href="#wavePath">
      ORGANIC DYNAMICS ⬡ FRACTAL NOISE ⬡ DISPLACEMENT MAPS ⬡ SMIL ⬡
      <animate attributeName="startOffset" values="-50%;0%" dur="5s" repeatCount="indefinite" />
    </textPath>
  </text>
</svg>`;

const maskedSymbolHoleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="rg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff007f">
        <animate attributeName="stop-color" values="#ff007f;#00f0ff;#ff007f" dur="4s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#1b0033"/>
    </radialGradient>
    <filter id="f">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="pt" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="1.5" fill="#ffffff" opacity="0.3"/>
    </pattern>
    <clipPath id="cp">
      <polygon points="200,20 380,380 20,380">
        <animate attributeName="points" values="200,20 380,380 20,380; 200,80 340,340 60,340; 200,20 380,380 20,380" dur="5s" repeatCount="indefinite"/>
      </polygon>
    </clipPath>
    <mask id="mk">
      <rect width="400" height="400" fill="#ffffff"/>
      <circle cx="200" cy="200" r="50" fill="#000000"/>
    </mask>
    <path id="tp" d="M100,200 a100,100 0 1,1 200,0 a100,100 0 1,1 -200,0"/>
    <symbol id="sym">
      <rect x="50" y="50" width="300" height="300" fill="url(#rg)" filter="url(#f)" mask="url(#mk)"/>
    </symbol>
  </defs>
  <rect width="100%" height="100%" fill="#050510"/>
  <rect width="100%" height="100%" fill="url(#pt)"/>
  <use href="#sym" clip-path="url(#cp)">
    <animateTransform attributeName="transform" type="rotate" values="0 200 200; 360 200 200" dur="12s" repeatCount="indefinite"/>
  </use>
  <text fill="#00f0ff" font-family="sans-serif" font-size="18" font-weight="900" letter-spacing="3">
    <textPath href="#tp" startOffset="0%">
      MINIMAL COMPLEXITY • ADVANCED SVG •
      <animate attributeName="startOffset" values="0%;100%" dur="10s" repeatCount="indefinite"/>
    </textPath>
  </text>
</svg>`;

const liquidMaskedUseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" aria-label="Composicion abstracta vibrante con referencias y animaciones SMIL">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="800" y2="800" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#12002f">
        <animate attributeName="stop-color" values="#12002f;#1a0038;#12002f" dur="14s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" stop-color="#4b00ff">
        <animate attributeName="stop-color" values="#4b00ff;#00c2ff;#ff2d8d;#4b00ff" dur="10s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#ff6a00">
        <animate attributeName="stop-color" values="#ff6a00;#ffd400;#ff6a00" dur="12s" repeatCount="indefinite"/>
      </stop>
      <animateTransform attributeName="gradientTransform" type="rotate" values="0 400 400;360 400 400" dur="30s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="petalGrad" x1="0" y1="-230" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffe600">
        <animate attributeName="stop-color" values="#ffe600;#00f5d4;#ffe600" dur="8s" repeatCount="indefinite"/>
      </stop>
      <stop offset="55%" stop-color="#ff4d6d">
        <animate attributeName="stop-color" values="#ff4d6d;#7b2cff;#ff4d6d" dur="9s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#ff006e">
        <animate attributeName="stop-color" values="#ff006e;#ff8500;#ff006e" dur="11s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
    <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="35%" stop-color="#ffe600" stop-opacity="1">
        <animate attributeName="stop-color" values="#ffe600;#ffffff;#00f5d4;#ffe600" dur="7s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#ff006e" stop-opacity="1">
        <animate attributeName="stop-color" values="#ff006e;#7b2cff;#ff006e" dur="7s" repeatCount="indefinite"/>
      </stop>
    </radialGradient>
    <radialGradient id="flareGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="edgeGrad" x1="-320" y1="-320" x2="320" y2="320" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#00f5d4"/>
      <stop offset="50%" stop-color="#ffffff">
        <animate attributeName="stop-color" values="#ffffff;#ffe600;#ffffff" dur="6s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#ff006e"/>
    </linearGradient>
    <filter id="liquid" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="9" result="noise">
        <animate attributeName="baseFrequency" values="0.012 0.02;0.022 0.008;0.012 0.02" dur="14s" repeatCount="indefinite"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G">
        <animate attributeName="scale" values="8;24;8" dur="9s" repeatCount="indefinite"/>
      </feDisplacementMap>
    </filter>
    <mask id="iris" maskUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800">
      <rect x="-400" y="-400" width="800" height="800" fill="black"/>
      <circle r="220" fill="white">
        <animate attributeName="r" values="180;320;180" dur="8s" repeatCount="indefinite"/>
      </circle>
      <polygon points="0,-130 130,0 0,130 -130,0" fill="white" opacity="0.55">
        <animateTransform attributeName="transform" type="rotate" values="0;360" dur="20s" repeatCount="indefinite"/>
      </polygon>
    </mask>
    <g id="petal">
      <rect x="-18" y="-170" width="36" height="128" rx="18" fill="url(#petalGrad)"/>
      <circle cx="0" cy="-194" r="34" fill="#ffd400"/>
      <circle cx="0" cy="-194" r="10" fill="#ffffff" opacity="0.9"/>
    </g>
    <g id="bloom">
      <use href="#petal" transform="rotate(0)"/>
      <use href="#petal" transform="rotate(45)"/>
      <use href="#petal" transform="rotate(90)"/>
      <use href="#petal" transform="rotate(135)"/>
      <use href="#petal" transform="rotate(180)"/>
      <use href="#petal" transform="rotate(225)"/>
      <use href="#petal" transform="rotate(270)"/>
      <use href="#petal" transform="rotate(315)"/>
      <circle r="72" fill="url(#coreGrad)"/>
      <polygon points="0,-88 88,0 0,88 -88,0" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="10"/>
    </g>
    <g id="frame">
      <polygon points="0,-320 320,0 0,320 -320,0" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="8"/>
      <polygon points="0,-262 262,0 0,262 -262,0" fill="none" stroke="url(#edgeGrad)" stroke-width="20"/>
      <circle r="250" fill="none" stroke="#00f5d4" stroke-opacity="0.18" stroke-width="8"/>
    </g>
  </defs>
  <rect width="800" height="800" fill="url(#bgGrad)"/>
  <g transform="translate(400 400)">
    <use href="#frame" filter="url(#liquid)" opacity="0.82">
      <animateTransform attributeName="transform" type="rotate" values="0;360" dur="26s" repeatCount="indefinite"/>
    </use>
    <use href="#frame" transform="scale(0.63)" opacity="0.34">
      <animateTransform attributeName="transform" type="rotate" values="360;0" dur="15s" repeatCount="indefinite" additive="sum"/>
    </use>
    <use href="#bloom" mask="url(#iris)" filter="url(#liquid)" opacity="0.97">
      <animateTransform attributeName="transform" type="rotate" values="0;360" dur="18s" repeatCount="indefinite"/>
    </use>
    <use href="#bloom" transform="scale(0.56)" opacity="0.42">
      <animateTransform attributeName="transform" type="rotate" values="360;0" dur="10.5s" repeatCount="indefinite" additive="sum"/>
    </use>
    <circle r="36" fill="url(#flareGrad)" opacity="0.95">
      <animate attributeName="r" values="22;40;22" dur="4.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.95;0.4;0.95" dur="4.8s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>`;

const animatedClipSymbolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
  <defs>
    <path id="curve" d="M 50,200 C 250,50 550,350 750,200">
      <animate attributeName="d" values="M 50,200 C 250,50 550,350 750,200; M 50,200 C 250,350 550,50 750,200; M 50,200 C 250,50 550,350 750,200" dur="5s" repeatCount="indefinite"/>
    </path>
    <clipPath id="clip1">
      <circle cx="400" cy="200" r="180">
        <animate attributeName="r" values="50;250;50" dur="4s" repeatCount="indefinite"/>
      </circle>
    </clipPath>
    <linearGradient id="grad3">
      <stop offset="0%" stop-color="#f0f"/>
      <stop offset="50%" stop-color="#0ff"/>
      <stop offset="100%" stop-color="#ff0"/>
    </linearGradient>
    <symbol id="bgText">
      <rect width="100%" height="100%" fill="#111"/>
      <g clip-path="url(#clip1)">
        <rect width="100%" height="100%" fill="url(#grad3)">
          <animateTransform attributeName="transform" type="rotate" values="0 400 200; 360 400 200" dur="8s" repeatCount="indefinite"/>
        </rect>
      </g>
    </symbol>
  </defs>
  <use href="#bgText" />
  <text font-size="42" font-family="sans-serif" font-weight="900" fill="#fff">
    <textPath href="#curve" startOffset="50%" text-anchor="middle">
      <animate attributeName="startOffset" values="0%;100%;0%" dur="10s" repeatCount="indefinite"/>
      MORPHING TEXTPATH CLIP
    </textPath>
  </text>
</svg>`;

const viewportlessPatternMaskSymbolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <radialGradient id="g5" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff"/>
      <stop offset="20%" stop-color="#ffff00"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="f5">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComponentTransfer in="blur" result="glow">
        <feFuncA type="linear" slope="3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="p5" width="250" height="250" patternUnits="userSpaceOnUse">
      <circle cx="125" cy="50" r="2" fill="#fff">
        <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="200" cy="150" r="1.5" fill="#fcf">
        <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="50" cy="200" r="3" fill="#cff">
         <animate attributeName="opacity" values="1;0;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </pattern>
    <clipPath id="c5">
      <polygon points="250,10 490,130 490,370 250,490 10,370 10,130"/>
    </clipPath>
    <mask id="m5">
      <circle cx="250" cy="250" r="240" fill="white"/>
    </mask>
    <path id="t5" d="M 250 100 A 150 150 0 1 1 249.9 100"/>
    <symbol id="star">
      <rect width="500" height="500" fill="url(#p5)"/>
      <circle cx="250" cy="250" r="100" fill="url(#g5)"/>
    </symbol>
  </defs>
  <rect width="500" height="500" fill="#00001a"/>
  <g transform="translate(250 250)">
    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite"/>
    <use href="#star" x="-250" y="-250" clip-path="url(#c5)" mask="url(#m5)" filter="url(#f5)"/>
  </g>
  <text fill="#fff" font-size="12" font-family="sans-serif">
    <textPath href="#t5" startOffset="0%">
      STELLAR KALEIDOSCOPE - INTERSTELLAR OVERDRIVE
      <animate attributeName="startOffset" values="0%;100%" dur="15s" repeatCount="indefinite"/>
    </textPath>
  </text>
</svg>`;

const symbolTextPathSvg = `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff00a0" />
      <stop offset="100%" stop-color="#0a00ff" />
    </radialGradient>
    <pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="20" height="40" fill="url(#g)" />
      <circle cx="20" cy="20" r="15" fill="#fff" opacity="0.3">
        <animate attributeName="r" values="2;18;2" dur="3s" repeatCount="indefinite" />
      </circle>
    </pattern>
    <filter id="f" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise">
        <animate attributeName="baseFrequency" values="0.01;0.05;0.01" dur="8s" repeatCount="indefinite" />
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="35" xChannelSelector="R" yChannelSelector="G" />
      <feDropShadow dx="8" dy="8" stdDeviation="5" flood-color="#0ff" />
    </filter>
    <clipPath id="c">
      <circle cx="300" cy="300" r="280">
        <animate attributeName="r" values="280;150;280" dur="5s" repeatCount="indefinite" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
      </circle>
    </clipPath>
    <mask id="m">
      <rect width="100%" height="100%" fill="#fff" />
      <path d="M 300 50 L 550 500 L 50 500 Z" fill="#000">
        <animateTransform attributeName="transform" type="rotate" values="0 300 350; 360 300 350" dur="4s" repeatCount="indefinite" />
      </path>
    </mask>
    <path id="tp" d="M 150 300 A 150 150 0 1 1 450 300 A 150 150 0 1 1 150 300 Z" />
    <symbol id="s">
      <rect width="600" height="600" fill="url(#p)" mask="url(#m)" />
      <text font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#0ff" letter-spacing="4">
        <textPath href="#tp">
          • COMPLEX SVG MAGIC • SMIL ANIMATION EXTREME • 
          <animate attributeName="startOffset" values="0%;100%" dur="10s" repeatCount="indefinite" />
        </textPath>
      </text>
    </symbol>
  </defs>
  <use href="#s" x="0" y="0" filter="url(#f)" clip-path="url(#c)" />
</svg>`;

async function bootstrap(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'File' }).waitFor();
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage?.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'File' }).waitFor();
}

async function importFixture(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: 'File' }).click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/core_symbol_mask_import.svg');
  await fileInput.setInputFiles({
    name: 'core-symbol-mask-import.svg',
    mimeType: 'image/svg+xml',
    buffer,
  });
  await page.waitForTimeout(1200);
}

async function importSvgContent(page: import('@playwright/test').Page, name: string, svg: string): Promise<void> {
  await page.getByRole('button', { name: 'File' }).click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles({
    name,
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg, 'utf8'),
  });
  await page.waitForTimeout(1200);
}

async function exportSvg(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async () => {
    const { ExportManager } = await import('/src/utils/export/ExportManager.ts');
    return ExportManager.generateSvgContent(false, 0).content;
  });
}

async function captureRuntimeSvgForVisualComparison(
  page: import('@playwright/test').Page,
  viewBox: string,
  width: number,
  height: number
): Promise<string> {
  return page.evaluate(({ viewBox, width, height }) => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const namespace = 'http://www.w3.org/2000/svg';
    const serializedDoc = document.implementation.createDocument(namespace, 'svg', null);
    const svg = serializedDoc.documentElement;
    svg.setAttribute('xmlns', namespace);
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const defs = canvas.querySelector('defs');
    if (defs) {
      svg.appendChild(defs.cloneNode(true));
    }

    for (const child of Array.from(canvas.children)) {
      if (!(child instanceof SVGElement)) {
        continue;
      }
      if (child.tagName.toLowerCase() === 'defs') {
        continue;
      }
      if (!child.hasAttribute('data-element-id')) {
        continue;
      }
      svg.appendChild(child.cloneNode(true));
    }

    return new XMLSerializer().serializeToString(svg);
  }, { viewBox, width, height });
}

async function compareSvgVisuals(
  page: import('@playwright/test').Page,
  expectedSvg: string,
  actualSvg: string,
  width: number,
  height: number,
  crop: { x: number; y: number; width: number; height: number }
): Promise<VisualComparisonResult> {
  return page.evaluate(
    async ({ expectedSvg, actualSvg, width, height, crop }) => {
      const namespace = 'http://www.w3.org/2000/svg';

      const normalizeSvg = (markup: string): string => {
        const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
        const svg = doc.documentElement;
        svg.setAttribute('xmlns', namespace);
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        if (!svg.getAttribute('viewBox')) {
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        return new XMLSerializer().serializeToString(svg);
      };

      const waitForImage = async (img: HTMLImageElement): Promise<void> => {
        if (img.complete && img.naturalWidth > 0) {
          return;
        }

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to decode SVG image'));
        });
      };

      const renderSvg = async (markup: string): Promise<{ imageData: ImageData; pngBase64: string }> => {
        const serialized = normalizeSvg(markup);
        const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        try {
          const img = new Image();
          img.decoding = 'async';
          img.src = url;
          await waitForImage(img);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) {
            throw new Error('2D context not available');
          }

          context.clearRect(0, 0, width, height);
          context.drawImage(img, 0, 0, width, height);

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = crop.width;
          cropCanvas.height = crop.height;
          const cropContext = cropCanvas.getContext('2d', { willReadFrequently: true });
          if (!cropContext) {
            throw new Error('Crop context not available');
          }

          cropContext.drawImage(
            canvas,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            crop.width,
            crop.height
          );

          return {
            imageData: cropContext.getImageData(0, 0, crop.width, crop.height),
            pngBase64: cropCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
          };
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      const [expected, actual] = await Promise.all([renderSvg(expectedSvg), renderSvg(actualSvg)]);
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = crop.width;
      diffCanvas.height = crop.height;
      const diffContext = diffCanvas.getContext('2d');
      if (!diffContext) {
        throw new Error('Diff context not available');
      }

      const diffImageData = diffContext.createImageData(crop.width, crop.height);
      const expectedData = expected.imageData.data;
      const actualData = actual.imageData.data;
      const diffData = diffImageData.data;

      let mismatchPixels = 0;
      let maxChannelDelta = 0;

      for (let index = 0; index < expectedData.length; index += 4) {
        const redDelta = Math.abs(expectedData[index] - actualData[index]);
        const greenDelta = Math.abs(expectedData[index + 1] - actualData[index + 1]);
        const blueDelta = Math.abs(expectedData[index + 2] - actualData[index + 2]);
        const alphaDelta = Math.abs(expectedData[index + 3] - actualData[index + 3]);
        const channelDelta = Math.max(redDelta, greenDelta, blueDelta, alphaDelta);

        maxChannelDelta = Math.max(maxChannelDelta, channelDelta);

        if (channelDelta > 20) {
          mismatchPixels += 1;
          diffData[index] = 255;
          diffData[index + 1] = 0;
          diffData[index + 2] = 140;
          diffData[index + 3] = 255;
          continue;
        }

        const luminance = Math.round(
          expectedData[index] * 0.2126 +
            expectedData[index + 1] * 0.7152 +
            expectedData[index + 2] * 0.0722
        );
        diffData[index] = luminance;
        diffData[index + 1] = luminance;
        diffData[index + 2] = luminance;
        diffData[index + 3] = 70;
      }

      diffContext.putImageData(diffImageData, 0, 0);

      return {
        mismatchPixels,
        mismatchRatio: mismatchPixels / (crop.width * crop.height),
        maxChannelDelta,
        expectedPngBase64: expected.pngBase64,
        actualPngBase64: actual.pngBase64,
        diffPngBase64: diffCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
      };
    },
    { expectedSvg, actualSvg, width, height, crop }
  );
}

async function attachVisualComparisonArtifacts(
  testInfo: import('@playwright/test').TestInfo,
  result: VisualComparisonResult
): Promise<void> {
  await testInfo.attach('liquid-filter-expected.png', {
    body: Buffer.from(result.expectedPngBase64, 'base64'),
    contentType: 'image/png',
  });
  await testInfo.attach('liquid-filter-actual.png', {
    body: Buffer.from(result.actualPngBase64, 'base64'),
    contentType: 'image/png',
  });
  await testInfo.attach('liquid-filter-diff.png', {
    body: Buffer.from(result.diffPngBase64, 'base64'),
    contentType: 'image/png',
  });
}

test('imports masked symbol core without inheriting the outer mask into the translated inner group', async ({ page }) => {
  await bootstrap(page);
  await importFixture(page);

  const initial = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      useCanvasStore?: {
        getState: () => {
          elements?: Array<{
            id: string;
            type: string;
            parentId: string | null;
            data?: {
              name?: string;
              symbolId?: string;
              maskId?: string;
              clipPathId?: string;
            };
          }>;
        };
      };
    };

    const elements = testWindow.useCanvasStore?.getState?.().elements ?? [];
    const symbolInstances = elements.filter((element) => element.type === 'symbolInstance' && element.data?.symbolId === 'core');
    const innerGroup = elements.find((element) => element.type === 'group' && element.data?.name === 'Imported Group 2');
    const outerGroup = elements.find((element) => element.type === 'group' && element.data?.name === 'Imported Group 1');
    const firstSymbol = symbolInstances[0];
    const firstHost = firstSymbol ? document.querySelector<SVGUseElement>(`use[data-element-id="${firstSymbol.id}"]`) : null;
    const bbox = firstHost?.getBoundingClientRect?.();

    return {
      symbolInstanceCount: symbolInstances.length,
      outerGroupMaskId: outerGroup?.data?.maskId ?? null,
      outerGroupClipPathId: outerGroup?.data?.clipPathId ?? null,
      innerGroupMaskId: innerGroup?.data?.maskId ?? null,
      innerGroupClipPathId: innerGroup?.data?.clipPathId ?? null,
      firstSymbolHref: firstHost?.getAttribute('href') ?? null,
      firstSymbolBBox: bbox ? { width: bbox.width, height: bbox.height } : null,
    };
  });

  expect(initial.symbolInstanceCount).toBe(3);
  expect(initial.outerGroupMaskId).toBe('fade');
  expect(initial.outerGroupClipPathId).toBe('clip');
  expect(initial.innerGroupMaskId).toBeNull();
  expect(initial.innerGroupClipPathId).toBeNull();
  expect(initial.firstSymbolHref).toBe('#symbol-core');
  expect(initial.firstSymbolBBox).not.toBeNull();
  expect(initial.firstSymbolBBox?.width ?? 0).toBeGreaterThan(0);
  expect(initial.firstSymbolBBox?.height ?? 0).toBeGreaterThan(0);

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('mask="url(#fade)"');
  expect(exportedSvg).toContain('clip-path="url(#clip)"');
  expect(exportedSvg).not.toContain('data-name="Imported Group 2" transform="matrix(1 0 0 1 500 500)" mask="url(#fade)"');
  expect(exportedSvg).toContain('href="#symbol-core"');
});

test('preserves viewportless symbol instances centered with clipPath and mask', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'viewportless-centered-symbol.svg', viewportlessCenteredSymbolSvg);

  const runtime = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const state = window.useCanvasStore?.getState?.();
    const symbolInstances = (state?.elements ?? []).filter((element) => element.type === 'symbolInstance' && element.data?.symbolId === 's');
    const primaryInstance = symbolInstances.find((element) => element.data?.clipPathId === 'c' && element.data?.maskId === 'm') ?? null;
    const secondaryInstance = symbolInstances.find((element) => element !== primaryInstance) ?? null;
    const symbolDef = canvas.querySelector('defs #symbol-s');
    const patternDef = canvas.querySelector('defs #p');
    const primaryHost = primaryInstance
      ? document.querySelector<SVGGElement>(`g[data-element-id="${primaryInstance.id}"]`)
      : null;
    const primaryUse = primaryInstance
      ? document.querySelector<SVGUseElement>(`use[data-element-id="${primaryInstance.id}"]`)
      : null;
    const secondaryHost = secondaryInstance
      ? document.querySelector<SVGGElement>(`g[data-element-id="${secondaryInstance.id}"]`)
      : null;
    const secondaryUse = secondaryInstance
      ? document.querySelector<SVGUseElement>(`use[data-element-id="${secondaryInstance.id}"]`)
      : null;

    return {
      symbolInstanceCount: symbolInstances.length,
      symbolViewBox: symbolDef?.getAttribute('viewBox') ?? null,
      symbolOverflow: symbolDef?.getAttribute('overflow') ?? null,
      patternTagName: patternDef?.tagName ?? null,
      primaryX: primaryUse?.getAttribute('x') ?? null,
      primaryY: primaryUse?.getAttribute('y') ?? null,
      primaryTransform: primaryUse?.getAttribute('transform') ?? null,
      primaryWidth: primaryUse?.getAttribute('width') ?? null,
      primaryHeight: primaryUse?.getAttribute('height') ?? null,
      primaryClipPath: primaryUse?.getAttribute('clip-path') ?? null,
      primaryMask: primaryUse?.getAttribute('mask') ?? primaryHost?.getAttribute('mask') ?? null,
      secondaryClipPath: secondaryUse?.getAttribute('clip-path') ?? null,
      secondaryMask: secondaryUse?.getAttribute('mask') ?? secondaryHost?.getAttribute('mask') ?? null,
      secondaryWidth: secondaryUse?.getAttribute('width') ?? null,
      secondaryHeight: secondaryUse?.getAttribute('height') ?? null,
    };
  });

  expect(runtime.symbolInstanceCount).toBe(2);
  expect(runtime.symbolViewBox).toBeNull();
  expect(runtime.symbolOverflow).toBeNull();
  expect(runtime.patternTagName).toBe('pattern');
  expect(runtime.primaryX).toBeNull();
  expect(runtime.primaryY).toBeNull();
  expect(runtime.primaryTransform).toBe('matrix(1 0 0 1 0 0)');
  expect(runtime.primaryWidth).toBeNull();
  expect(runtime.primaryHeight).toBeNull();
  expect(runtime.secondaryWidth).toBeNull();
  expect(runtime.secondaryHeight).toBeNull();
  expect(runtime.primaryClipPath).toBe('url(#c)');
  expect(runtime.primaryMask).toMatch(/^url\(#m/);
  expect(runtime.secondaryClipPath).toBeNull();
  expect(runtime.secondaryMask).toBeNull();

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('<pattern id="p"');
  expect(exportedSvg).toContain('<symbol id="symbol-s">');
  expect(exportedSvg).not.toContain('<symbol id="symbol-s" viewBox="-400 -400 800 800"');
  expect(exportedSvg).toMatch(/<use[^>]*href="#symbol-s"[^>]*clip-path="url\(#c\)"[^>]*mask="url\(#m\)"/);
  expect(exportedSvg).toMatch(/<use[^>]*href="#symbol-s"(?![^>]*x=)(?![^>]*y=)(?![^>]*width=)(?![^>]*height=)[^>]*clip-path="url\(#c\)"[^>]*mask="url\(#m\)"/);
  expect(exportedSvg).toMatch(/<g[^>]*>\s*<animateTransform[^>]*values="0\.4; 0\.6; 0\.4"[\s\S]*?<use[^>]*href="#symbol-s"(?![^>]*clip-path=)(?![^>]*mask=)(?![^>]*x=)(?![^>]*y=)(?![^>]*width=)(?![^>]*height=)[^>]*>/);
});

test('preserves gradient-driven pattern and filter defs for imported symbol uses', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'liquid-pattern-symbol.svg', liquidPatternSymbolSvg);

  const runtime = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const defs = canvas.querySelector('defs');
    const symbolDef = defs?.querySelector('#symbol-blob');
    const patternDef = defs?.querySelector('#stripes');
    const gradientDef = defs?.querySelector('#rainbow');
    const filterDef = defs?.querySelector('#liquid');
    const blobPath = symbolDef?.querySelector('path');
    const symbolUseCount = canvas.querySelectorAll('use[href="#symbol-blob"]').length;
    const flattenedBlobPathCount = canvas.querySelectorAll('[data-element-id] path[fill="url(#stripes)"]').length;

    return {
      symbolId: symbolDef?.getAttribute('id') ?? null,
      patternId: patternDef?.getAttribute('id') ?? null,
      gradientId: gradientDef?.getAttribute('id') ?? null,
      filterId: filterDef?.getAttribute('id') ?? null,
      blobFill: blobPath?.getAttribute('fill') ?? null,
      blobFilter: blobPath?.getAttribute('filter') ?? null,
      patternRectFill: patternDef?.querySelector('rect')?.getAttribute('fill') ?? null,
      filterHasTurbulence: filterDef?.querySelector('feTurbulence') !== null,
      symbolUseCount,
      flattenedBlobPathCount,
    };
  });

  expect(runtime.symbolId).toBe('symbol-blob');
  expect(runtime.patternId).toBe('stripes');
  expect(runtime.gradientId).toBe('rainbow');
  expect(runtime.filterId).toBe('liquid');
  expect(runtime.blobFill).toBe('url(#stripes)');
  expect(runtime.blobFilter).toBe('url(#liquid)');
  expect(runtime.patternRectFill).toBe('url(#rainbow)');
  expect(runtime.filterHasTurbulence).toBe(true);
  expect(runtime.symbolUseCount).toBe(2);
  expect(runtime.flattenedBlobPathCount).toBe(0);

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('<symbol id="symbol-blob"');
  expect(exportedSvg).toContain('<pattern id="stripes"');
  expect(exportedSvg).toContain('<linearGradient id="rainbow"');
  expect(exportedSvg).toMatch(/<filter[^>]*id="liquid"/);
  expect(exportedSvg).toContain('fill="url(#stripes)"');
  expect(exportedSvg).toContain('fill="url(#rainbow)"');
  expect(exportedSvg).toContain('filter="url(#liquid)"');
});

test('preserves masks referenced inside imported symbol content', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'masked-symbol-hole.svg', maskedSymbolHoleSvg);

  const runtime = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const defs = canvas.querySelector('defs');
    const symbolDef = defs?.querySelector('#symbol-sym');
    const maskDef = defs?.querySelector('#mk');
    const maskCircle = maskDef?.querySelector('circle');
    const maskedRect = symbolDef?.querySelector('rect');

    return {
      symbolId: symbolDef?.getAttribute('id') ?? null,
      maskId: maskDef?.getAttribute('id') ?? null,
      maskedRectMask: maskedRect?.getAttribute('mask') ?? null,
      maskCircleRadius: maskCircle?.getAttribute('r') ?? null,
      maskCircleFill: maskCircle?.getAttribute('fill') ?? null,
    };
  });

  expect(runtime.symbolId).toBe('symbol-sym');
  expect(runtime.maskId).toBe('mk');
  expect(runtime.maskedRectMask).toBe('url(#mk)');
  expect(runtime.maskCircleRadius).toBe('50');
  expect(runtime.maskCircleFill).toBe('#000000');

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('<mask id="mk"');
  expect(exportedSvg).toContain('<circle');
  expect(exportedSvg).toContain('r="50"');
  expect(exportedSvg).toContain('fill="#000000"');
  expect(exportedSvg).toContain('mask="url(#mk)"');
});

test('preserves filter and mask attributes on imported use references', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'liquid-masked-use.svg', liquidMaskedUseSvg);

  const runtime = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const defs = canvas.querySelector('defs');
    const liquidFilter = defs?.querySelector('#liquid');
    const irisMask = defs?.querySelector('mask[id^="iris"]');
    const frameHosts = Array.from(canvas.querySelectorAll<SVGGElement>('[data-element-id][filter="url(#liquid)"]'));
    const bloomHost = Array.from(canvas.querySelectorAll<SVGGElement>('[data-element-id][mask]')).find((node) => {
      const maskValue = node.getAttribute('mask') ?? '';
      return maskValue.startsWith('url(#iris');
    }) ?? null;

    return {
      liquidFilterId: liquidFilter?.getAttribute('id') ?? null,
      irisMaskId: irisMask?.getAttribute('id') ?? null,
      frameHostCount: frameHosts.length,
      bloomMask: bloomHost?.getAttribute('mask') ?? null,
      bloomFilter: bloomHost?.getAttribute('filter') ?? null,
    };
  });

  expect(runtime.liquidFilterId).toBe('liquid');
  expect(runtime.irisMaskId).toMatch(/^iris/);
  expect(runtime.frameHostCount).toBeGreaterThanOrEqual(1);
  expect(runtime.bloomMask).toMatch(/^url\(#iris/);
  expect(runtime.bloomFilter).toBe('url(#liquid)');

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('<filter xmlns="http://www.w3.org/2000/svg" id="liquid"');
  expect(exportedSvg).toContain('<mask id="iris"');
  expect(exportedSvg).toMatch(/<use[^>]*href="#frame"[^>]*filter="url\(#liquid\)"/);
  expect(exportedSvg).toMatch(/<use[^>]*href="#bloom"[^>]*filter="url\(#liquid\)"[^>]*mask="url\(#iris\)"/);
});

test('preserves animated clip paths referenced inside imported symbol content', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'animated-clip-symbol.svg', animatedClipSymbolSvg);

  const runtime = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const defs = canvas.querySelector('defs');
    const clipDef = defs?.querySelector('clipPath[id^="clip1"]');
    const clipCircle = clipDef?.querySelector('circle');
    const symbolDef = defs?.querySelector('#symbol-bgText');
    const clippedGroup = symbolDef?.querySelector('g[clip-path="url(#clip1)"]');

    return {
      clipId: clipDef?.getAttribute('id') ?? null,
      clipCircleTag: clipCircle?.tagName ?? null,
      clipCircleRadius: clipCircle?.getAttribute('r') ?? null,
      clipHasAnimate: clipCircle?.querySelector('animate') !== null,
      symbolId: symbolDef?.getAttribute('id') ?? null,
      symbolClipPath: clippedGroup?.getAttribute('clip-path') ?? null,
    };
  });

  expect(runtime.clipId).toMatch(/^clip1/);
  expect(runtime.clipCircleTag).toBe('circle');
  expect(runtime.clipCircleRadius).toBe('180');
  expect(runtime.clipHasAnimate).toBe(true);
  expect(runtime.symbolId).toBe('symbol-bgText');
  expect(runtime.symbolClipPath).toBe('url(#clip1)');

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('<clipPath id="clip1"');
  expect(exportedSvg).toContain('<circle');
  expect(exportedSvg).toContain('r="180"');
  expect(exportedSvg).toContain('values="50;250;50"');
  expect(exportedSvg).toMatch(/<symbol id="symbol-bgText"[\s\S]*clip-path="url\(#clip1\)"/);
  expect(exportedSvg).toContain('<use id=');
  expect(exportedSvg).toContain('href="#symbol-bgText"');
});

test('applies mask filter and clip to the runtime use for viewportless imported symbols', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'viewportless-pattern-mask-symbol.svg', viewportlessPatternMaskSymbolSvg);

  const runtime = await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    const symbolInstance = (state?.elements ?? []).find(
      (element) => element.type === 'symbolInstance' && element.data?.symbolId === 'star'
    ) ?? null;
    if (!symbolInstance) {
      throw new Error('Symbol instance not found');
    }

    const useNode = document.querySelector<SVGUseElement>(`use[data-element-id="${symbolInstance.id}"]`);
    const hostNode = document.querySelector<SVGGElement>(`g[data-element-id="${symbolInstance.id}"]`);
    const defs = document.querySelector<SVGSVGElement>('svg[data-canvas="true"] defs');

    return {
      useClipPath: useNode?.getAttribute('clip-path') ?? null,
      useFilter: useNode?.getAttribute('filter') ?? null,
      useMask: useNode?.getAttribute('mask') ?? null,
      useX: useNode?.getAttribute('x') ?? null,
      useY: useNode?.getAttribute('y') ?? null,
      hostFilter: hostNode?.getAttribute('filter') ?? null,
      hostMask: hostNode?.getAttribute('mask') ?? null,
      patternId: defs?.querySelector('#p5')?.getAttribute('id') ?? null,
      filterId: defs?.querySelector('#f5')?.getAttribute('id') ?? null,
      maskId: defs?.querySelector('#m5')?.getAttribute('id') ?? null,
    };
  });

  expect(runtime.useClipPath).toBe('url(#c5)');
  expect(runtime.useFilter).toBe('url(#f5)');
  expect(runtime.useMask).toMatch(/^url\(#m5/);
  expect(runtime.useX).toBe('-250');
  expect(runtime.useY).toBe('-250');
  expect(runtime.hostFilter).toBeNull();
  expect(runtime.hostMask).toBeNull();
  expect(runtime.patternId).toBe('p5');
  expect(runtime.filterId).toBe('f5');
  expect(runtime.maskId).toMatch(/^m5/);

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toMatch(/<use[^>]*href="#symbol-star"[^>]*x="-250"[^>]*y="-250"[^>]*clip-path="url\(#c5\)"[^>]*filter="url\(#f5\)"[^>]*mask="url\(#m5\)"/);
});

test('preserves textPath carrier paths referenced only inside imported symbol content', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'symbol-textpath.svg', symbolTextPathSvg);

  const runtime = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const defs = canvas.querySelector('defs');
    const textPathCarrier = defs?.querySelector('path#tp');
    const symbolDef = defs?.querySelector('#symbol-s');
    const symbolTextPath = symbolDef?.querySelector('textPath');

    return {
      pathId: textPathCarrier?.getAttribute('id') ?? null,
      pathDisplay: textPathCarrier?.getAttribute('display') ?? null,
      pathVisibility: textPathCarrier?.getAttribute('visibility') ?? null,
      symbolId: symbolDef?.getAttribute('id') ?? null,
      textPathHref: symbolTextPath?.getAttribute('href') ?? null,
      textContent: symbolTextPath?.textContent?.trim() ?? null,
    };
  });

  expect(runtime.pathId).toBe('tp');
  expect(runtime.pathDisplay).toBe('none');
  expect(runtime.pathVisibility).toBe('hidden');
  expect(runtime.symbolId).toBe('symbol-s');
  expect(runtime.textPathHref).toBe('#tp');
  expect(runtime.textContent).toContain('COMPLEX SVG MAGIC');

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('<path id="tp"');
  expect(exportedSvg).toContain('<textPath href="#tp"');
  expect(exportedSvg).toContain('COMPLEX SVG MAGIC');
  expect(exportedSvg).toContain('attributeName="startOffset"');
});

test('visually matches browser rendering for imported liquid symbol filters', async ({ page }, testInfo) => {
  test.fail(true, 'Known mismatch: imported liquid filter render still diverges from browser output');

  await bootstrap(page);
  await importSvgContent(page, 'liquid-pattern-symbol.svg', liquidPatternSymbolSvg);

  const runtimeSvg = await captureRuntimeSvgForVisualComparison(page, '0 0 800 800', 800, 800);
  const comparison = await compareSvgVisuals(
    page,
    liquidPatternSymbolSvg,
    runtimeSvg,
    800,
    800,
    { x: 100, y: 100, width: 600, height: 600 }
  );

  await attachVisualComparisonArtifacts(testInfo, comparison);

  expect(
    comparison.mismatchRatio,
    `Expected imported runtime render to stay within 1.5% mismatch, got ${(comparison.mismatchRatio * 100).toFixed(2)}% with max channel delta ${comparison.maxChannelDelta}`
  ).toBeLessThan(0.015);
});

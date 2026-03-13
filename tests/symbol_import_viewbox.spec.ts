import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';
import { readFile } from 'node:fs/promises';

const centeredPetalSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="300" height="300">
  <defs>
    <symbol id="petal" overflow="visible">
      <ellipse cx="0" cy="0" rx="10" ry="24" fill="#ff6b81"/>
    </symbol>
  </defs>
  <g transform="translate(100 80)">
    <use href="#petal" transform="translate(0 -26)"/>
  </g>
</svg>`;

const offsetPetalSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="300" height="300">
  <defs>
    <symbol id="petal" viewBox="-10 -35 20 70">
      <ellipse cx="0" cy="-12" rx="10" ry="28" fill="#ff6b81"/>
    </symbol>
  </defs>
  <g transform="translate(100 80)">
    <use href="#petal"/>
  </g>
</svg>`;

const inheritedUseFillSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="300" height="300">
  <defs>
    <path id="petal" d="M100 40 C125 75 125 125 100 160 C75 125 75 75 100 40" />
    <g id="flower">
      <use href="#petal" fill="#ff6b81" />
      <use href="#petal" fill="#4facfe" transform="rotate(180 100 100)" />
    </g>
  </defs>
  <use href="#flower" />
</svg>`;

const useGradientDefsSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="300" height="300">
  <defs>
    <linearGradient id="warm" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff8a00"/>
      <stop offset="100%" stop-color="#ffd166"/>
    </linearGradient>
    <linearGradient id="cool" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#118ab2"/>
      <stop offset="100%" stop-color="#06d6a0"/>
    </linearGradient>
    <g id="petals">
      <path d="M100 24 C120 56 122 100 100 136 C78 100 80 56 100 24" fill="url(#warm)"/>
      <path d="M24 100 C56 80 100 78 136 100 C100 122 56 120 24 100" fill="url(#cool)"/>
    </g>
  </defs>
  <use href="#petals" />
</svg>`;

const groupAnimateMotionSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(245 142)">
    <animateMotion path="M 0 0 L 30 0 L 30 20 L 0 20 Z" dur="3s" repeatCount="indefinite"/>
    <circle r="8" fill="#06ffa5"/>
  </g>
</svg>`;

const rotateOriginAndPathLengthSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="57" cy="142" rx="25" ry="18" fill="#ff9800" transform-origin="57 142">
    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite"/>
  </ellipse>
  <path d="M 240 135 h 30 v 30 h -30 v -30" fill="none" stroke="#e91e63" stroke-width="3" pathLength="100" stroke-dasharray="25"/>
</svg>`;

const coloredSymbolUseSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140">
  <defs>
    <symbol id="symStar" viewBox="-50 -50 100 100">
      <path d="M0,-45 L13,-14 L45,-14 L19,6 L29,38 L0,20 L-29,38 L-19,6 L-45,-14 L-13,-14 Z" fill="currentColor" opacity=".92"/>
      <path d="M0,-45 L13,-14 L45,-14 L19,6 L29,38 L0,20 L-29,38 L-19,6 L-45,-14 L-13,-14 Z" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    </symbol>
  </defs>
  <g color="#60a5fa">
    <use href="#symStar" x="20" y="20" width="80" height="80"/>
  </g>
  <g color="#f472b6">
    <use href="#symStar" x="120" y="20" width="80" height="80"/>
  </g>
</svg>`;

const preserveAspectRatioEmbeddedUseSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect x="200" y="20" width="170" height="120" rx="12" fill="#101826"/>
  <svg
    x="205"
    y="25"
    width="160"
    height="110"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
    style="color:#60a5fa"
  >
    <defs>
      <symbol id="parStar" viewBox="-50 -50 100 100">
        <path d="M0,-45 L13,-14 L45,-14 L19,6 L29,38 L0,20 L-29,38 L-19,6 L-45,-14 L-13,-14 Z" fill="currentColor"/>
      </symbol>
    </defs>
    <use href="#parStar" x="10" y="10" width="30" height="30"/>
    <use href="#parStar" x="58" y="34" width="24" height="24"/>
  </svg>
</svg>`;

const arcSymbolUseSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 120">
  <defs>
    <symbol id="moon" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
    </symbol>
  </defs>
  <use href="#moon" x="20" y="20" width="36" height="36" fill="#6c5ce7"/>
  <use href="#moon" x="80" y="20" width="36" height="36" fill="#a29bfe"/>
</svg>`;

const currentColorSymbolUseSemanticsSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <symbol id="star" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
    </symbol>
    <symbol id="heart" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
    </symbol>
    <symbol id="moon" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
    </symbol>
  </defs>
  <use href="#star" x="10" y="10" width="35" height="35" fill="#fdcb6e"/>
  <use href="#star" x="55" y="10" width="35" height="35" fill="#e17055"/>
  <use href="#star" x="100" y="10" width="35" height="35" fill="#74b9ff"/>
  <use href="#star" x="145" y="10" width="35" height="35" fill="#55efc4"/>
  <use href="#star" x="190" y="10" width="35" height="35" fill="#a29bfe"/>
  <use href="#heart" x="10" y="60" width="30" height="30" fill="#ff7675"/>
  <use href="#heart" x="50" y="57" width="36" height="36" fill="#ff7675"/>
  <use href="#heart" x="96" y="53" width="44" height="44" fill="#ff7675"/>
  <use href="#moon" x="155" y="60" width="30" height="30" fill="#6c5ce7"/>
  <use href="#moon" x="195" y="60" width="30" height="30" fill="#a29bfe"/>
</svg>`;

async function bootstrap(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await waitForLoad(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage?.clear();
  });
  await page.reload();
  await waitForLoad(page);
}

async function importSvgContent(
  page: import('@playwright/test').Page,
  name: string,
  svgContent: string
): Promise<void> {
  await page.locator('[aria-label="File"]').click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles({
    name,
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svgContent, 'utf-8'),
  });
}

async function getFirstPetalCenter(
  page: import('@playwright/test').Page
): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const multiplyMatrices = (
      left: [number, number, number, number, number, number],
      right: [number, number, number, number, number, number]
    ): [number, number, number, number, number, number] => ([
      left[0] * right[0] + left[2] * right[1],
      left[1] * right[0] + left[3] * right[1],
      left[0] * right[2] + left[2] * right[3],
      left[1] * right[2] + left[3] * right[3],
      left[0] * right[4] + left[2] * right[5] + left[4],
      left[1] * right[4] + left[3] * right[5] + left[5],
    ]);

    const toMatrix = (element: { type: string; data?: Record<string, unknown> }): [number, number, number, number, number, number] => {
      const data = element.data ?? {};
      const transformMatrix = data.transformMatrix;
      if (Array.isArray(transformMatrix) && transformMatrix.length === 6) {
        return transformMatrix as [number, number, number, number, number, number];
      }

      const transform = data.transform as {
        translateX?: number;
        translateY?: number;
        rotation?: number;
        scaleX?: number;
        scaleY?: number;
      } | undefined;

      if (!transform) {
        return [1, 0, 0, 1, 0, 0];
      }

      const translateX = transform.translateX ?? 0;
      const translateY = transform.translateY ?? 0;
      const rotation = ((transform.rotation ?? 0) * Math.PI) / 180;
      const scaleX = transform.scaleX ?? 1;
      const scaleY = transform.scaleY ?? 1;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      return [
        cos * scaleX,
        sin * scaleX,
        -sin * scaleY,
        cos * scaleY,
        translateX,
        translateY,
      ];
    };

    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const petal = Array.from(canvas.querySelectorAll('[data-element-id]'))
      .find((node): node is SVGGraphicsElement => {
        if (!(node instanceof SVGGraphicsElement)) {
          return false;
        }
        return node.getAttribute('fill') === '#ff6b81';
      });

    if (!petal) {
      throw new Error('No imported petals found');
    }

    const elementId = petal.getAttribute('data-element-id');
    if (!elementId) {
      throw new Error('Imported petal is missing data-element-id');
    }

    const storeApi = window.useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    const element = storeApi.getState().elements.find((candidate) => candidate.id === elementId);
    if (!element) {
      throw new Error(`Imported petal element ${elementId} not found in store`);
    }
    const elementMap = new Map(storeApi.getState().elements.map((candidate) => [candidate.id, candidate]));

    const box = petal.getBBox();
    const localCenter = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };
    const chain: Array<{ type: string; data?: Record<string, unknown>; parentId?: string | null }> = [];
    let current: { type: string; data?: Record<string, unknown>; parentId?: string | null } | undefined = element as typeof chain[number];
    while (current) {
      chain.unshift(current);
      current = current.parentId ? elementMap.get(current.parentId) as typeof chain[number] | undefined : undefined;
    }

    const matrix = chain.reduce<[number, number, number, number, number, number]>(
      (acc, currentElement) => multiplyMatrices(acc, toMatrix(currentElement)),
      [1, 0, 0, 1, 0, 0]
    );

    return {
      x: matrix[0] * localCenter.x + matrix[2] * localCenter.y + matrix[4],
      y: matrix[1] * localCenter.x + matrix[3] * localCenter.y + matrix[5],
    };
  });
}

async function getRenderedPathFillColors(
  page: import('@playwright/test').Page
): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    return Array.from(canvas.querySelectorAll('path[data-element-id]'))
      .map((node) => node.getAttribute('fill') ?? '')
      .filter(Boolean);
  });
}

async function getRenderedDefsPaintIds(
  page: import('@playwright/test').Page
): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    return Array.from(canvas.querySelectorAll('defs linearGradient[id], defs radialGradient[id]'))
      .map((node) => node.getAttribute('id') ?? '')
      .filter(Boolean);
  });
}

async function exportSvgContent(
  page: import('@playwright/test').Page
): Promise<string> {
  await page.locator('[aria-label="File"]').click();
  await page.waitForTimeout(200);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('button').filter({ hasText: /^SVG$/ }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) {
    throw new Error('Exported SVG download path was not available');
  }

  return readFile(downloadPath, 'utf-8');
}

async function getRenderedGroupAnimationSummary(
  page: import('@playwright/test').Page
): Promise<{ groupCount: number; animateMotionCount: number; greenCircleCount: number }> {
  return page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    return {
      groupCount: canvas.querySelectorAll('g[data-element-id]').length,
      animateMotionCount: canvas.querySelectorAll('g[data-element-id] animateMotion').length,
      greenCircleCount: canvas.querySelectorAll('circle[fill="#06ffa5"], ellipse[fill="#06ffa5"], path[fill="#06ffa5"]').length,
    };
  });
}

async function getRotateOriginAndPathLengthSummary(
  page: import('@playwright/test').Page
): Promise<{ rotateFrom: string | null; rotateTo: string | null; renderedPathLength: string | null; renderedDasharray: string | null }> {
  return page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const rotateAnim = canvas.querySelector('animateTransform[type="rotate"]');
    const dashedPath = Array.from(canvas.querySelectorAll('path[data-element-id]')).find((node) => node.getAttribute('stroke-dasharray') === '25');

    return {
      rotateFrom: rotateAnim?.getAttribute('from') ?? null,
      rotateTo: rotateAnim?.getAttribute('to') ?? null,
      renderedPathLength: dashedPath?.getAttribute('pathLength') ?? null,
      renderedDasharray: dashedPath?.getAttribute('stroke-dasharray') ?? null,
    };
  });
}

async function getRenderedSymbolUseColors(
  page: import('@playwright/test').Page
): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    return Array.from(canvas.querySelectorAll('use[data-element-id]'))
      .map((node) => node.getAttribute('color') ?? '')
      .filter(Boolean);
  });
}

async function getRenderedSymbolUseCount(
  page: import('@playwright/test').Page
): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    return canvas.querySelectorAll('use[data-element-id]').length;
  });
}

async function getSymbolInstanceSummary(
  page: import('@playwright/test').Page
): Promise<Array<{ symbolId: string; width: number; height: number; localBounds: { minX: number; minY: number; maxX: number; maxY: number } | null; computedFill: string }>> {
  return page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const storeApi = window.useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    const toBounds = (subPaths: Array<Array<{ type: string; position?: { x: number; y: number }; controlPoint1?: { x: number; y: number }; controlPoint2?: { x: number; y: number } }>>): { minX: number; minY: number; maxX: number; maxY: number } | null => {
      const points = subPaths.flatMap((subPath) => subPath.flatMap((cmd) => {
        if (cmd.type === 'M' || cmd.type === 'L') {
          return cmd.position ? [cmd.position] : [];
        }
        if (cmd.type === 'C') {
          return [cmd.controlPoint1, cmd.controlPoint2, cmd.position].filter(Boolean) as Array<{ x: number; y: number }>;
        }
        return [];
      }));

      if (points.length === 0) {
        return null;
      }

      return {
        minX: Math.min(...points.map((point) => point.x)),
        minY: Math.min(...points.map((point) => point.y)),
        maxX: Math.max(...points.map((point) => point.x)),
        maxY: Math.max(...points.map((point) => point.y)),
      };
    };

    return storeApi.getState().elements
      .filter((element) => element.type === 'symbolInstance')
      .map((element) => {
        const data = element.data as {
          symbolId: string;
          width: number;
          height: number;
          pathData?: { subPaths: Array<Array<{ type: string; position?: { x: number; y: number }; controlPoint1?: { x: number; y: number }; controlPoint2?: { x: number; y: number } }>> };
        };
        const renderedNode = canvas.querySelector(`[data-element-id="${element.id}"]`);

        return {
          symbolId: data.symbolId,
          width: data.width,
          height: data.height,
          localBounds: data.pathData ? toBounds(data.pathData.subPaths) : null,
          computedFill: renderedNode ? getComputedStyle(renderedNode).fill : '',
        };
      });
  });
}

async function getEmbeddedSvgCurrentColorSummary(
  page: import('@playwright/test').Page
): Promise<{ starCount: number; containerStyle: string | null; fills: string[] }> {
  return page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const embedded = Array.from(canvas.querySelectorAll('svg[preserveAspectRatio]'))
      .find((node) => node.getAttribute('preserveAspectRatio') === 'xMidYMid meet');
    if (!(embedded instanceof SVGSVGElement)) {
      throw new Error('Embedded SVG not found');
    }

    const starPaths = Array.from(embedded.querySelectorAll('path'));

    return {
      starCount: embedded.querySelectorAll('use').length,
      containerStyle: embedded.getAttribute('style'),
      fills: starPaths.map((node) => getComputedStyle(node).fill).filter(Boolean),
    };
  });
}

test.describe('Symbol import viewBox handling', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrap(page);
  });

  test('keeps overflow-visible symbols centered on their local origin', async ({ page }) => {
    await importSvgContent(page, 'symbol-overflow-visible.svg', centeredPetalSvg);

    await expect.poll(async () => (await getFirstPetalCenter(page)).x).toBeCloseTo(100, 1);
    await expect.poll(async () => (await getFirstPetalCenter(page)).y).toBeCloseTo(54, 1);
  });

  test('preserves symbol viewBox offsets instead of recentering them', async ({ page }) => {
    await importSvgContent(page, 'symbol-viewbox-offset.svg', offsetPetalSvg);

    await expect.poll(async () => (await getFirstPetalCenter(page)).x).toBeCloseTo(200, 1);
    await expect.poll(async () => (await getFirstPetalCenter(page)).y).toBeCloseTo(145.7142857, 1);
  });

  test('inherits presentation attributes from use references', async ({ page }) => {
    await importSvgContent(page, 'use-inherited-fill.svg', inheritedUseFillSvg);

    await expect
      .poll(async () => getRenderedPathFillColors(page))
      .toEqual(expect.arrayContaining(['#ff6b81', '#4facfe']));
  });

  test('preserves gradient defs used inside imported use content during export', async ({ page }) => {
    await importSvgContent(page, 'use-gradient-defs.svg', useGradientDefsSvg);

    await expect
      .poll(async () => getRenderedPathFillColors(page))
      .toEqual(expect.arrayContaining(['url(#warm)', 'url(#cool)']));

    await expect
      .poll(async () => getRenderedDefsPaintIds(page))
      .toEqual(expect.arrayContaining(['warm', 'cool']));

    const exportedSvg = await exportSvgContent(page);
    expect(exportedSvg).toContain('id="warm"');
    expect(exportedSvg).toContain('id="cool"');
    expect(exportedSvg).toContain('fill="url(#warm)"');
    expect(exportedSvg).toContain('fill="url(#cool)"');
  });

  test('renders animateMotion imported on group elements', async ({ page }) => {
    await importSvgContent(page, 'group-animate-motion.svg', groupAnimateMotionSvg);

    await expect
      .poll(async () => getRenderedGroupAnimationSummary(page))
      .toMatchObject({
        groupCount: expect.any(Number),
        animateMotionCount: 1,
        greenCircleCount: 1,
      });
  });

  test('preserves rotate origin and pathLength when importing animated paths', async ({ page }) => {
    await importSvgContent(page, 'rotate-origin-pathlength.svg', rotateOriginAndPathLengthSvg);

    await expect
      .poll(async () => getRotateOriginAndPathLengthSummary(page))
      .toMatchObject({
        rotateFrom: '0 57 142',
        rotateTo: '360 57 142',
        renderedPathLength: '100',
        renderedDasharray: '25',
      });
  });

  test('preserves inherited color for symbol uses that rely on currentColor', async ({ page }) => {
    await importSvgContent(page, 'colored-symbol-use.svg', coloredSymbolUseSvg);

    await expect
      .poll(async () => getRenderedSymbolUseColors(page))
      .toEqual(expect.arrayContaining(['#60a5fa', '#f472b6']));
  });

  test('preserves root attributes on embedded SVG preserveAspectRatio content', async ({ page }) => {
    await importSvgContent(page, 'embedded-preserve-aspect-ratio-use.svg', preserveAspectRatioEmbeddedUseSvg);

    await expect
      .poll(async () => getEmbeddedSvgCurrentColorSummary(page))
      .toMatchObject({
        starCount: 2,
        containerStyle: 'color: rgb(96, 165, 250);',
        fills: expect.arrayContaining(['rgb(96, 165, 250)']),
      });
  });

  test('imports symbol uses with unsupported arc path commands without crashing', async ({ page }) => {
    await importSvgContent(page, 'arc-symbol-use.svg', arcSymbolUseSvg);

    await expect
      .poll(async () => getRenderedSymbolUseCount(page))
      .toBe(2);
  });

  test('preserves currentColor semantics and relative symbol geometry for use instances', async ({ page }) => {
    await importSvgContent(page, 'currentcolor-symbol-use-semantics.svg', currentColorSymbolUseSemanticsSvg);

    await expect
      .poll(async () => (await getSymbolInstanceSummary(page)).length)
      .toBe(10);

    const summary = await getSymbolInstanceSummary(page);
    const stars = summary.filter((item) => item.symbolId === 'star');
    const hearts = summary.filter((item) => item.symbolId === 'heart');
    const moons = summary.filter((item) => item.symbolId === 'moon');

    expect(stars).toHaveLength(5);
    expect(hearts).toHaveLength(3);
    expect(moons).toHaveLength(2);
    expect(summary.every((item) => item.computedFill === 'rgb(0, 0, 0)')).toBe(true);

    [...stars, ...hearts].forEach((item) => {
      expect(item.localBounds).not.toBeNull();
      expect(item.localBounds!.minX).toBeGreaterThanOrEqual(-0.01);
      expect(item.localBounds!.minY).toBeGreaterThanOrEqual(-0.01);
      expect(item.localBounds!.maxX).toBeLessThanOrEqual(item.width + 0.01);
      expect(item.localBounds!.maxY).toBeLessThanOrEqual(item.height + 0.01);
    });
  });
});

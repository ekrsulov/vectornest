import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';

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
});

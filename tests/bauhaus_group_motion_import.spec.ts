import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';

const bauhausGroupMotionSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <defs>
    <rect id="S" width="150" height="150" />
    <circle id="C" cx="75" cy="75" r="75">
      <animate attributeName="r" values="75; 35; 75" dur="4s" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" repeatCount="indefinite" />
    </circle>
    <polygon id="T" points="75,0 150,150 0,150">
      <animateTransform attributeName="transform" type="rotate" values="0 75 100; 360 75 100" dur="6s" repeatCount="indefinite" />
    </polygon>
    <g id="B">
      <use href="#S" fill="#E00000" />
      <use href="#C" fill="#FFD100" />
      <use href="#T" fill="#003B96" opacity="0.9" />
    </g>
  </defs>

  <rect width="600" height="600" fill="#F4F4F0" />

  <use href="#B" x="0" y="0">
    <animateTransform attributeName="transform" type="translate" values="0,0; 450,0; 0,0" dur="8s" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.5 0 0.5 1; 0.5 0 0.5 1" repeatCount="indefinite" />
  </use>

  <use href="#B" x="225" y="225">
    <animateTransform attributeName="transform" type="rotate" values="0 300 300; 360 300 300" dur="10s" repeatCount="indefinite" />
  </use>

  <use href="#B" x="450" y="450">
    <animateTransform attributeName="transform" type="translate" values="0,0; -450,-450; 0,0" dur="6s" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.5 0 0.5 1; 0.5 0 0.5 1" repeatCount="indefinite" />
  </use>

  <use href="#S" x="450" y="0" fill="#000000">
    <animate attributeName="fill" values="#000000;#E00000;#FFD100;#003B96;#000000" dur="12s" repeatCount="indefinite"/>
  </use>

  <use href="#C" x="0" y="450" fill="#E00000">
    <animateTransform attributeName="transform" type="translate" values="0,0; 0,-300; 0,0" dur="5s" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.5 0 0.5 1; 0.5 0 0.5 1" repeatCount="indefinite" />
  </use>

  <path d="M150 0 v600 M450 0 v600 M0 150 h600 M0 450 h600" stroke="#000000" stroke-width="15" fill="none" />
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

test('imports colored bauhaus groups with correct placement and motion', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'bauhaus-group-motion.svg', bauhausGroupMotionSvg);
  await page.waitForTimeout(200);

  const initialState = await page.evaluate(() => {
    const storeApi = (window as Window & {
      useCanvasStore?: { getState: () => { elements?: Array<{ id: string; type: string; parentId?: string | null; data: Record<string, unknown> }> } };
    }).useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    const state = storeApi.getState();
    const elements = state.elements ?? [];
    const blockUses = elements
      .filter((element) => element.type === 'use' && (element.parentId ?? null) === null)
      .filter((element) => element.data?.href && typeof element.data.href === 'string')
      .map((element) => ({
        id: element.id,
        href: element.data.href,
        rawContent: typeof element.data.rawContent === 'string' ? element.data.rawContent : null,
      }))
      .filter((element) => element.rawContent?.includes('id="B"') || element.rawContent?.includes('fill="#003B96"'));

    const wrappers = blockUses.map((blockUse) => {
      const wrapper = document.querySelector(`[data-element-id="${blockUse.id}"]`) as SVGGElement | null;
      const fills = wrapper
        ? Array.from(wrapper.querySelectorAll('rect, circle, polygon, path, g')).map((node) => node.getAttribute('fill') ?? getComputedStyle(node).fill)
        : [];
      return {
        id: blockUse.id,
        rect: wrapper?.getBoundingClientRect().toJSON() ?? null,
        fills,
      };
    });

    return {
      blockUses,
      wrappers,
    };
  });

  await page.waitForTimeout(1300);

  const laterState = await page.evaluate(() => {
    const storeApi = (window as Window & {
      useCanvasStore?: { getState: () => { elements?: Array<{ id: string; type: string; parentId?: string | null; data: Record<string, unknown> }> } };
    }).useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    const state = storeApi.getState();
    const elements = state.elements ?? [];
    const blockUses = elements
      .filter((element) => element.type === 'use' && (element.parentId ?? null) === null)
      .map((element) => ({
        id: element.id,
        rawContent: typeof element.data.rawContent === 'string' ? element.data.rawContent : null,
      }))
      .filter((element) => element.rawContent?.includes('fill="#003B96"'));

    return blockUses.map((blockUse) => {
      const wrapper = document.querySelector(`[data-element-id="${blockUse.id}"]`) as SVGGElement | null;
      return {
        id: blockUse.id,
        rect: wrapper?.getBoundingClientRect().toJSON() ?? null,
      };
    });
  });

  expect(initialState.blockUses).toHaveLength(3);
  for (const blockUse of initialState.blockUses) {
    expect(blockUse.rawContent).not.toContain('<rect id="S" width="150" height="150" fill="#000000"');
    expect(blockUse.rawContent).not.toContain('<circle id="C" cx="75" cy="75" r="75" fill="#000000"');
    expect(blockUse.rawContent).not.toContain('<polygon id="T" points="75,0 150,150 0,150" fill="#000000"');
  }
  for (const wrapper of initialState.wrappers) {
    expect(wrapper.fills).toContain('#E00000');
    expect(wrapper.fills).toContain('#FFD100');
    expect(wrapper.fills).toContain('#003B96');
    expect(wrapper.rect?.width ?? 0).toBeGreaterThanOrEqual(140);
    expect(wrapper.rect?.height ?? 0).toBeGreaterThanOrEqual(140);
  }

  const initialById = new Map(initialState.wrappers.map((wrapper) => [wrapper.id, wrapper]));
  const initialXs = initialState.wrappers.map((wrapper) => wrapper.rect?.x ?? -1).sort((a, b) => a - b);
  const initialYs = initialState.wrappers.map((wrapper) => wrapper.rect?.y ?? -1).sort((a, b) => a - b);
  expect(initialXs[0] ?? -10).toBeGreaterThanOrEqual(-20);
  expect(initialXs[1] ?? -1).toBeGreaterThanOrEqual(200);
  expect(initialXs[2] ?? -1).toBeGreaterThanOrEqual(420);
  expect(initialYs[0] ?? -10).toBeGreaterThanOrEqual(-25);
  expect(initialYs[1] ?? -1).toBeGreaterThanOrEqual(170);

  const movedCount = laterState.filter((wrapper) => {
    const initial = initialById.get(wrapper.id);
    if (!initial?.rect || !wrapper.rect) {
      return false;
    }
    return Math.abs((wrapper.rect.x ?? 0) - (initial.rect.x ?? 0)) > 5 || Math.abs((wrapper.rect.y ?? 0) - (initial.rect.y ?? 0)) > 5;
  }).length;

  expect(movedCount).toBeGreaterThanOrEqual(2);
});
import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';

const groupedUseSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 360 260" width="360" height="260">
  <defs>
    <rect id="S" width="50" height="50" />
    <circle id="C" cx="25" cy="25" r="25">
      <animate attributeName="r" values="20;25;20" dur="3s" repeatCount="indefinite" />
    </circle>
    <polygon id="T" points="25,0 50,50 0,50">
      <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="4s" repeatCount="indefinite" />
    </polygon>
    <g id="B">
      <use href="#S" fill="#E00000" />
      <use href="#C" x="60" fill="#FFD100" />
      <use href="#T" x="120" fill="#003B96" />
    </g>
  </defs>

  <use id="b1" href="#B" x="20" y="40">
    <animateTransform attributeName="transform" type="translate" values="0 0;80 0;0 0" dur="8s" repeatCount="indefinite" />
  </use>
  <use id="b2" href="#B" x="20" y="130">
    <animateTransform attributeName="transform" type="translate" values="0 0;0 50;0 0" dur="8s" repeatCount="indefinite" />
  </use>
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

test('imports grouped use figures with preserved colors and motion', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'grouped-use.svg', groupedUseSvg);
  await page.waitForTimeout(150);

  const initialState = await page.evaluate(async () => {
    const storeApi = window.useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    const state = storeApi.getState();
    const elements = state.elements ?? [];
    const groupedUses = elements
      .filter((element: { type: string; data: Record<string, unknown> }) => element.type === 'use')
      .map((element: { id: string; data: Record<string, unknown> }) => ({
        id: element.id,
        href: element.data.href,
        sourceId: element.data.sourceId,
        rawContent: element.data.rawContent,
      }))
      .filter((element: { sourceId?: string }) => element.sourceId === 'b1' || element.sourceId === 'b2');

    const firstUse = groupedUses.find((element: { sourceId?: string }) => element.sourceId === 'b1');
    const secondUse = groupedUses.find((element: { sourceId?: string }) => element.sourceId === 'b2');
    if (!firstUse || !secondUse) {
      throw new Error('Grouped use elements were not imported');
    }

    const firstNode = document.querySelector(`[data-element-id="${firstUse.id}"]`) as SVGGElement | null;
    const secondNode = document.querySelector(`[data-element-id="${secondUse.id}"]`) as SVGGElement | null;
    if (!firstNode || !secondNode) {
      throw new Error('Grouped use nodes were not rendered');
    }

    const firstRect = firstNode.getBoundingClientRect();
    const secondRect = secondNode.getBoundingClientRect();
    const renderedChildFills = Array.from(firstNode.querySelectorAll('rect, circle, polygon, path, g')).map((node) => ({
      tag: node.tagName.toLowerCase(),
      fill: node.getAttribute('fill') ?? getComputedStyle(node).fill,
    }));

    return {
      groupedUses,
      firstRect: firstRect.toJSON(),
      secondRect: secondRect.toJSON(),
      firstUseRect: firstRect.toJSON(),
      secondUseRect: secondRect.toJSON(),
      renderedChildFills,
    };
  });

  await page.waitForTimeout(1400);

  const laterState = await page.evaluate(() => {
    const storeApi = window.useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    const state = storeApi.getState();
    const elements = state.elements ?? [];
    const groupedUses = elements
      .filter((element: { type: string; data: Record<string, unknown> }) => element.type === 'use')
      .map((element: { id: string; data: Record<string, unknown> }) => ({
        id: element.id,
        sourceId: element.data.sourceId,
      }))
      .filter((element: { sourceId?: string }) => element.sourceId === 'b1' || element.sourceId === 'b2');

    const firstUse = groupedUses.find((element: { sourceId?: string }) => element.sourceId === 'b1');
    const secondUse = groupedUses.find((element: { sourceId?: string }) => element.sourceId === 'b2');
    if (!firstUse || !secondUse) {
      throw new Error('Grouped use elements were not imported');
    }

    const firstNode = document.querySelector(`[data-element-id="${firstUse.id}"]`) as SVGGElement | null;
    const secondNode = document.querySelector(`[data-element-id="${secondUse.id}"]`) as SVGGElement | null;
    if (!firstNode || !secondNode) {
      throw new Error('Grouped use nodes were not rendered');
    }

    return {
      firstRect: firstNode.getBoundingClientRect().toJSON(),
      secondRect: secondNode.getBoundingClientRect().toJSON(),
      firstUseRect: firstNode.getBoundingClientRect().toJSON(),
      secondUseRect: secondNode.getBoundingClientRect().toJSON(),
    };
  });

  expect(initialState.groupedUses).toHaveLength(2);
  for (const groupedUse of initialState.groupedUses) {
    expect(typeof groupedUse.href).toBe('string');
  }

  expect(initialState.renderedChildFills).toContainEqual(
    expect.objectContaining({ fill: '#E00000' })
  );
  expect(initialState.renderedChildFills).toContainEqual(
    expect.objectContaining({ fill: '#FFD100' })
  );
  expect(initialState.renderedChildFills).toContainEqual(
    expect.objectContaining({ fill: '#003B96' })
  );

  expect((laterState.firstUseRect?.x ?? 0) - (initialState.firstUseRect?.x ?? 0)).toBeGreaterThan(8);
  expect((laterState.secondUseRect?.y ?? 0) - (initialState.secondUseRect?.y ?? 0)).toBeGreaterThan(5);
});
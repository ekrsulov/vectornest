import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';

const macroGroupUseSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <rect id="b" width="100" height="100" />
    <circle id="c" cx="50" cy="50" r="45" />
    <polygon id="t" points="10,90 50,10 90,90" />
    <polygon id="t2" points="10,10 90,50 10,90" />

    <g id="mod-a">
      <use href="#b" fill="#E2212E" />
      <use href="#c" fill="#F9D014" />
    </g>
    <g id="mod-b">
      <use href="#b" fill="#00458B" />
      <use href="#t" fill="#F5F5F5" />
    </g>
    <g id="mod-c">
      <use href="#b" fill="#F9D014" />
      <use href="#c" fill="#1A1A1A" transform="translate(50, 50) scale(0.6) translate(-50, -50)" />
    </g>
    <g id="mod-d">
      <use href="#b" fill="#F5F5F5" />
      <use href="#t2" fill="#E2212E" />
    </g>

    <g id="macro">
      <use href="#mod-a" x="0" y="0" />
      <use href="#mod-b" x="100" y="0" />
      <use href="#mod-c" x="0" y="100" />
      <use href="#mod-d" x="100" y="100" />
      <use href="#c" fill="#F5F5F5" transform="translate(100, 100) scale(0.6) translate(-50, -50)" />
      <use href="#b" fill="#1A1A1A" transform="translate(100, 100) scale(0.2) translate(-50, -50)" />
    </g>
  </defs>

  <rect width="600" height="600" fill="#F5F5F5" />

  <use href="#macro" transform="translate(0, 0)" />
  <use href="#macro" transform="translate(400, 0) scale(-1, 1)" />
  <use href="#macro" transform="translate(400, 0)" />
  <use href="#macro" transform="translate(0, 400) scale(1, -1)" />
  <use href="#macro" transform="translate(400, 400) scale(1, -1)" />
  <use href="#macro" transform="translate(0, 400)" />
  <use href="#macro" transform="translate(400, 400) scale(-1, 1)" />
  <use href="#macro" transform="translate(400, 400)" />

  <g transform="translate(200, 200)">
    <use href="#b" fill="#F5F5F5" transform="scale(2)" />
    <use href="#c" fill="#E2212E" transform="translate(100, 100) scale(1.6) translate(-50, -50)" />
    <use href="#t" fill="#F9D014" transform="translate(100, 100) scale(1.4) translate(-50, -50)" />
    <use href="#c" fill="#00458B" transform="translate(100, 100) scale(0.5) translate(-50, -50)" />
  </g>

  <path d="M 100,0 L 100,600 M 500,0 L 500,600 M 0,100 L 600,100 M 0,500 L 600,500 M 200,0 L 200,600 M 400,0 L 400,600 M 0,200 L 600,200 M 0,400 L 600,400 M 300,0 L 300,200 M 300,400 L 300,600 M 0,300 L 200,300 M 400,300 L 600,300"
    stroke="#1A1A1A" stroke-width="12" fill="none" stroke-linecap="square" />

  <rect x="6" y="6" width="588" height="588" stroke="#1A1A1A" stroke-width="12" fill="none" />
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

test('imports nested macro group uses with visible colored perimeter modules', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'macro-group-use.svg', macroGroupUseSvg);
  await page.waitForTimeout(250);

  const summary = await page.evaluate(() => {
    const storeApi = (window as Window & {
      useCanvasStore?: { getState: () => { elements?: Array<{ id: string; type: string; parentId?: string | null; data: Record<string, unknown> }> } };
    }).useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    const state = storeApi.getState();
    const elements = state.elements ?? [];
    const rootUses = elements
      .filter((element: { type: string; parentId?: string | null }) => element.type === 'use' && (element.parentId ?? null) === null)
      .map((element: { id: string; data: Record<string, unknown> }) => ({
        id: element.id,
        href: element.data.href,
        rawContent: typeof element.data.rawContent === 'string' ? element.data.rawContent : null,
      }));

    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const fillCounts = Array.from(canvas.querySelectorAll('path, rect, circle, polygon, use')).reduce<Record<string, number>>((acc, node) => {
      const fill = node.getAttribute('fill') ?? getComputedStyle(node).fill;
      acc[fill] = (acc[fill] ?? 0) + 1;
      return acc;
    }, {});

    const rootUseRects = rootUses.map((rootUse: { id: string; href: unknown; rawContent: string | null }) => {
      const wrapper = document.querySelector(`[data-element-id="${rootUse.id}"]`) as SVGGElement | null;
      const innerUse = wrapper?.querySelector('use') as SVGUseElement | null;
      return {
        id: rootUse.id,
        href: rootUse.href,
        hasInnerUse: Boolean(innerUse),
        wrapperRect: wrapper?.getBoundingClientRect().toJSON() ?? null,
        innerUseRect: innerUse?.getBoundingClientRect().toJSON() ?? null,
      };
    });

    return {
      rootUses,
      fillCounts,
      rootUseRects,
      renderedUseCount: canvas.querySelectorAll('use[data-element-id]').length,
      renderedPathCount: canvas.querySelectorAll('path[data-element-id]').length,
    };
  });

  expect(summary.rootUses.length).toBeGreaterThanOrEqual(8);
  expect(summary.fillCounts['rgb(226, 33, 46)'] ?? 0).toBeGreaterThan(8);
  expect(summary.fillCounts['rgb(249, 208, 20)'] ?? 0).toBeGreaterThan(8);
  expect(summary.fillCounts['rgb(0, 69, 139)'] ?? 0).toBeGreaterThan(4);
  expect(summary.rootUseRects.filter((entry: { wrapperRect?: { width?: number } | null }) => (entry.wrapperRect?.width ?? 0) >= 200).length).toBeGreaterThanOrEqual(8);
});
import { expect, test } from '@playwright/test';

const useOpacitySvg = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <rect id="r" x="43" y="10" width="14" height="80" rx="7">
      <animate attributeName="height" values="80;20;80" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="y" values="10;40;10" dur="2s" repeatCount="indefinite"/>
    </rect>
    <g id="g">
      <use href="#r" fill="#FF595E" />
      <use href="#r" fill="#FFCA3A" transform="rotate(45 50 50)" />
      <use href="#r" fill="#8AC926" transform="rotate(90 50 50)" />
      <use href="#r" fill="#1982C4" transform="rotate(135 50 50)" />
      <animateTransform attributeName="transform" type="rotate" values="0 50 50; 360 50 50" dur="8s" repeatCount="indefinite"/>
    </g>
  </defs>
  <rect width="100" height="100" fill="#F4F1DE" />
  <use href="#g" transform="scale(1.8) translate(-22 -22)" opacity="0.3" />
  <use href="#g" />
  <use href="#g" transform="scale(0.4) translate(75 75)" />
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

async function importSvg(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: 'File' }).click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles({
    name: 'use-opacity-import.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(useOpacitySvg, 'utf8'),
  });
  await page.waitForTimeout(800);
}

async function exportSvg(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async () => {
    const { ExportManager } = await import('/src/utils/export/ExportManager.ts');
    return ExportManager.generateSvgContent(false, 0).content;
  });
}

test('preserves imported use opacity in store, canvas, and export', async ({ page }) => {
  await bootstrap(page);
  await importSvg(page);

  const imported = await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    const useElements = (state?.elements ?? [])
      .filter((element) => element.type === 'use' && element.data?.originalHref === 'g')
      .map((element) => ({
        id: element.id,
        opacity: element.data?.styleOverrides?.opacity,
        transformMatrix: element.data?.transformMatrix,
      }))
      .sort((left, right) => ((left.transformMatrix?.[0] ?? 1) - (right.transformMatrix?.[0] ?? 1)));

    const faded = useElements.find((element) => element.opacity === 0.3);
    if (!faded) {
      return { useElements, renderedOpacity: null };
    }

    const node = document.querySelector<SVGGraphicsElement>(`[data-element-id="${faded.id}"]`);
    const renderedOpacity = node?.getAttribute('opacity') ?? null;
    return { useElements, renderedOpacity };
  });

  expect(imported.useElements).toHaveLength(3);
  expect(imported.useElements.some((element) => element.opacity === 0.3)).toBeTruthy();
  expect(imported.renderedOpacity).toBe('0.3');

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toMatch(/<use[^>]*href="#g"[^>]*opacity="0\.3"/);
});
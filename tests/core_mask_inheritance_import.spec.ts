import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/core_mask_inheritance.svg');
  await fileInput.setInputFiles({
    name: 'core-mask-inheritance.svg',
    mimeType: 'image/svg+xml',
    buffer,
  });
  await page.waitForTimeout(1200);
}

async function exportSvg(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async () => {
    const { ExportManager } = await import('/src/utils/export/ExportManager.ts');
    return ExportManager.generateSvgContent(false, 0).content;
  });
}

test('does not inherit masks into translated child groups when importing symbol instances', async ({ page }) => {
  await bootstrap(page);
  await importFixture(page);

  const runtime = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    canvas.pauseAnimations?.();
    canvas.setCurrentTime?.(0);

    const canvasRect = canvas.getBoundingClientRect();
    const centerX = canvasRect.left + canvasRect.width / 2;
    const centerY = canvasRect.top + canvasRect.height / 2;

    const maskedGroups = Array.from(canvas.querySelectorAll<SVGGElement>('g[mask="url(#fade)"]'));
    const symbolUses = Array.from(canvas.querySelectorAll<SVGUseElement>('use[href="#symbol-core"]'));
    const innerTranslatedGroup = Array.from(canvas.querySelectorAll<SVGGElement>('g')).find((node) =>
      node.getAttribute('transform') === 'matrix(1 0 0 1 500 500)'
    );
    const largestUse = symbolUses
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          rect,
          area: rect.width * rect.height,
        };
      })
      .sort((left, right) => right.area - left.area)[0];

    return {
      maskedGroupCount: maskedGroups.length,
      innerGroupMask: innerTranslatedGroup?.getAttribute('mask') ?? null,
      symbolUseCount: symbolUses.length,
      largestUseContainsCenter: largestUse
        ? (
          largestUse.rect.left <= centerX &&
          largestUse.rect.right >= centerX &&
          largestUse.rect.top <= centerY &&
          largestUse.rect.bottom >= centerY
        )
        : false,
      largestUseWidth: largestUse?.rect.width ?? 0,
      largestUseHeight: largestUse?.rect.height ?? 0,
    };
  });

  expect(runtime.maskedGroupCount).toBe(1);
  expect(runtime.innerGroupMask).toBeNull();
  expect(runtime.symbolUseCount).toBe(3);
  expect(runtime.largestUseContainsCenter).toBeTruthy();
  expect(runtime.largestUseWidth).toBeGreaterThan(500);
  expect(runtime.largestUseHeight).toBeGreaterThan(500);

  const exportedSvg = await exportSvg(page);
  const maskMatches = exportedSvg.match(/mask="url\(#fade\)"/g) ?? [];
  expect(maskMatches).toHaveLength(1);
  expect(exportedSvg).toContain('href="#symbol-core"');
});

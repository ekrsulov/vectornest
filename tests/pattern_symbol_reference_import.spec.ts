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
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/pattern_symbol_reference.svg');
  await fileInput.setInputFiles({
    name: 'pattern-symbol-reference.svg',
    mimeType: 'image/svg+xml',
    buffer,
  });
  await page.waitForTimeout(800);
}

async function exportSvg(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async () => {
    const { ExportManager } = await import('/src/utils/export/ExportManager.ts');
    return ExportManager.generateSvgContent(false, 0).content;
  });
}

test('imports pattern content that references symbols with rewritten runtime/export ids', async ({ page }) => {
  await bootstrap(page);
  await importFixture(page);

  const runtimeSummary = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const patternUse = canvas.querySelector<SVGUseElement>('defs pattern#sigilPattern use');
    const symbolDef = canvas.querySelector('defs #symbol-sigil');

    const testWindow = window as typeof window & {
      useCanvasStore?: {
        getState: () => {
          elements?: Array<{ type: string }>;
        };
      };
    };

    return {
      patternUseHref: patternUse?.getAttribute('href') ?? null,
      hasPatternUse: Boolean(patternUse),
      hasSymbolDef: Boolean(symbolDef),
      symbolInstanceCount: (testWindow.useCanvasStore?.getState?.().elements ?? []).filter(
        (element) => element.type === 'symbolInstance'
      ).length,
      patternMarkup: canvas.querySelector('defs pattern#sigilPattern')?.outerHTML ?? '',
    };
  });

  expect(runtimeSummary.hasPatternUse).toBeTruthy();
  expect(runtimeSummary.hasSymbolDef).toBeTruthy();
  expect(runtimeSummary.symbolInstanceCount).toBe(0);
  expect(runtimeSummary.patternUseHref).toBe('#symbol-sigil');
  expect(runtimeSummary.patternMarkup).toContain('href="#symbol-sigil"');

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('<symbol id="symbol-sigil"');
  expect(exportedSvg).toContain('<pattern id="sigilPattern"');
  expect(exportedSvg).toContain('href="#symbol-sigil"');
});

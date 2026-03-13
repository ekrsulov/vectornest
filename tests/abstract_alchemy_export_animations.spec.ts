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
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/abstract_alchemy_export_animations.svg');
  await fileInput.setInputFiles({
    name: 'abstract-alchemy-export-animations.svg',
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

test('preserves imported textPath and clipPath child animations on export', async ({ page }) => {
  await bootstrap(page);
  await importFixture(page);

  const runtime = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    const textNode = canvas
      ? Array.from(canvas.querySelectorAll<SVGTextElement>('text')).find((node) =>
        (node.textContent ?? '').includes('AWARD-WINNING ABSTRACT SVG ALCHEMY')
      )
      : null;

    return {
      textFilter: textNode?.getAttribute('filter') ?? null,
    };
  });

  expect(runtime.textFilter).toBe('url(#cinematicGlow)');

  const exportedSvg = await exportSvg(page);

  expect(exportedSvg).toContain('<path id="textCircle"');
  expect(exportedSvg).toContain('<textPath href="#textCircle"');
  expect(exportedSvg).toContain('AWARD-WINNING ABSTRACT SVG ALCHEMY');
  expect(exportedSvg).toContain('attributeName="startOffset"');
  expect(exportedSvg).toMatch(/<animate[^>]*attributeName="points"[^>]*href="#[^"]+"/);
  expect(exportedSvg).toContain('<mpath href="#figureEight"');
  expect(exportedSvg).not.toContain('xmlns=""');

  const defsStart = exportedSvg.indexOf('<defs>');
  const defsEnd = exportedSvg.indexOf('</defs>');
  const textStart = exportedSvg.indexOf('AWARD-WINNING ABSTRACT SVG ALCHEMY');

  expect(defsStart).toBeGreaterThanOrEqual(0);
  expect(defsEnd).toBeGreaterThan(defsStart);
  expect(textStart).toBeGreaterThan(defsEnd);
});

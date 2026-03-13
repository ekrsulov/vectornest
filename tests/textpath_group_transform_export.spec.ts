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

async function importFixture(page: import('@playwright/test').Page, name: string, buffer: Buffer): Promise<void> {
  await page.getByRole('button', { name: 'File' }).click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles({
    name,
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

test('exports textPath inside transformed groups without duplicating the ancestor transform onto the text node', async ({ page }) => {
  await bootstrap(page);
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/textpath_group_transform_export.svg');
  await importFixture(page, 'textpath-group-transform-export.svg', buffer);

  const exportedSvg = await exportSvg(page);
  const groupMatch = exportedSvg.match(/<g[^>]*transform="matrix\(1 0 0 1 0 1230\)"[\s\S]*?<\/g>/);
  const textMatch = exportedSvg.match(/<text[^>]*><textPath href="#a"/);

  expect(exportedSvg).toContain('<textPath href="#a"');
  expect(exportedSvg).toContain('TextPath');
  expect(exportedSvg).toContain('attributeName="startOffset"');
  expect(groupMatch).not.toBeNull();
  expect(textMatch).not.toBeNull();
  expect(textMatch?.[0]).not.toContain('transform="matrix(1 0 0 1 0 1230)"');

  await bootstrap(page);
  await importFixture(page, 'textpath-group-transform-roundtrip.svg', Buffer.from(exportedSvg, 'utf8'));

  const roundTrip = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found after round-trip import');
    }

    const texts = Array.from(canvas.querySelectorAll<SVGTextElement>('text')).filter((node) =>
      (node.textContent ?? '').includes('TextPath')
    );

    return {
      textCount: texts.length,
      textPathCount: canvas.querySelectorAll('textPath').length,
    };
  });

  expect(roundTrip.textCount).toBe(1);
  expect(roundTrip.textPathCount).toBe(1);
});
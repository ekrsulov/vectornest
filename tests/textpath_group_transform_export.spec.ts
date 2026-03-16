import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const anchoredTextPathSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <defs>
    <path id="ring" d="M 400,60 A 340,340 0 1,1 399.9,60" fill="none" />
  </defs>
  <g>
    <animateTransform attributeName="transform" type="rotate" values="360 400 400; 0 400 400" dur="40s" repeatCount="indefinite" />
    <text font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#00ffff" letter-spacing="10">
      <textPath href="#ring" startOffset="50%" text-anchor="middle">★ SPECTACULAR SVG ★ PURE MAGIC ★ ADVANCED GRAPHICS ★ MINIMAL CODE ★</textPath>
    </text>
  </g>
</svg>`;

const textLevelAnimatedTextPathSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <defs>
    <path id="orbit" d="M 400,110 A 290,290 0 1,1 399.9,110" fill="none" />
  </defs>
  <text font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" fill="#ff7a00" letter-spacing="8">
    <animateTransform attributeName="transform" type="rotate" values="0 400 400; 360 400 400" dur="18s" repeatCount="indefinite" />
    <textPath href="#orbit" startOffset="0%">ROTATING TEXTPATH IMPORT SHOULD STAY ANIMATED</textPath>
  </text>
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

test('preserves textPath text-anchor overrides declared on the textPath node', async ({ page }) => {
  await bootstrap(page);
  await importFixture(page, 'anchored-textpath.svg', Buffer.from(anchoredTextPathSvg, 'utf8'));

  const importedState = await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    const carrier = (state?.elements ?? []).find((element) => element.type === 'path' && element.data?.textPath?.text);
    const textNode = document.querySelector<SVGTextElement>('svg[data-canvas="true"] text[data-element-id]');
    return {
      importedTextAnchor: carrier?.data?.textPath?.textAnchor ?? null,
      renderedTextAnchor: textNode?.getAttribute('text-anchor') ?? null,
    };
  });

  expect(importedState.importedTextAnchor).toBe('middle');
  expect(importedState.renderedTextAnchor).toBe('middle');

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('text-anchor="middle"');
});

test('preserves animateTransform declared on the text wrapper of a textPath', async ({ page }) => {
  await bootstrap(page);
  await importFixture(page, 'text-level-animated-textpath.svg', Buffer.from(textLevelAnimatedTextPathSvg, 'utf8'));

  const importedState = await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    const carrier = (state?.elements ?? []).find((element) =>
      element.type === 'path' && element.data?.textPath?.text?.includes('ROTATING TEXTPATH IMPORT')
    );
    const animations = state?.animations ?? [];
    const carrierAnimations = animations.filter((animation) => animation.targetElementId === carrier?.id);

    return {
      carrierId: carrier?.id ?? null,
      animateTransformCount: carrierAnimations.filter((animation) => animation.type === 'animateTransform').length,
      canvasAnimateTransformCount: document.querySelectorAll('svg[data-canvas="true"] animateTransform').length,
    };
  });

  expect(importedState.carrierId).not.toBeNull();
  expect(importedState.animateTransformCount).toBeGreaterThan(0);
  expect(importedState.canvasAnimateTransformCount).toBeGreaterThan(0);

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('ROTATING TEXTPATH IMPORT SHOULD STAY ANIMATED');
  expect(exportedSvg).toContain('<textPath href="#orbit"');
  expect(exportedSvg).toContain('<animateTransform attributeName="transform" type="rotate"');
});
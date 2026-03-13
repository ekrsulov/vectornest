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
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/nexus_symbol_root_text_style.svg');
  await fileInput.setInputFiles({
    name: 'nexus-symbol-root-text-style.svg',
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

test('imports root font inheritance, symbol defs without viewBox, and text glow/filter references', async ({ page }) => {
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
    const canvasCenterX = canvasRect.left + canvasRect.width / 2;
    const canvasCenterY = canvasRect.top + canvasRect.height / 2;

    const testWindow = window as typeof window & {
      useCanvasStore?: {
        getState: () => {
          elements?: Array<{
            id: string;
            type: string;
            data?: {
              symbolId?: string;
              opacity?: number;
            };
          }>;
        };
      };
    };

    const nexusInstances = (testWindow.useCanvasStore?.getState?.().elements ?? [])
      .filter((element) => element.type === 'symbolInstance' && element.data?.symbolId === 'nexus')
      .map((element) => {
        const node = document.querySelector<SVGGraphicsElement>(`[data-element-id="${element.id}"]`);
        const rect = node?.getBoundingClientRect?.();
        return {
          id: element.id,
          opacity: element.data?.opacity ?? 1,
          rect: rect ? {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          } : null,
        };
      })
      .sort((left, right) => (right.opacity ?? 0) - (left.opacity ?? 0));

    const primary = nexusInstances[0];
    const textNode = Array.from(canvas.querySelectorAll<SVGTextElement>('text')).find((node) =>
      (node.textContent ?? '').includes('QUANTUM SINGULARITY DETECTED')
    );
    const symbolDef = canvas.querySelector('defs #symbol-nexus');

    return {
      nexusCount: nexusInstances.length,
      nexusViewBox: symbolDef?.getAttribute('viewBox') ?? null,
      primaryContainsCanvasCenter: primary?.rect
        ? (
          primary.rect.left <= canvasCenterX &&
          primary.rect.right >= canvasCenterX &&
          primary.rect.top <= canvasCenterY &&
          primary.rect.bottom >= canvasCenterY
        )
        : false,
      primaryWidth: primary?.rect?.width ?? 0,
      primaryHeight: primary?.rect?.height ?? 0,
      textFontFamily: textNode?.getAttribute('font-family') ?? null,
      textFilter: textNode?.getAttribute('filter') ?? null,
      hasSymbolDef: Boolean(symbolDef),
    };
  });

  expect(runtime.hasSymbolDef).toBeTruthy();
  expect(runtime.nexusCount).toBe(3);
  expect(runtime.nexusViewBox).toBe('0 0 1000 1000');
  expect(runtime.primaryContainsCanvasCenter).toBeTruthy();
  expect(runtime.primaryWidth).toBeGreaterThan(120);
  expect(runtime.primaryHeight).toBeGreaterThan(120);
  expect(runtime.textFontFamily).toContain('Courier New');
  expect(runtime.textFilter).toBe('url(#hyperGlow)');

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('<symbol id="symbol-nexus" viewBox="0 0 1000 1000"');
  expect(exportedSvg).toContain("font-family=\"'Courier New', monospace\"");
  expect(exportedSvg).toContain('filter="url(#hyperGlow)"');
  expect(exportedSvg).toContain('transform-origin="500 500"');
});

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
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/rosette_nested_symbol_use.svg');
  await fileInput.setInputFiles({
    name: 'rosette-nested-symbol-use.svg',
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

test('imports nested symbol uses and preserves dependent symbol defs', async ({ page }) => {
  await bootstrap(page);
  await importFixture(page);

  const imported = await page.evaluate(() => {
    const root = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    root?.pauseAnimations?.();
    root?.setCurrentTime?.(0);

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

    const symbolInstances = (testWindow.useCanvasStore?.getState?.().elements ?? [])
      .filter((element) => element.type === 'symbolInstance' && element.data?.symbolId === 'rosette')
      .map((element) => {
        const node = document.querySelector<SVGGElement>(`[data-element-id="${element.id}"]`);
        const rect = node?.getBoundingClientRect?.();
        return {
          id: element.id,
          opacity: element.data?.opacity,
          rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
        };
      })
      .sort((a, b) => (b.opacity ?? 0) - (a.opacity ?? 0));

    const rosetteDef = document.querySelector('#symbol-rosette');
    return {
      hasPetalDef: Boolean(document.querySelector('#symbol-petal')),
      hasRosetteDef: Boolean(rosetteDef),
      rosetteMarkup: rosetteDef?.outerHTML ?? '',
      symbolInstances,
    };
  });

  expect(imported.hasPetalDef).toBeTruthy();
  expect(imported.hasRosetteDef).toBeTruthy();
  expect(imported.rosetteMarkup).toContain('href="#symbol-petal"');
  expect(imported.symbolInstances).toHaveLength(2);
  expect(imported.symbolInstances.every((instance) => (instance.rect?.width ?? 0) > 1000)).toBeTruthy();
  expect(imported.symbolInstances.every((instance) => (instance.rect?.height ?? 0) > 1000)).toBeTruthy();

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('<symbol id="symbol-petal"');
  expect(exportedSvg).toContain('<symbol id="symbol-rosette"');
  expect(exportedSvg).toContain('href="#symbol-petal"');
});

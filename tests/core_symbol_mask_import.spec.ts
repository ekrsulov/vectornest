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
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/core_symbol_mask_import.svg');
  await fileInput.setInputFiles({
    name: 'core-symbol-mask-import.svg',
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

test('imports masked symbol core without inheriting the outer mask into the translated inner group', async ({ page }) => {
  await bootstrap(page);
  await importFixture(page);

  const initial = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      useCanvasStore?: {
        getState: () => {
          elements?: Array<{
            id: string;
            type: string;
            parentId: string | null;
            data?: {
              name?: string;
              symbolId?: string;
              maskId?: string;
              clipPathId?: string;
            };
          }>;
        };
      };
    };

    const elements = testWindow.useCanvasStore?.getState?.().elements ?? [];
    const symbolInstances = elements.filter((element) => element.type === 'symbolInstance' && element.data?.symbolId === 'core');
    const innerGroup = elements.find((element) => element.type === 'group' && element.data?.name === 'Imported Group 2');
    const outerGroup = elements.find((element) => element.type === 'group' && element.data?.name === 'Imported Group 1');
    const firstSymbol = symbolInstances[0];
    const firstHost = firstSymbol ? document.querySelector<SVGUseElement>(`use[data-element-id="${firstSymbol.id}"]`) : null;
    const bbox = firstHost?.getBoundingClientRect?.();

    return {
      symbolInstanceCount: symbolInstances.length,
      outerGroupMaskId: outerGroup?.data?.maskId ?? null,
      outerGroupClipPathId: outerGroup?.data?.clipPathId ?? null,
      innerGroupMaskId: innerGroup?.data?.maskId ?? null,
      innerGroupClipPathId: innerGroup?.data?.clipPathId ?? null,
      firstSymbolHref: firstHost?.getAttribute('href') ?? null,
      firstSymbolBBox: bbox ? { width: bbox.width, height: bbox.height } : null,
    };
  });

  expect(initial.symbolInstanceCount).toBe(3);
  expect(initial.outerGroupMaskId).toBe('fade');
  expect(initial.outerGroupClipPathId).toBe('clip');
  expect(initial.innerGroupMaskId).toBeNull();
  expect(initial.innerGroupClipPathId).toBeNull();
  expect(initial.firstSymbolHref).toBe('#symbol-core');
  expect(initial.firstSymbolBBox).not.toBeNull();
  expect(initial.firstSymbolBBox?.width ?? 0).toBeGreaterThan(0);
  expect(initial.firstSymbolBBox?.height ?? 0).toBeGreaterThan(0);

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('mask="url(#fade)"');
  expect(exportedSvg).toContain('clip-path="url(#clip)"');
  expect(exportedSvg).not.toContain('data-name="Imported Group 2" transform="matrix(1 0 0 1 500 500)" mask="url(#fade)"');
  expect(exportedSvg).toContain('href="#symbol-core"');
});

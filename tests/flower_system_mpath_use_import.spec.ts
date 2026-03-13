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
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/flower_system_mpath_use.svg');
  await fileInput.setInputFiles({
    name: 'flower-system-mpath-use.svg',
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

test('imports animateMotion mpath refs inside expanded use content and preserves orbit defs on export', async ({ page }) => {
  await bootstrap(page);
  await importFixture(page);

  const initial = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      useCanvasStore?: {
        getState: () => {
          elements?: Array<{
            id: string;
            type: string;
            data?: {
              originalHref?: string;
              opacity?: number;
            };
          }>;
        };
      };
    };

    const systemUses = (testWindow.useCanvasStore?.getState?.().elements ?? [])
      .filter((element) => element.type === 'use' && element.data?.originalHref === 'system')
      .sort((left, right) => (right.data?.opacity ?? 1) - (left.data?.opacity ?? 1));

    const primarySystem = systemUses[0];
    if (!primarySystem) {
      throw new Error('Primary system use was not imported');
    }

    const host = document.querySelector<SVGGElement>(`[data-element-id="${primarySystem.id}"]`);
    const animateMotion = host?.querySelector('animateMotion');
    const motionGroup = animateMotion?.parentElement as SVGGElement | null;
    const mpathHref = animateMotion?.querySelector('mpath')?.getAttribute('href') ?? null;
    const rect = motionGroup?.getBoundingClientRect?.();

    return {
      primarySystemId: primarySystem.id,
      systemUseCount: systemUses.length,
      animateMotionCount: host?.querySelectorAll('animateMotion').length ?? 0,
      mpathHref,
      mpathTargetExists: mpathHref ? Boolean(document.querySelector(mpathHref)) : false,
      rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
    };
  });

  await page.waitForTimeout(1400);

  const later = await page.evaluate((primarySystemId: string) => {
    const host = document.querySelector<SVGGElement>(`[data-element-id="${primarySystemId}"]`);
    const animateMotion = host?.querySelector('animateMotion');
    const motionGroup = animateMotion?.parentElement as SVGGElement | null;
    const rect = motionGroup?.getBoundingClientRect?.();

    return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
  }, initial.primarySystemId);

  expect(initial.systemUseCount).toBe(2);
  expect(initial.animateMotionCount).toBe(3);
  expect(initial.mpathHref).toMatch(/^#el-/);
  expect(initial.mpathTargetExists).toBeTruthy();
  expect(initial.rect).not.toBeNull();
  expect(later).not.toBeNull();
  expect(
    Math.abs((later?.x ?? 0) - (initial.rect?.x ?? 0)) + Math.abs((later?.y ?? 0) - (initial.rect?.y ?? 0))
  ).toBeGreaterThan(4);

  const exportedSvg = await exportSvg(page);
  expect(exportedSvg).toContain('id="orbit"');
  expect(exportedSvg).toContain('<mpath href="#orbit" />');
  expect(exportedSvg).toContain('<g id="system"');
});

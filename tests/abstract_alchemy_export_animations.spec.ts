import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function importSvgBuffer(
  page: import('@playwright/test').Page,
  name: string,
  buffer: Buffer,
): Promise<void> {
  await page.getByRole('button', { name: 'File' }).click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles({
    name,
    mimeType: 'image/svg+xml',
    buffer,
  });
  await page.waitForTimeout(1200);
}

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
  const buffer = await readFile('/Users/ernestokrsulovic/dev/vectornest/tests/abstract_alchemy_export_animations.svg');
  await importSvgBuffer(page, 'abstract-alchemy-export-animations.svg', buffer);
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
  const symbolSectionMatch = exportedSvg.match(/<symbol id="symbol-nexusCore"[\s\S]*?<\/symbol>/);
  const textCircleIdCount = (exportedSvg.match(/id="textCircle"/g) ?? []).length;

  expect(exportedSvg).toContain('<path id="textCircle"');
  expect(exportedSvg).toContain('<textPath href="#textCircle"');
  expect(exportedSvg).toContain('AWARD-WINNING ABSTRACT SVG ALCHEMY');
  expect(exportedSvg).toContain('attributeName="startOffset"');
  expect(exportedSvg).toMatch(/<animate[^>]*attributeName="points"[^>]*href="#[^"]+"/);
  expect(exportedSvg).toContain('<mpath href="#figureEight"');
  expect(exportedSvg).not.toContain('xmlns=""');
  expect(symbolSectionMatch).not.toBeNull();
  expect(symbolSectionMatch?.[0].match(/<animateTransform/g) ?? []).toHaveLength(3);
  expect(textCircleIdCount).toBe(1);

  const defsStart = exportedSvg.indexOf('<defs>');
  const defsEnd = exportedSvg.indexOf('</defs>');
  const textStart = exportedSvg.indexOf('AWARD-WINNING ABSTRACT SVG ALCHEMY');

  expect(defsStart).toBeGreaterThanOrEqual(0);
  expect(defsEnd).toBeGreaterThan(defsStart);
  expect(textStart).toBeGreaterThan(defsEnd);

  await bootstrap(page);
  await importSvgBuffer(
    page,
    'abstract-alchemy-export-roundtrip.svg',
    Buffer.from(exportedSvg, 'utf8'),
  );

  const roundTripInitial = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found after round-trip import');
    }

    const texts = Array.from(canvas.querySelectorAll<SVGTextElement>('text')).filter((node) =>
      (node.textContent ?? '').includes('AWARD-WINNING ABSTRACT SVG ALCHEMY')
    );
    const motions = Array.from(canvas.querySelectorAll<SVGAnimateMotionElement>('animateMotion')).map((node) => {
      const parent = node.parentElement as SVGGraphicsElement | null;
      const href = node.querySelector('mpath')?.getAttribute('href') ?? null;
      const rect = parent?.getBoundingClientRect?.();
      return {
        tagName: parent?.tagName?.toLowerCase() ?? null,
        href,
        targetExists: href ? Boolean(document.querySelector(href)) : false,
        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      };
    });

    return {
      textCount: texts.length,
      textPathCount: canvas.querySelectorAll('textPath').length,
      motions,
    };
  });

  await page.waitForTimeout(1400);

  const roundTripLater = await page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found after round-trip delay');
    }

    return Array.from(canvas.querySelectorAll<SVGAnimateMotionElement>('animateMotion')).map((node) => {
      const parent = node.parentElement as SVGGraphicsElement | null;
      const rect = parent?.getBoundingClientRect?.();
      return {
        tagName: parent?.tagName?.toLowerCase() ?? null,
        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      };
    });
  });

  const roundTripSymbolState = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      useCanvasStore?: {
        getState: () => {
          animations?: Array<{
            type?: string;
            symbolTargetId?: string;
            symbolChildIndex?: number;
          }>;
        };
      };
    };

    const state = testWindow.useCanvasStore?.getState?.();
    const animations = state?.animations ?? [];

    return {
      symbolAnimateTransforms: animations.filter((animation) =>
        animation.type === 'animateTransform' && animation.symbolTargetId === 'nexusCore'
      ).length,
      symbolChildTargets: animations
        .filter((animation) => animation.type === 'animateTransform' && animation.symbolTargetId === 'nexusCore')
        .map((animation) => animation.symbolChildIndex ?? null)
        .sort(),
    };
  });

  const secondExportedSvg = await exportSvg(page);
  const secondSymbolSectionMatch = secondExportedSvg.match(/<symbol id="symbol-nexusCore"[\s\S]*?<\/symbol>/);

  const initialCircle = roundTripInitial.motions.find((motion) => motion.tagName === 'circle');
  const laterCircle = roundTripLater.find((motion) => motion.tagName === 'circle');
  const initialGroup = roundTripInitial.motions.find((motion) => motion.tagName === 'g');
  const laterGroup = roundTripLater.find((motion) => motion.tagName === 'g');

  expect(roundTripInitial.textCount).toBe(1);
  expect(roundTripInitial.textPathCount).toBe(1);
  expect(roundTripInitial.motions).toHaveLength(2);
  expect(roundTripInitial.motions.every((motion) => motion.targetExists)).toBeTruthy();
  expect(roundTripSymbolState.symbolAnimateTransforms).toBe(3);
  expect(roundTripSymbolState.symbolChildTargets).toEqual([2, 3, 4]);
  expect(initialCircle?.rect).not.toBeNull();
  expect(laterCircle?.rect).not.toBeNull();
  expect(initialGroup?.rect).not.toBeNull();
  expect(laterGroup?.rect).not.toBeNull();
  expect(
    Math.abs((laterCircle?.rect?.x ?? 0) - (initialCircle?.rect?.x ?? 0)) +
      Math.abs((laterCircle?.rect?.y ?? 0) - (initialCircle?.rect?.y ?? 0))
  ).toBeGreaterThan(4);
  expect(
    Math.abs((laterGroup?.rect?.x ?? 0) - (initialGroup?.rect?.x ?? 0)) +
      Math.abs((laterGroup?.rect?.y ?? 0) - (initialGroup?.rect?.y ?? 0))
  ).toBeGreaterThan(4);
  expect(secondSymbolSectionMatch).not.toBeNull();
  expect(secondSymbolSectionMatch?.[0].match(/<animateTransform/g) ?? []).toHaveLength(3);
  expect(secondExportedSvg).not.toMatch(/<path[^>]*id="textCircle"[^>]*display="none"[^>]*display="none"/);
  expect(secondExportedSvg).not.toMatch(/<path[^>]*id="figureEight"[^>]*display="none"[^>]*display="none"/);
});

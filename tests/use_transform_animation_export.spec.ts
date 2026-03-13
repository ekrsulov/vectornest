import { expect, test } from '@playwright/test';

const summerRefractionsSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1200 1200"
  width="1200"
  height="1200"
>
  <defs>
    <radialGradient id="orbFill" cx="50%" cy="45%" r="60%" fx="30%" fy="28%">
      <stop offset="0%" stop-color="#fffde1"/>
      <stop offset="48%" stop-color="#ffe27a"/>
      <stop offset="100%" stop-color="#ff7a59"/>
    </radialGradient>
    <linearGradient id="orbRing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff7db" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ffd76d" stop-opacity="0.25"/>
    </linearGradient>
    <g id="orb">
      <circle r="58" fill="url(#orbFill)" opacity="0.96"/>
      <circle r="82" fill="none" stroke="url(#orbRing)" stroke-width="7" opacity="0.62"/>
      <circle cx="-18" cy="-18" r="14" fill="#fffbe0" opacity="0.88"/>
    </g>
  </defs>

  <use href="#orb" transform="translate(255 318)">
    <animateTransform
      attributeName="transform"
      type="translate"
      values="255 318;238 292;255 318"
      dur="11s"
      repeatCount="indefinite"
    />
    <animate attributeName="opacity" values="0.82;1;0.82" dur="11s" repeatCount="indefinite"/>
  </use>

  <use href="#orb" transform="translate(940 275) scale(0.82)">
    <animateTransform
      attributeName="transform"
      type="translate"
      values="940 275;965 250;940 275"
      dur="13s"
      repeatCount="indefinite"
    />
    <animate attributeName="opacity" values="0.72;0.95;0.72" dur="13s" repeatCount="indefinite"/>
  </use>

  <use href="#orb" transform="translate(995 820) scale(1.15)">
    <animateTransform
      attributeName="transform"
      type="translate"
      values="995 820;970 790;995 820"
      dur="15s"
      repeatCount="indefinite"
    />
    <animate attributeName="opacity" values="0.55;0.86;0.55" dur="15s" repeatCount="indefinite"/>
  </use>
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

async function importSvg(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: 'File' }).click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles({
    name: 'use-transform-animation-export.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(summerRefractionsSvg, 'utf8'),
  });
  await page.waitForTimeout(1000);
}

async function exportSvg(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async () => {
    const { ExportManager } = await import('/src/utils/export/ExportManager.ts');
    return ExportManager.generateSvgContent(false, 0).content;
  });
}

test('keeps imported animated use refs in place when playback starts on canvas', async ({ page }) => {
  await bootstrap(page);
  await importSvg(page);

  const beforePlay = await page.evaluate(() => {
    const store = window.useCanvasStore?.getState?.();
    const orbUses = (store?.elements ?? [])
      .filter((element) => element.type === 'use' && element.data?.originalHref === 'orb')
      .map((element) => ({
        id: element.id,
        transformMatrix: element.data?.transformMatrix,
      }))
      .sort((left, right) => ((left.transformMatrix?.[4] ?? 0) - (right.transformMatrix?.[4] ?? 0)));

    return orbUses.map((element) => {
      const node = document.querySelector<SVGGraphicsElement>(`[data-element-id="${element.id}"]`);
      const rect = node?.getBoundingClientRect?.();
      return {
        id: element.id,
        x: rect?.x ?? null,
        y: rect?.y ?? null,
        width: rect?.width ?? null,
        height: rect?.height ?? null,
      };
    });
  });

  await page.evaluate(() => {
    const store = window.useCanvasStore?.getState?.();
    store?.playAnimations?.();
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    canvas?.pauseAnimations?.();
    canvas?.setCurrentTime?.(0);
  });
  await page.waitForTimeout(100);

  const afterPlay = await page.evaluate(() => {
    const store = window.useCanvasStore?.getState?.();
    const orbUses = (store?.elements ?? [])
      .filter((element) => element.type === 'use' && element.data?.originalHref === 'orb')
      .map((element) => ({
        id: element.id,
        transformMatrix: element.data?.transformMatrix,
      }))
      .sort((left, right) => ((left.transformMatrix?.[4] ?? 0) - (right.transformMatrix?.[4] ?? 0)));

    return orbUses.map((element) => {
      const node = document.querySelector<SVGGraphicsElement>(`[data-element-id="${element.id}"]`);
      const rect = node?.getBoundingClientRect?.();
      return {
        id: element.id,
        x: rect?.x ?? null,
        y: rect?.y ?? null,
        width: rect?.width ?? null,
        height: rect?.height ?? null,
      };
    });
  });

  expect(beforePlay).toHaveLength(3);
  expect(afterPlay).toHaveLength(3);

  for (let index = 0; index < beforePlay.length; index += 1) {
    expect(afterPlay[index].x).not.toBeNull();
    expect(afterPlay[index].y).not.toBeNull();
    expect(Math.abs((afterPlay[index].x ?? 0) - (beforePlay[index].x ?? 0))).toBeLessThan(20);
    expect(Math.abs((afterPlay[index].y ?? 0) - (beforePlay[index].y ?? 0))).toBeLessThan(20);
  }
});

test('preserves imported use transform lists when exporting animated use refs from defs', async ({ page }) => {
  await bootstrap(page);
  await importSvg(page);

  const exportedSvg = await exportSvg(page);

  expect(exportedSvg).toMatch(/<use[^>]*href="#orb"[^>]*transform="translate\(255 318\)"/);
  expect(exportedSvg).toMatch(/<use[^>]*href="#orb"[^>]*transform="translate\(940 275\) scale\(0\.82\)"/);
  expect(exportedSvg).toMatch(/<use[^>]*href="#orb"[^>]*transform="translate\(995 820\) scale\(1\.15\)"/);
  expect(exportedSvg).toContain('values="940 275;965 250;940 275"');
  expect(exportedSvg).toContain('values="995 820;970 790;995 820"');
  expect(exportedSvg).not.toMatch(/<use[^>]*href="#orb"[^>]*transform="matrix\(0\.82 0 0 0\.82 940 275\)"/);
  expect(exportedSvg).not.toMatch(/<use[^>]*href="#orb"[^>]*transform="matrix\(1\.15 0 0 1\.15 995 820\)"/);
});
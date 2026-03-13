import { expect, test } from '@playwright/test';

const symbolDiamondSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff006e" />
      <stop offset="1" stop-color="#8338ec" />
    </linearGradient>
    <linearGradient id="facet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.45" stop-color="#ffd60a" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ff006e" stop-opacity="0.95"/>
      <animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="12s" repeatCount="indefinite"/>
    </linearGradient>
    <radialGradient id="orb" cx="50%" cy="50%" r="60%" fx="35%" fy="35%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.22" stop-color="#ffe66d"/>
      <stop offset="0.55" stop-color="#ff4d6d"/>
      <stop offset="1" stop-color="#5a189a"/>
    </radialGradient>
    <clipPath id="iris">
      <circle cx="400" cy="400" r="258">
        <animate attributeName="r" values="240;290;240" dur="7s" repeatCount="indefinite"/>
      </circle>
    </clipPath>
    <symbol id="diamond" viewBox="-120 -120 240 240">
      <polygon points="0,-110 110,0 0,110 -110,0" fill="url(#facet)" stroke="#ffffff" stroke-opacity="0.55" stroke-width="3"/>
    </symbol>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <g clip-path="url(#iris)">
    <circle cx="400" cy="400" r="270" fill="url(#orb)" opacity="0.96"/>
    <use href="#diamond" x="190" y="190" width="420" height="420" opacity="0.92">
      <animateTransform attributeName="transform" type="rotate" values="0 400 400;360 400 400" dur="18s" repeatCount="indefinite"/>
    </use>
    <use href="#diamond" x="255" y="255" width="290" height="290" opacity="0.82" transform="rotate(45 400 400)">
      <animateTransform attributeName="transform" additive="sum" type="rotate" values="0 400 400;-360 400 400" dur="14s" repeatCount="indefinite"/>
    </use>
  </g>
  <circle cx="400" cy="400" r="34" fill="#ffffff" opacity="0.96"/>
</svg>`;

const bauhausMotionSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <defs>
    <rect id="S" width="150" height="150" />
    <circle id="C" cx="75" cy="75" r="75">
      <animate attributeName="r" values="75; 35; 75" dur="4s" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" repeatCount="indefinite" />
    </circle>
    <polygon id="T" points="75,0 150,150 0,150">
      <animateTransform attributeName="transform" type="rotate" values="0 75 100; 360 75 100" dur="6s" repeatCount="indefinite" />
    </polygon>
    <g id="B">
      <use href="#S" fill="#E00000" />
      <use href="#C" fill="#FFD100" />
      <use href="#T" fill="#003B96" opacity="0.9" />
    </g>
  </defs>
  <rect width="600" height="600" fill="#F4F4F0" />
  <use href="#B" x="0" y="0">
    <animateTransform attributeName="transform" type="translate" values="0,0; 450,0; 0,0" dur="8s" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.5 0 0.5 1; 0.5 0 0.5 1" repeatCount="indefinite" />
  </use>
  <use href="#B" x="225" y="225">
    <animateTransform attributeName="transform" type="rotate" values="0 300 300; 360 300 300" dur="10s" repeatCount="indefinite" />
  </use>
  <use href="#B" x="450" y="450">
    <animateTransform attributeName="transform" type="translate" values="0,0; -450,-450; 0,0" dur="6s" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.5 0 0.5 1; 0.5 0 0.5 1" repeatCount="indefinite" />
  </use>
  <use href="#S" x="450" y="0" fill="#000000">
    <animate attributeName="fill" values="#000000;#E00000;#FFD100;#003B96;#000000" dur="12s" repeatCount="indefinite"/>
  </use>
  <use href="#C" x="0" y="450" fill="#E00000">
    <animateTransform attributeName="transform" type="translate" values="0,0; 0,-300; 0,0" dur="5s" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.5 0 0.5 1; 0.5 0 0.5 1" repeatCount="indefinite" />
  </use>
  <path d="M150 0 v600 M450 0 v600 M0 150 h600 M0 450 h600" stroke="#000000" stroke-width="15" fill="none" />
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

async function importSvg(page: import('@playwright/test').Page, name: string, svg: string): Promise<void> {
  await page.getByRole('button', { name: 'File' }).click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles({
    name,
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg, 'utf8'),
  });
  await page.waitForTimeout(1000);
}

test('keeps animated symbol uses with x/y in place when playback starts', async ({ page }) => {
  await bootstrap(page);
  await importSvg(page, 'symbol-positioned-anim.svg', symbolDiamondSvg);

  const beforePlay = await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    const instances = (state?.elements ?? [])
      .filter((element) => element.type === 'symbolInstance')
      .map((element) => ({ id: element.id, x: element.data?.x ?? 0, opacity: element.data?.opacity ?? 1 }))
      .sort((a, b) => a.x - b.x);

    return instances.map((instance) => {
      const node = document.querySelector<SVGGraphicsElement>(`[data-element-id="${instance.id}"]`);
      const rect = node?.getBoundingClientRect?.();
      return {
        id: instance.id,
        x: rect?.x ?? null,
        y: rect?.y ?? null,
      };
    });
  });

  await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    state?.playAnimations?.();
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    canvas?.pauseAnimations?.();
    canvas?.setCurrentTime?.(0);
  });
  await page.waitForTimeout(100);

  const afterPlay = await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    const instances = (state?.elements ?? [])
      .filter((element) => element.type === 'symbolInstance')
      .map((element) => ({ id: element.id, x: element.data?.x ?? 0 }))
      .sort((a, b) => a.x - b.x);

    return instances.map((instance) => {
      const node = document.querySelector<SVGGraphicsElement>(`[data-element-id="${instance.id}"]`);
      const rect = node?.getBoundingClientRect?.();
      return {
        id: instance.id,
        x: rect?.x ?? null,
        y: rect?.y ?? null,
      };
    });
  });

  expect(beforePlay).toHaveLength(2);
  expect(afterPlay).toHaveLength(2);

  const afterById = new Map(afterPlay.map((item) => [item.id, item]));
  for (const item of beforePlay) {
    const afterItem = afterById.get(item.id);
    expect(afterItem).toBeDefined();
    expect(Math.abs((afterItem?.x ?? 0) - (item.x ?? 0))).toBeLessThan(20);
    expect(Math.abs((afterItem?.y ?? 0) - (item.y ?? 0))).toBeLessThan(20);
  }
});

test('keeps animated uses with x/y in place when playback starts', async ({ page }) => {
  await bootstrap(page);
  await importSvg(page, 'bauhaus-positioned-use.svg', bauhausMotionSvg);

  const beforePlay = await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    const animatedTargetIds = new Set((state?.animations ?? []).map((animation) => animation.targetElementId).filter(Boolean));
    const uses = (state?.elements ?? [])
      .filter((element) => element.type === 'use' && animatedTargetIds.has(element.id))
      .map((element) => ({ id: element.id, x: element.data?.x ?? 0, y: element.data?.y ?? 0 }))
      .sort((a, b) => (a.x + a.y) - (b.x + b.y));

    return uses.map((useElement) => {
      const node = document.querySelector<SVGGraphicsElement>(`[data-element-id="${useElement.id}"]`);
      const rect = node?.getBoundingClientRect?.();
      return {
        id: useElement.id,
        x: rect?.x ?? null,
        y: rect?.y ?? null,
      };
    });
  });

  await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    state?.playAnimations?.();
    const canvas = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    canvas?.pauseAnimations?.();
    canvas?.setCurrentTime?.(0);
  });
  await page.waitForTimeout(100);

  const afterPlay = await page.evaluate(() => {
    const state = window.useCanvasStore?.getState?.();
    const animatedTargetIds = new Set((state?.animations ?? []).map((animation) => animation.targetElementId).filter(Boolean));
    const uses = (state?.elements ?? [])
      .filter((element) => element.type === 'use' && animatedTargetIds.has(element.id))
      .map((element) => ({ id: element.id, x: element.data?.x ?? 0, y: element.data?.y ?? 0 }))
      .sort((a, b) => (a.x + a.y) - (b.x + b.y));

    return uses.map((useElement) => {
      const node = document.querySelector<SVGGraphicsElement>(`[data-element-id="${useElement.id}"]`);
      const rect = node?.getBoundingClientRect?.();
      return {
        id: useElement.id,
        x: rect?.x ?? null,
        y: rect?.y ?? null,
      };
    });
  });

  expect(beforePlay.length).toBeGreaterThanOrEqual(4);
  expect(afterPlay).toHaveLength(beforePlay.length);

  const afterById = new Map(afterPlay.map((item) => [item.id, item]));
  for (const item of beforePlay) {
    const afterItem = afterById.get(item.id);
    expect(afterItem).toBeDefined();
    expect(Math.abs((afterItem?.x ?? 0) - (item.x ?? 0))).toBeLessThan(35);
    expect(Math.abs((afterItem?.y ?? 0) - (item.y ?? 0))).toBeLessThan(35);
  }
});
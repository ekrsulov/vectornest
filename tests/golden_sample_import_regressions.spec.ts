import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';

const reducedGoldenSampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 700 400" width="700" height="400">
  <defs>
    <symbol id="star" viewBox="0 0 50 50">
      <path d="M25,5 L30,20 L45,20 L33,28 L38,43 L25,35 L12,43 L17,28 L5,20 L20,20 Z"
            fill="#ffd93d" stroke="#f97316" stroke-width="1.5"/>
    </symbol>
    <path id="motionPath" d="M20,40 Q60,10 100,40 T180,40" fill="none" stroke="#ddd" stroke-width="1"/>
  </defs>

  <g transform="translate(20, 20)">
    <use href="#star" x="40" y="50" width="40" height="40"/>
    <use href="#star" x="100" y="50" width="40" height="40" transform="rotate(15 120 70)"/>
    <use href="#star" x="160" y="50" width="40" height="40" transform="scale(0.8)"/>
  </g>

  <g transform="translate(250, 20)">
    <text x="30" y="70" font-family="Arial" font-size="16" fill="#2c3e50">
      Multi-style:
      <tspan fill="#e74c3c" font-weight="bold">RED</tspan>
      <tspan dx="5" fill="#3498db" font-style="italic">blue</tspan>
      <tspan dx="5" fill="#2ecc71" font-size="20">BIG</tspan>
    </text>
  </g>

  <g transform="translate(20, 180)">
    <use href="#motionPath" x="25" y="40"/>
    <circle r="6" fill="#2ecc71">
      <animateMotion dur="4s" repeatCount="indefinite">
        <mpath href="#motionPath"/>
      </animateMotion>
    </circle>
  </g>

  <g transform="translate(250, 180)">
    <path d="M40,85 Q125,40 210,85" fill="none" stroke="#e74c3c" stroke-width="4"
          stroke-dasharray="300" stroke-dashoffset="300">
      <animate attributeName="stroke-dashoffset" from="300" to="0" dur="3s" repeatCount="indefinite"/>
    </path>
  </g>

  <g transform="translate(520, 180)">
    <g color="#e74c3c">
      <rect x="60" y="60" width="40" height="40" fill="currentColor"/>
      <circle cx="140" cy="80" r="20" stroke="currentColor" stroke-width="3" fill="none"/>
    </g>
  </g>
</svg>`;

async function bootstrap(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await waitForLoad(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage?.clear();
  });
  await page.reload();
  await waitForLoad(page);
}

async function importSvgContent(
  page: import('@playwright/test').Page,
  name: string,
  svgContent: string
): Promise<void> {
  await page.locator('[aria-label="File"]').click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles({
    name,
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svgContent, 'utf-8'),
  });
}

test('imports the reported golden-sample regressions correctly', async ({ page }) => {
  await bootstrap(page);
  await importSvgContent(page, 'reduced-golden-sample.svg', reducedGoldenSampleSvg);
  await page.waitForTimeout(500);

  const initialRuntime = await page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const animatedCircle = canvas.querySelector('circle[data-element-id]');
    const animatedStrokePath = Array.from(canvas.querySelectorAll('path[data-element-id]')).find(
      (node) => node.getAttribute('stroke') === '#e74c3c'
    ) as SVGPathElement | undefined;

    return {
      circleRect: animatedCircle?.getBoundingClientRect().toJSON() ?? null,
      strokeDashoffsetAttr: animatedStrokePath?.getAttribute('stroke-dashoffset') ?? null,
      strokeDashoffsetStyle: animatedStrokePath ? getComputedStyle(animatedStrokePath).strokeDashoffset : null,
    };
  });

  await page.waitForTimeout(1200);

  const laterRuntime = await page.evaluate(() => {
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    const animatedCircle = canvas.querySelector('circle[data-element-id]');
    const animatedStrokePath = Array.from(canvas.querySelectorAll('path[data-element-id]')).find(
      (node) => node.getAttribute('stroke') === '#e74c3c'
    ) as SVGPathElement | undefined;

    return {
      circleRect: animatedCircle?.getBoundingClientRect().toJSON() ?? null,
      strokeDashoffsetAttr: animatedStrokePath?.getAttribute('stroke-dashoffset') ?? null,
      strokeDashoffsetStyle: animatedStrokePath ? getComputedStyle(animatedStrokePath).strokeDashoffset : null,
    };
  });

  const summary = await page.evaluate(() => {
    const storeApi = window.useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    const state = storeApi.getState();
    const elements = state.elements ?? [];
    const animations = (state as { animations?: Array<Record<string, unknown>> }).animations ?? [];
    const canvas = document.querySelector('svg[data-canvas="true"]');
    if (!canvas) {
      throw new Error('Canvas SVG not found');
    }

    return {
      symbolInstances: elements
        .filter((element: { type: string }) => element.type === 'symbolInstance')
        .map((element: { id: string; data: Record<string, unknown> }) => ({
          id: element.id,
          symbolId: element.data.symbolId,
          fillColor: element.data.fillColor,
          pathFillColor: (element.data.pathData as { fillColor?: string } | undefined)?.fillColor,
          strokeColor: element.data.strokeColor,
          pathStrokeColor: (element.data.pathData as { strokeColor?: string } | undefined)?.strokeColor,
        })),
      nativeText: elements
        .filter((element: { type: string }) => element.type === 'nativeText')
        .map((element: { id: string; data: Record<string, unknown> }) => ({
          id: element.id,
          text: element.data.text,
          spans: element.data.spans,
        })),
      motionPathElements: elements
        .filter((element: { type: string; data: Record<string, unknown> }) => element.data?.sourceId === 'motionPath')
        .map((element: { id: string; type: string; data: Record<string, unknown> }) => ({
          id: element.id,
          type: element.type,
          fillColor: element.data.fillColor,
          strokeColor: element.data.strokeColor,
        })),
      currentColorShapes: elements
        .filter((element: { type: string }) => element.type === 'nativeShape')
        .map((element: { id: string; data: Record<string, unknown> }) => ({
          id: element.id,
          kind: element.data.kind,
          fillColor: element.data.fillColor,
          strokeColor: element.data.strokeColor,
        })),
      animations: animations.map((animation) => ({
        type: animation.type,
        attributeName: animation.attributeName,
        targetElementId: animation.targetElementId,
        mpath: animation.mpath,
        from: animation.from,
        to: animation.to,
      })),
      rendered: {
        starFills: Array.from(canvas.querySelectorAll('path[data-element-id]'))
          .map((node) => ({
            id: node.getAttribute('data-element-id'),
            fill: node.getAttribute('fill'),
            stroke: node.getAttribute('stroke'),
          }))
          .filter((entry) => entry.fill === '#ffd93d' || entry.fill === '#2ecc71' || entry.stroke === '#ddd' || entry.stroke === '#e74c3c'),
        nativeTextNodes: Array.from(canvas.querySelectorAll('text[data-element-id]')).map((node) => ({
          textContent: node.textContent,
          tspans: Array.from(node.querySelectorAll('tspan')).map((tspan) => tspan.textContent),
        })),
        animateMotionCount: canvas.querySelectorAll('animateMotion').length,
        animateCount: canvas.querySelectorAll('animate').length,
        motionPathDomIds: Array.from(canvas.querySelectorAll('path')).map((node) => ({
          id: node.getAttribute('id'),
          dataElementId: node.getAttribute('data-element-id'),
          stroke: node.getAttribute('stroke'),
          fill: node.getAttribute('fill'),
          fillOpacity: node.getAttribute('fill-opacity') ?? getComputedStyle(node).fillOpacity,
          strokeDasharray: node.getAttribute('stroke-dasharray'),
          strokeDashoffset: node.getAttribute('stroke-dashoffset'),
        })).filter((entry) => entry.stroke === '#ddd' || entry.stroke === '#e74c3c'),
        currentColorDom: Array.from(canvas.querySelectorAll('rect[data-element-id], circle[data-element-id]')).map((node) => ({
          tag: node.tagName.toLowerCase(),
          fill: node.getAttribute('fill'),
          stroke: node.getAttribute('stroke'),
          color: node.getAttribute('color'),
        })),
      },
    };
  });

  expect(summary.symbolInstances).toHaveLength(3);
  for (const symbolInstance of summary.symbolInstances) {
    expect(symbolInstance.symbolId).toBe('star');
    expect(symbolInstance.fillColor).toBe('#ffd93d');
    expect(symbolInstance.pathFillColor).toBe('#ffd93d');
  }

  expect(summary.nativeText).toHaveLength(1);
  expect(summary.nativeText[0]?.text).toContain('Multi-style:');
  expect(summary.nativeText[0]?.spans?.map((span) => span.text)).toEqual([
    'Multi-style: ',
    'RED',
    'blue',
    'BIG',
  ]);
  expect(summary.rendered.nativeTextNodes[0]?.textContent).toContain('Multi-style:');

  expect(summary.motionPathElements).toHaveLength(1);
  expect(summary.motionPathElements[0]?.fillColor).toBe('none');
  expect(summary.rendered.animateMotionCount).toBe(1);
  expect(initialRuntime.circleRect?.x).not.toBeNull();
  expect(laterRuntime.circleRect?.x).not.toBeNull();
  expect((laterRuntime.circleRect?.x ?? 0)).toBeGreaterThan((initialRuntime.circleRect?.x ?? 0) + 20);
  const guidePathEntries = summary.rendered.motionPathDomIds.filter((entry) => entry.stroke === '#ddd');
  expect(guidePathEntries.length).toBeGreaterThan(0);
  for (const guidePathEntry of guidePathEntries) {
    expect(guidePathEntry.fill).not.toBe('#2ecc71');
  }

  expect(summary.rendered.animateCount).toBe(1);
  expect(initialRuntime.strokeDashoffsetStyle).not.toBeNull();
  expect(laterRuntime.strokeDashoffsetStyle).not.toBeNull();
  expect(
    Math.abs(
      Number.parseFloat(laterRuntime.strokeDashoffsetStyle ?? '0') -
      Number.parseFloat(initialRuntime.strokeDashoffsetStyle ?? '0')
    )
  ).toBeGreaterThan(20);

  const currentColorRect = summary.currentColorShapes.find((shape) => shape.kind === 'rect');
  expect(currentColorRect?.fillColor).toBe('#e74c3c');
  const currentColorStrokeCircle = summary.currentColorShapes.find(
    (shape) => shape.kind === 'circle' && shape.strokeColor !== 'none'
  );
  expect(currentColorStrokeCircle?.strokeColor).toBe('#e74c3c');
  expect(summary.rendered.currentColorDom).toContainEqual(
    expect.objectContaining({ tag: 'rect', fill: '#e74c3c' })
  );
  expect(summary.rendered.currentColorDom).toContainEqual(
    expect.objectContaining({ tag: 'circle', stroke: '#e74c3c' })
  );
});
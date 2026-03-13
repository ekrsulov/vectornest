import { expect, test } from '@playwright/test';
import { waitForLoad } from './helpers';

async function bootstrap(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('http://127.0.0.1:5173');
  await waitForLoad(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage?.clear();
  });
  await page.reload();
  await waitForLoad(page);
}

test('imports animated symbol uses with preserved use-position and transforms', async ({ page }) => {
  await bootstrap(page);

  await page.getByRole('button', { name: 'File' }).click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles('/Users/ernestokrsulovic/dev/vectornest/tests/prismatic_halo_symbol_use.svg');
  await page.waitForTimeout(1200);

  const symbolInstances = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      useCanvasStore?: {
        getState: () => {
          elements?: Array<{
            id: string;
            type: string;
            data?: {
              x?: number;
              y?: number;
              opacity?: number;
              transformMatrix?: number[];
            };
          }>;
        };
      };
    };
    const root = document.querySelector<SVGSVGElement>('svg[data-canvas="true"]');
    root?.pauseAnimations?.();
    root?.setCurrentTime?.(0);

    const store = testWindow.useCanvasStore?.getState?.();
    return (store?.elements ?? [])
      .filter((element) => element.type === 'symbolInstance')
      .map((element) => {
        const node = document.querySelector<SVGGraphicsElement>(
          `[data-element-id="${element.id}"] use, [data-element-id="${element.id}"] path`
        );
        const bbox = node?.getBBox?.();
        return {
          id: element.id,
          x: element.data?.x,
          y: element.data?.y,
          opacity: element.data?.opacity,
          transformMatrix: element.data?.transformMatrix,
          renderTag: node?.tagName?.toLowerCase() ?? null,
          renderX: node?.getAttribute('x'),
          renderY: node?.getAttribute('y'),
          renderTransform: node?.getAttribute('transform'),
          bbox: bbox ? { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height } : null,
        };
      })
      .sort((a, b) => (b.opacity ?? 0) - (a.opacity ?? 0));
  });

  expect(symbolInstances).toHaveLength(3);

  for (const instance of symbolInstances) {
    expect(instance.x).toBe(450);
    expect(instance.y).toBe(450);
    expect(instance.renderTag).toBe('use');
    expect(instance.renderX).toBe('450');
    expect(instance.renderY).toBe('450');
    expect(instance.renderTransform).toContain('matrix(');
    expect(instance.bbox).not.toBeNull();
  }

  const [primary, mid, outer] = symbolInstances;

  expect(primary.transformMatrix?.[4]).toBeCloseTo(0, 3);
  expect(primary.transformMatrix?.[5]).toBeCloseTo(0, 3);

  expect(mid.transformMatrix?.[4]).toBeCloseTo(249.677, 2);
  expect(mid.transformMatrix?.[5]).toBeCloseTo(-181.401, 2);

  expect(outer.transformMatrix?.[4]).toBeCloseTo(-184.199, 2);
  expect(outer.transformMatrix?.[5]).toBeCloseTo(227.466, 2);
});

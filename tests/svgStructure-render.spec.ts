import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';

const toStructureDisplayId = (id: string): string => (
  id.length >= 13 ? `data-${id.slice(-6)}` : id
);

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

async function createRectangle(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const storeApi = window.useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    return storeApi.getState().addElement({
      type: 'path',
      data: {
        subPaths: [[
          { type: 'M', position: { x: 24, y: 24 } },
          { type: 'L', position: { x: 120, y: 24 } },
          { type: 'L', position: { x: 120, y: 120 } },
          { type: 'L', position: { x: 24, y: 120 } },
          { type: 'Z' },
        ]],
        strokeWidth: 1,
        strokeColor: '#000000',
        strokeOpacity: 1,
        fillColor: '#ffffff',
        fillOpacity: 1,
      },
    });
  });
}

test.describe('svgStructure immediate canvas updates', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrap(page);
  });

  test('Hide/Show updates canvas without manual rerender', async ({ page }) => {
    const elementId = await createRectangle(page);
    const displayId = toStructureDisplayId(elementId);
    const path = page.locator(`path[data-element-id="${elementId}"]`);

    await expect(path).toHaveCount(1);

    await page.getByText(displayId, { exact: true }).first().click();
    await page.getByRole('button', { name: 'Hide' }).first().click();
    await expect(path).toHaveCount(0);

    await page.getByRole('button', { name: 'Show' }).first().click();
    await expect(path).toHaveCount(1);
  });

  test('Lock/Unlock updates lock state without manual rerender', async ({ page }) => {
    const elementId = await createRectangle(page);
    const displayId = toStructureDisplayId(elementId);
    const isLockedInStore = async () =>
      page.evaluate((id) => {
        const storeApi = window.useCanvasStore;
        if (!storeApi) {
          throw new Error('Canvas store is not available');
        }
        return storeApi.getState().isElementLocked(id);
      }, elementId);

    await page.getByText(displayId, { exact: true }).first().click();
    await expect.poll(isLockedInStore).toBe(false);

    await page.getByRole('button', { name: 'Lock' }).first().click();
    await expect(page.getByRole('button', { name: 'Unlock' }).first()).toBeVisible();
    await expect.poll(isLockedInStore).toBe(true);

    await page.getByRole('button', { name: 'Unlock' }).first().click();
    await expect(page.getByRole('button', { name: 'Lock' }).first()).toBeVisible();
    await expect.poll(isLockedInStore).toBe(false);
  });
});

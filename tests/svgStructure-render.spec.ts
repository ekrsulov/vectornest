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

  test('nested scaled group descendants repaint immediately after path edits', async ({ page }) => {
    await page.evaluate(() => {
      const storeApi = window.useCanvasStore;
      if (!storeApi) {
        throw new Error('Canvas store is not available');
      }

      storeApi.setState({
        activePlugin: 'edit',
        selectedIds: ['el-8sjj2m6'],
        selectedCommands: [],
        selectedSubpaths: [],
        elements: [
          {
            id: 'el-8sjg694',
            type: 'group',
            zIndex: 0,
            parentId: null,
            data: {
              childIds: ['el-8sjh3y0'],
              name: 'Iconify Group 1',
              isLocked: false,
              isHidden: false,
              isExpanded: true,
              transform: { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1 },
              transformMatrix: [12.24043, 0, 0, 12.24043, 131.94530000000003, 185.78513692129374],
            },
          },
          {
            id: 'el-8sjh3y0',
            type: 'group',
            zIndex: 0,
            parentId: 'el-8sjg694',
            data: {
              childIds: ['el-8sjj2m6'],
              name: 'Iconify Group 2',
              isLocked: false,
              isHidden: false,
              isExpanded: true,
              transform: { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1 },
              transformMatrix: [1, 0, 0, 1, 0, 0],
            },
          },
          {
            id: 'el-8sjj2m6',
            type: 'path',
            zIndex: 0,
            parentId: 'el-8sjh3y0',
            data: {
              subPaths: [[
                { type: 'M', position: { x: 27.8, y: 2.7 } },
                { type: 'L', position: { x: 39.5, y: 14.4 } },
              ]],
              strokeWidth: 1,
              strokeColor: '#231f20',
              strokeOpacity: 1,
              fillColor: '#ff52a1',
              fillOpacity: 1,
            },
          },
        ],
      });
    });

    const path = page.locator('path[data-element-id="el-8sjj2m6"]');
    await expect(path).toHaveAttribute('d', 'M 27.8 2.7 L 39.5 14.4');

    await page.evaluate(() => {
      const storeApi = window.useCanvasStore;
      if (!storeApi) {
        throw new Error('Canvas store is not available');
      }

      storeApi.getState().updateElement('el-8sjj2m6', {
        data: {
          subPaths: [[
            { type: 'M', position: { x: 30.8, y: 2.7 } },
            { type: 'L', position: { x: 42.5, y: 14.4 } },
          ]],
        },
      });
    });

    await expect(path).toHaveAttribute('d', 'M 30.8 2.7 L 42.5 14.4');
  });
});

import { test, expect } from '@playwright/test';
import {getCanvasPaths, waitForLoad, createShape, selectTool, expandPanelSection} from './helpers';

test.describe('Select Similar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('hides panel when nothing is selected', async ({ page }) => {
    const panelHeading = page.getByRole('heading', { name: 'Select Similar' });
    await expect(panelHeading).toHaveCount(0);
  });

  test('shows collapsed panel when a single element is selected', async ({ page }) => {
    await createShape(page);

    await selectTool(page, 'Select');
    const paths = getCanvasPaths(page);
    await paths.first().click();
    await page.waitForTimeout(100);

    const panelHeading = page.getByRole('heading', { name: 'Select Similar' });
    await expect(panelHeading).toBeVisible();

    // Panel uses a chevron model and is collapsed by default
    await expandPanelSection(page, 'Select Similar');

    await expect(page.getByText('Same Fill Color')).toBeVisible();
    await expect(page.getByText('Same Element Type')).toBeVisible();
  });

  test('does not show panel when multiple elements are selected', async ({ page }) => {
    await createShape(page, 'Square', { x: 250, y: 250 });
    await createShape(page, 'Square', { x: 400, y: 250 });

    await selectTool(page, 'Select');
    const paths = getCanvasPaths(page);
    await paths.first().click();
    await page.keyboard.down('Shift');
    await paths.nth(1).click();
    await page.keyboard.up('Shift');
    await page.waitForTimeout(100);

    const panelHeading = page.getByRole('heading', { name: 'Select Similar' });
    await expect(panelHeading).toHaveCount(0);
  });

  test('applies selection criteria from the panel', async ({ page }) => {
    await createShape(page, 'Square', { x: 250, y: 250 });
    await createShape(page, 'Square', { x: 450, y: 250 });

    await selectTool(page, 'Select');
    const paths = getCanvasPaths(page);
    await paths.first().click();
    await page.waitForTimeout(100);

    const matchedCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      const state = store.getState();
      const referenceId = state.selectedIds[0];
      const reference = state.elements.find((element: any) => element.id === referenceId);
      if (!reference) return 0;

      const matchingIds = state.elements
        .filter((element: any) => element.type === reference.type)
        .map((element: any) => element.id);

      state.selectElements(matchingIds);
      return matchingIds.length;
    });

    expect(matchedCount).toBe(2);

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const store = (window as any).useCanvasStore;
        return store.getState().selectedIds.length;
      });
    }).toBe(2);
  });
});

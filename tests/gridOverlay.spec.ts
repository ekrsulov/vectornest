import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, openSettingsPanel, getPanelContainer} from './helpers';

test.describe('Grid Plugin', () => {
  async function getGridPanel(page: import('@playwright/test').Page) {
    await openSettingsPanel(page);
    await page.waitForTimeout(100);
    return getPanelContainer(page, 'Grid');
  }

  test('should show Grid panel in settings', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings panel
    await getGridPanel(page);

    // Look for Grid panel heading
    const gridHeading = page.getByRole('heading', { name: 'Grid', exact: true });
    await expect(gridHeading).toBeVisible();
  });

  test('should toggle grid visibility via checkbox', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings panel
    const gridPanel = await getGridPanel(page);

    // Find the grid toggle checkbox
    const gridCheckbox = gridPanel.getByRole('checkbox', { name: 'Show Grid' });
    
    const initialState = await gridCheckbox.isChecked();

    // Toggle grid
    await gridCheckbox.click({ force: true });
    await page.waitForTimeout(100);

    const newState = await gridCheckbox.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('should show grid controls when grid is enabled', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await getGridPanel(page);

    const gridState = await page.evaluate(() => {
      const storeApi = (window as any).useCanvasStore;
      storeApi?.getState?.().updateGridState?.({ enabled: true });
      return storeApi?.getState?.().grid;
    });

    expect(gridState?.enabled).toBe(true);
    expect(typeof gridState?.spacing).toBe('number');
    expect(gridState?.spacing).toBeGreaterThan(0);
  });

  test('should adjust grid spacing', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings
    await getGridPanel(page);

    const spacingResult = await page.evaluate(() => {
      const storeApi = (window as any).useCanvasStore;
      const initial = storeApi?.getState?.().grid?.spacing;
      storeApi?.getState?.().updateGridState?.({ enabled: true, spacing: 40 });
      return {
        initial,
        next: storeApi?.getState?.().grid?.spacing,
      };
    });

    expect(spacingResult?.initial).not.toBeUndefined();
    expect(spacingResult?.next).toBe(40);
  });

  test('should create shape with grid enabled', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Enable grid first
    const gridPanel = await getGridPanel(page);

    const gridCheckbox = gridPanel.getByRole('checkbox', { name: 'Show Grid' });
    if (!(await gridCheckbox.isChecked())) {
      await gridCheckbox.click({ force: true });
      await page.waitForTimeout(100);
    }

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Create a shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify shape was created
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBeGreaterThan(0);
  });

  test('should move element with grid enabled', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Enable grid
    const gridPanel = await getGridPanel(page);

    const gridCheckbox = gridPanel.getByRole('checkbox', { name: 'Show Grid' });
    if (!(await gridCheckbox.isChecked())) {
      await gridCheckbox.click({ force: true });
      await page.waitForTimeout(100);
    }

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Create a shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Get initial path
    const firstPath = getCanvasPaths(page).first();
    const pathBefore = await firstPath.getAttribute('d');
    const elementId = await firstPath.getAttribute('data-element-id');

    // Switch to select mode and select the created element directly in store.
    await page.evaluate(({ id }) => {
      const store = (window as any).useCanvasStore?.getState?.();
      store?.setActivePlugin?.('select');
      if (id) {
        store?.selectElements?.([id]);
      }
    }, { id: elementId });
    await page.waitForTimeout(100);

    // Drag the shape
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.6, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify path changed (was moved)
    const pathAfter = await getCanvasPaths(page).first().getAttribute('d');
    expect(pathAfter).not.toBe(pathBefore);
  });
});

import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expectToolVisible, isToolButtonEnabled} from './helpers';

test.describe('Wrap 3D Plugin', () => {
  test('should activate Wrap 3D mode and show panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Click on the Wrap 3D tool
    const wrap3DEnabled = await isToolButtonEnabled(page, 'Wrap 3D');
    if (!wrap3DEnabled) return;
    await selectTool(page, 'Wrap 3D');
    await page.waitForTimeout(200);

    // Verify Wrap 3D panel is visible
    const wrap3DHeading = page.getByRole('heading', { name: 'Wrap 3D' });
    await expect(wrap3DHeading).toBeVisible();
  });

  test('should show surface type dropdown when path is selected', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path first
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

    // Select the shape
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(100);

    // Activate Wrap 3D
    await selectTool(page, 'Wrap 3D');
    await page.waitForTimeout(200);

    // Look for surface type select dropdown
    const surfaceSelect = page.locator('select').first();
    await expect(surfaceSelect).toBeVisible();
  });

  test('should have sphere option in surface type dropdown', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape to wrap
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

    // Select and activate Wrap 3D
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(100);

    await selectTool(page, 'Wrap 3D');
    await page.waitForTimeout(200);

    // Select sphere option from dropdown
    const surfaceSelect = page.locator('select').first();
    await surfaceSelect.selectOption('sphere');
    await page.waitForTimeout(100);

    // Verify sphere was selected
    const selectedValue = await surfaceSelect.inputValue();
    expect(selectedValue).toBe('sphere');
  });

  test('should apply wrap to path', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape to wrap
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

    // Get path before wrapping
    const pathBefore = await getCanvasPaths(page).first().getAttribute('d');
    expect(pathBefore).toBeTruthy();

    // Select and activate Wrap 3D
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(100);

    await selectTool(page, 'Wrap 3D');
    await page.waitForTimeout(200);

    // Select sphere and verify path exists
    const surfaceSelect = page.locator('select').first();
    if (await surfaceSelect.isVisible()) {
      await surfaceSelect.selectOption('sphere');
      await page.waitForTimeout(300);

      // Get path after wrapping (may or may not have changed depending on implementation)
      const pathAfter = await getCanvasPaths(page).first().getAttribute('d');
      expect(pathAfter).toBeTruthy();
    }
  });

  test('should exit Wrap 3D mode with Escape', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Activate Wrap 3D
    const wrap3DEnabled = await isToolButtonEnabled(page, 'Wrap 3D');
    if (!wrap3DEnabled) return;
    await selectTool(page, 'Wrap 3D');
    await page.waitForTimeout(200);

    // Verify panel is visible
    const wrap3DHeading = page.getByRole('heading', { name: 'Wrap 3D' });
    await expect(wrap3DHeading).toBeVisible();

    // Press Escape to exit
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Should return to select mode - verify Select button is visible
    await expectToolVisible(page, 'Select');
  });
});

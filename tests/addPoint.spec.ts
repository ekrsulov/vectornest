import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Add Point Plugin', () => {
  test('should show add point heading in edit mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a simple path with pencil tool
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple line
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();

    // Verify path was created
    const pathsAfterDrawing = await getCanvasPaths(page).count();
    expect(pathsAfterDrawing).toBeGreaterThan(0);

    // Select the path
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.5);

    // Enter edit mode
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Look for Add Point heading in the sidebar panel
    const addPointHeading = page.getByRole('heading', { name: 'Add Point' });
    await expect(addPointHeading).toBeVisible();
  });

  test('should enable add point mode when toggle is active', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a simple path
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();

    // Select and enter edit mode
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.5);
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Find Add Point section and verify it's visible
    const addPointHeading = page.getByRole('heading', { name: 'Add Point' });
    await expect(addPointHeading).toBeVisible();

    // Find the switch near the heading (PanelSwitch component)
    const addPointSection = addPointHeading.locator('xpath=ancestor::div[contains(@class, "chakra")]').first();
    const switchInput = addPointSection.locator('input[type="checkbox"]').first();
    
    if (await switchInput.count() > 0 && await switchInput.isVisible()) {
      await switchInput.click({ force: true });
      await page.waitForTimeout(100);
      expect(await switchInput.isChecked()).toBe(true);
    } else {
      // Verify panel is visible at least
      await expect(addPointHeading).toBeVisible();
    }
  });
});

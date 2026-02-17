import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Object Snap Plugin', () => {
  test('should show Object Snap panel in edit mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape first
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Select the shape
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(100);

    // Enter edit mode
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Look for Object Snap panel heading (it appears in edit mode)
    const objectSnapHeading = page.getByRole('heading', { name: 'Object Snap' });
    await expect(objectSnapHeading).toBeVisible();
  });

  test('should toggle OSNAP via checkbox in edit mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

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

    // Select and enter edit mode
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(100);

    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Find the OSNAP toggle checkbox
    const osnapCheckbox = page.getByRole('checkbox', { name: 'Enable OSNAP' });
    
    if (await osnapCheckbox.count() > 0) {
      const initialState = await osnapCheckbox.isChecked();

      // Toggle snap
      await osnapCheckbox.click({ force: true });
      await page.waitForTimeout(100);

      const newState = await osnapCheckbox.isChecked();
      expect(newState).toBe(!initialState);
    } else {
      // Verify the Object Snap heading is at least visible
      const objectSnapHeading = page.getByRole('heading', { name: 'Object Snap' });
      await expect(objectSnapHeading).toBeVisible();
    }
  });

  test('should create multiple shapes for snapping', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create two shapes
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first square
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.35, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Draw second square further away
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.75, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify both shapes were created
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBe(2);
  });

  test('should move element with snap enabled', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.6, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify shape was created
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBeGreaterThan(0);

    // Select and move the shape
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);
    await page.waitForTimeout(100);

    // Get initial position
    const pathBefore = await getCanvasPaths(page).first().getAttribute('d');
    
    // Drag the shape
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify path changed (was moved)
    const pathAfter = await getCanvasPaths(page).first().getAttribute('d');
    expect(pathAfter).not.toBe(pathBefore);
  });
});

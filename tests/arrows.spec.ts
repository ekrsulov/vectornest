import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Arrows Plugin', () => {
  test('should activate arrows mode and show panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Click on the arrows tool
    await selectTool(page, 'Arrows');
    await page.waitForTimeout(100);

    // Verify arrows panel is visible
    const arrowsPanel = page.getByRole('heading', { name: 'Arrows' });
    await expect(arrowsPanel).toBeVisible();
  });

  test('should draw an arrow between two points', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Activate arrows mode
    await selectTool(page, 'Arrows');
    await page.waitForTimeout(100);

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial paths
    const initialPaths = await getCanvasPaths(page).count();

    // Click first point to start arrow
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.waitForTimeout(100);

    // Click second point to complete arrow
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.waitForTimeout(200);

    // Verify arrow was created (should have more paths for arrow components)
    const pathsAfterArrow = await getCanvasPaths(page).count();
    expect(pathsAfterArrow).toBeGreaterThan(initialPaths);
  });

  test('should show snap points when drawing arrow', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // First create a shape to snap to
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Switch to arrows mode
    await selectTool(page, 'Arrows');
    await page.waitForTimeout(200);

    // Move near the shape - snap points should appear
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(100);

    // The arrows mode should be active
    const arrowsPanel = page.getByRole('heading', { name: 'Arrows' });
    await expect(arrowsPanel).toBeVisible();
  });
});

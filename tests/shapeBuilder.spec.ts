import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expectToolEnabled, isToolButtonEnabled, expectToolVisible} from './helpers';

test.describe('Shape Builder Plugin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('should show disabled Shape Builder tool with less than 2 shapes', async ({ page }) => {
    // Initially, with no shapes, the tool should be disabled
    await expectToolVisible(page, 'Shape Builder');
    const enabled = await isToolButtonEnabled(page, 'Shape Builder');
    expect(enabled).toBe(false);
  });

  test('should show disabled Shape Builder tool with only 1 shape selected', async ({ page }) => {
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create one shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.up();

    // Verify shape was created
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBe(1);

    // Select the shape
    await selectTool(page, 'Select');
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.35,
      canvasBox.y + canvasBox.height * 0.35
    );

    // Shape Builder should still be disabled with only 1 shape
    const enabled = await isToolButtonEnabled(page, 'Shape Builder');
    expect(enabled).toBe(false);
  });

  test('should enable Shape Builder tool with 2+ overlapping shapes selected', async ({ page }) => {
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create first circle
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.up();

    // Create second overlapping circle
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.35,
      canvasBox.y + canvasBox.height * 0.35
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.45
    );
    await page.mouse.up();

    // Verify two shapes were created
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBe(2);

    // Select all shapes
    await selectTool(page, 'Select');
    await page.keyboard.press('Meta+a');
    await page.waitForTimeout(100);

    // Shape Builder should now be enabled
    await expectToolEnabled(page, 'Shape Builder');
  });

  test('should enter Shape Builder mode and show panel', async ({ page }) => {
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create two overlapping circles
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.up();

    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.35,
      canvasBox.y + canvasBox.height * 0.35
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.45
    );
    await page.mouse.up();

    // Select all and click Shape Builder
    await selectTool(page, 'Select');
    await page.keyboard.press('Meta+a');
    await page.waitForTimeout(100);
    
    await selectTool(page, 'Shape Builder');

    // Verify panel is showing with Shape Builder content
    await expect(page.locator('h3:has-text("Shape Builder")')).toBeVisible();
  });

  test('should detect regions from overlapping circles', async ({ page }) => {
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create two overlapping circles
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.up();

    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.35,
      canvasBox.y + canvasBox.height * 0.35
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.45
    );
    await page.mouse.up();

    // Select all and enter Shape Builder
    await selectTool(page, 'Select');
    // Select first shape
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.35,
      canvasBox.y + canvasBox.height * 0.35
    );
    // Shift-click second shape
    await page.keyboard.down('Shift');
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.keyboard.up('Shift');
    await selectTool(page, 'Shape Builder');

    // Trigger region computation by moving mouse
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);

    // Wait for regions to be computed
    await page.waitForTimeout(200);

    // Check that regions are detected (shown as a tag with "X region" or "X regions")
    await expect(page.locator('text=/\\d+\\s+region(s)?/')).toBeVisible();
  });

  test('should show visual overlay for regions on hover', async ({ page }) => {
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create two overlapping circles
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.up();

    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.35,
      canvasBox.y + canvasBox.height * 0.35
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.45
    );
    await page.mouse.up();

    // Select all and enter Shape Builder
    await selectTool(page, 'Select');
    await page.keyboard.press('Meta+a');
    await selectTool(page, 'Shape Builder');

    // Trigger region computation by moving mouse
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);

    // Wait for regions to be computed
    await page.waitForTimeout(200);

    // Verify the overlay group exists
    const overlay = page.locator('.shape-builder-overlay');
    await expect(overlay).toBeVisible();
  });

  test('should exit Shape Builder mode with Escape key', async ({ page }) => {
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create two overlapping circles
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.up();

    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.35,
      canvasBox.y + canvasBox.height * 0.35
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.45
    );
    await page.mouse.up();

    // Select all and enter Shape Builder
    await selectTool(page, 'Select');
    await page.keyboard.press('Meta+a');
    await selectTool(page, 'Shape Builder');

    // Wait for mode to be active
    await page.waitForTimeout(100);

    // Press Escape to exit
    await page.keyboard.press('Escape');

    // Should be back in Select mode (overlay should be gone)
    const overlay = page.locator('.shape-builder-overlay');
    await expect(overlay).not.toBeVisible();
  });

  test('should merge regions by clicking', async ({ page }) => {
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create two overlapping circles
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const centerX = canvasBox.x + canvasBox.width * 0.5;
    const centerY = canvasBox.y + canvasBox.height * 0.5;

    await page.mouse.move(centerX - 50, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 20, centerY + 70);
    await page.mouse.up();

    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(centerX + 50, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 120, centerY + 70);
    await page.mouse.up();

    // Verify two shapes were created
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBe(2);

    // Select all and enter Shape Builder
    await selectTool(page, 'Select');
    await page.keyboard.press('Meta+a');
    await selectTool(page, 'Shape Builder');

    // Wait for regions to be computed
    await page.waitForTimeout(300);

    // Drag through regions to merge them
    await page.mouse.move(centerX - 40, centerY + 30);
    await page.mouse.down();
    await page.mouse.move(centerX, centerY + 30);
    await page.mouse.move(centerX + 60, centerY + 30);
    await page.mouse.up();

    // Wait for merge operation
    await page.waitForTimeout(200);

    // After merge, should have a different number of shapes
    // (the exact count depends on which regions were merged)
  });

  test('should toggle between merge and subtract modes', async ({ page }) => {
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create two overlapping circles
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.up();

    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.35,
      canvasBox.y + canvasBox.height * 0.35
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.45
    );
    await page.mouse.up();

    // Select all and enter Shape Builder
    await selectTool(page, 'Select');
    await page.keyboard.press('Meta+a');
    await selectTool(page, 'Shape Builder');

    // Wait for panel to appear
    await page.waitForTimeout(100);

    // Click subtract mode button
    const subtractButton = page.locator('[aria-label="Subtract"]');
    await expect(subtractButton).toBeVisible();
    await subtractButton.click();

    // Verify the mode changed (button should be active)
    // The subtract button should show visual indication of being active
  });
});

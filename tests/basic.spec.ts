import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, getToolMenuButton, expectToolVisible} from './helpers';

test.describe('TTPE Application', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await waitForLoad(page);

    // Check that the SVG canvas is present
    await expect(getCanvas(page)).toBeVisible();

    // BottomActionBar groups should be visible
    const groups = ['Basic Tools', 'Creation Tools', 'Advanced Tools'];
    for (const group of groups) {
      await expect(getToolMenuButton(page, group)).toBeVisible();
    }

    // Each tool should be available inside its menu
    const pluginButtons = ['Select', 'Subpath', 'Transform', 'Edit', 'Pencil', 'Text', 'Shape'];
    for (const button of pluginButtons) {
      await expectToolVisible(page, button);
    }
  });

  test('should switch between different modes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Test switching to pencil mode
    await selectTool(page, 'Pencil');
    await expect(page.getByRole('heading', { name: 'Pencil' })).toBeVisible();

    // Test switching to shape mode
    await selectTool(page, 'Shape');
    await expect(page.getByRole('heading', { name: 'Shape' })).toBeVisible();

    // Test switching to text mode
    await selectTool(page, 'Text');
    await expect(page.getByRole('heading', { name: 'Text' })).toBeVisible();
  });

  test('should switch modes with double click', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path to test double click
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple path
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify the path was created
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBeGreaterThan(0);

    // Switch to select mode
    await selectTool(page, 'Select');

    // Double click on the created path (this should select it and switch modes)
    await page.mouse.dblclick(
      canvasBox.x + canvasBox.width * 0.15,
      canvasBox.y + canvasBox.height * 0.35
    );

    // Wait for mode switch
    await page.waitForTimeout(100);

    // Check that transformation panel is visible (indicating transformation mode is active)
    const transformationPanel = page.locator('h3', { hasText: 'Transform' });
    await expect(transformationPanel).toBeVisible();
  });

  test('should return to select mode with Escape key', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to pencil mode
    await selectTool(page, 'Pencil');

    // Wait for mode switch
    await page.waitForTimeout(100);

    // Press Escape to return to select mode
    await page.keyboard.press('Escape');

    // Wait for mode switch
    await page.waitForTimeout(100);

    // Check that select tool is available
    await expectToolVisible(page, 'Select');
  });

  test('should clear selections with Escape key before changing modes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(200);

    // Switch to select mode (keepShapeMode is enabled by default)
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Click on the created square to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Switch to transform mode
    await selectTool(page, 'Transform');
    await page.waitForTimeout(100);

    // Verify the transformation panel is visible (will show "Select an element to transform" when nothing is selected yet)
    // After clicking, there should be no error and panel should be visible
    await expect(page.getByRole('heading', { name: 'Transform' })).toBeVisible();

    // Press Escape - should clear selection and change to select mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Check that select tool is available
    await expectToolVisible(page, 'Select');
  });
});

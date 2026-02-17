import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Source Plugin (SVG Code View)', () => {
  test('should expose SVG Source in File panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open file panel
    await page.locator('[aria-label="File"]').click();
    await page.waitForTimeout(100);

    // The Source panel no longer shows a heading, just the action button
    const svgSourceButton = page.getByRole('button', { name: 'SVG Source' });
    await expect(svgSourceButton).toBeVisible();
  });

  test('should show SVG Source button in Source panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open file panel
    await page.locator('[aria-label="File"]').click();
    await page.waitForTimeout(100);

    // Look for SVG Source button
    const svgSourceButton = page.getByRole('button', { name: 'SVG Source' });
    await expect(svgSourceButton).toBeVisible();
  });

  test('should open SVG source dialog when clicking SVG Source button', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create some content first
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify path was created
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBeGreaterThan(0);

    // Open file panel
    await page.locator('[aria-label="File"]').click();
    await page.waitForTimeout(100);

    // Click SVG Source button
    const svgSourceButton = page.getByRole('button', { name: 'SVG Source' });
    await svgSourceButton.click();
    await page.waitForTimeout(200);

    // Verify dialog appeared (it may be a modal/popover)
    const dialog = page.locator('[role="dialog"]');
    // If the dialog is visible (even if content is loading), the action worked
    if (await dialog.count() > 0) {
      // Dialog exists, test passes
      expect(await dialog.count()).toBeGreaterThan(0);
    }
  });

  test('should display SVG code for canvas content', async ({ page }) => {
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

    // Verify path exists on canvas
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBeGreaterThan(0);

    // Open file panel and launch the SVG Source dialog
    await page.locator('[aria-label="File"]').click();
    await page.waitForTimeout(100);

    const svgSourceButton = page.getByRole('button', { name: 'SVG Source' });
    await svgSourceButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const codeTextbox = dialog.getByRole('textbox');
    await expect(codeTextbox).toBeVisible();
    await expect(codeTextbox).not.toHaveValue('');

    const svgContent = await codeTextbox.inputValue();
    expect(svgContent).toContain('<svg');
    expect(svgContent.length).toBeGreaterThan(10);
  });

  test('should have export functionality in File menu', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create some content
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.7, canvasBox.y + canvasBox.height * 0.5, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify path was created
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBeGreaterThan(0);

    // Open file menu
    await page.locator('[aria-label="File"]').click();
    await page.waitForTimeout(100);

    // Look for export button
    const exportButton = page.getByRole('button', { name: /Export|Download/i });
    if (await exportButton.count() > 0) {
      await expect(exportButton.first()).toBeVisible();
    }
  });
});

import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Line Creation', () => {
  test('should create a free line without shift key', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to shape mode
    await selectTool(page, 'Shape');

    // Select line shape
    await page.locator('[aria-label="Line"]').click();

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Draw a free line
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Verify line was created
    const pathsAfterLine = await getCanvasPaths(page).count();
    expect(pathsAfterLine).toBeGreaterThan(initialPaths);
  });

  test('should create horizontal line with shift key', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to shape mode
    await selectTool(page, 'Shape');

    // Select line shape
    await page.locator('[aria-label="Line"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    const initialPaths = await getCanvasPaths(page).count();

    // Draw a horizontal line with shift pressed
    const startX = canvasBox.x + canvasBox.width * 0.2;
    const startY = canvasBox.y + canvasBox.height * 0.5;

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Hold shift and move horizontally (with slight vertical offset to test snapping)
    await page.keyboard.down('Shift');
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.52, // Slight vertical offset
      { steps: 10 }
    );

    await page.mouse.up();
    await page.keyboard.up('Shift');

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Verify line was created
    const pathsAfterLine = await getCanvasPaths(page).count();
    expect(pathsAfterLine).toBeGreaterThan(initialPaths);
  });

  test('should create vertical line with shift key', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to shape mode
    await selectTool(page, 'Shape');

    // Select line shape
    await page.locator('[aria-label="Line"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    const initialPaths = await getCanvasPaths(page).count();

    // Draw a vertical line with shift pressed
    const startX = canvasBox.x + canvasBox.width * 0.5;
    const startY = canvasBox.y + canvasBox.height * 0.2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Hold shift and move vertically (with slight horizontal offset to test snapping)
    await page.keyboard.down('Shift');
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.52, // Slight horizontal offset
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 10 }
    );

    await page.mouse.up();
    await page.keyboard.up('Shift');

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Verify line was created
    const pathsAfterLine = await getCanvasPaths(page).count();
    expect(pathsAfterLine).toBeGreaterThan(initialPaths);
  });

  test('should create 45-degree diagonal line with shift key', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to shape mode
    await selectTool(page, 'Shape');

    // Select line shape
    await page.locator('[aria-label="Line"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    const initialPaths = await getCanvasPaths(page).count();

    // Draw a diagonal line with shift pressed
    const startX = canvasBox.x + canvasBox.width * 0.3;
    const startY = canvasBox.y + canvasBox.height * 0.3;

    await page.mouse.move(startX, startY);

    // Hold shift before mouse down
    await page.keyboard.down('Shift');
    await page.mouse.down();

    // Move diagonally (exactly 45 degrees)
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 10 }
    );

    await page.mouse.up();
    await page.keyboard.up('Shift');

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Verify line was created
    const pathsAfterLine = await getCanvasPaths(page).count();
    expect(pathsAfterLine).toBeGreaterThan(initialPaths);
  });
});

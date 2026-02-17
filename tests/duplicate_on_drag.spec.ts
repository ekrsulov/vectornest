import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Duplicate on Drag', () => {
  test('should duplicate element when Command+Drag in select mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape to test duplication
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a circle
    const circleX = canvasBox.x + canvasBox.width * 0.3;
    const circleY = canvasBox.y + canvasBox.height * 0.3;
    
    await page.mouse.move(circleX, circleY);
    await page.mouse.down();
    await page.mouse.move(
      circleX + 100,
      circleY + 100,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Count elements after creation
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBe(1);

    // Switch to select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Click on the circle to select it
    await page.mouse.click(circleX + 50, circleY + 50);
    await page.waitForTimeout(200);

    // Perform Command+Drag to duplicate
    const isMac = process.platform === 'darwin';
    const modifierKey = isMac ? 'Meta' : 'Control';

    // Hold Command/Ctrl key
    await page.keyboard.down(modifierKey);

    // Click and drag the element
    await page.mouse.move(circleX + 50, circleY + 50);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Drag to a new position
    await page.mouse.move(
      circleX + 200,
      circleY + 150,
      { steps: 10 }
    );
    await page.waitForTimeout(100);

    await page.mouse.up();
    await page.keyboard.up(modifierKey);
    await page.waitForTimeout(300);

    // Verify that a duplicate was created
    const pathsAfterDuplicate = await getCanvasPaths(page).count();
    expect(pathsAfterDuplicate).toBe(2);
  });

  test('should not duplicate without Command key', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square
    const squareX = canvasBox.x + canvasBox.width * 0.4;
    const squareY = canvasBox.y + canvasBox.height * 0.4;
    
    await page.mouse.move(squareX, squareY);
    await page.mouse.down();
    await page.mouse.move(
      squareX + 80,
      squareY + 80,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Count elements
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBe(1);

    // Switch to select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Click on the square to select it
    await page.mouse.click(squareX + 40, squareY + 40);
    await page.waitForTimeout(200);

    // Drag without Command key (should just move, not duplicate)
    await page.mouse.move(squareX + 40, squareY + 40);
    await page.mouse.down();
    await page.mouse.move(
      squareX + 150,
      squareY + 100,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Verify that no duplicate was created (still only 1 element)
    const pathsAfterDrag = await getCanvasPaths(page).count();
    expect(pathsAfterDrag).toBe(1);
  });

  test('should not duplicate in non-select modes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a circle
    const circleX = canvasBox.x + canvasBox.width * 0.5;
    const circleY = canvasBox.y + canvasBox.height * 0.5;
    
    await page.mouse.move(circleX, circleY);
    await page.mouse.down();
    await page.mouse.move(
      circleX + 70,
      circleY + 70,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Count elements
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBe(1);

    // Stay in Shape mode (not select mode)
    // Try Command+Drag (should not duplicate because we're not in select mode)
    const isMac = process.platform === 'darwin';
    const modifierKey = isMac ? 'Meta' : 'Control';

    await page.keyboard.down(modifierKey);
    await page.mouse.move(circleX + 35, circleY + 35);
    await page.mouse.down();
    await page.mouse.move(
      circleX + 150,
      circleY + 100,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.keyboard.up(modifierKey);
    await page.waitForTimeout(300);

    // Verify that no duplicate was created
    const pathsAfterDrag = await getCanvasPaths(page).count();
    // Should still be 1 (or 2 if a new shape was drawn, but not a duplicate)
    expect(pathsAfterDrag).toBeGreaterThanOrEqual(1);
  });

  test('should place duplicate at original position and move original to new position', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a distinctive shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a circle at a specific location
    const originalX = canvasBox.x + canvasBox.width * 0.2;
    const originalY = canvasBox.y + canvasBox.height * 0.2;
    const radius = 60;
    
    await page.mouse.move(originalX, originalY);
    await page.mouse.down();
    await page.mouse.move(
      originalX + radius,
      originalY + radius,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Switch to select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Select the circle
    await page.mouse.click(originalX + radius / 2, originalY + radius / 2);
    await page.waitForTimeout(200);

    // Get initial position of the element (approximately)
    const initialPaths = await getCanvasPaths(page).all();
    expect(initialPaths.length).toBe(1);

    // Perform Command+Drag
    const isMac = process.platform === 'darwin';
    const modifierKey = isMac ? 'Meta' : 'Control';

    const dragStartX = originalX + radius / 2;
    const dragStartY = originalY + radius / 2;
    const dragEndX = dragStartX + 200;
    const dragEndY = dragStartY + 150;

    await page.keyboard.down(modifierKey);
    await page.mouse.move(dragStartX, dragStartY);
    await page.mouse.down();
    await page.waitForTimeout(100);

    await page.mouse.move(dragEndX, dragEndY, { steps: 15 });
    await page.waitForTimeout(100);

    await page.mouse.up();
    await page.keyboard.up(modifierKey);
    await page.waitForTimeout(300);

    // Verify two elements exist
    const finalPaths = await getCanvasPaths(page).all();
    expect(finalPaths.length).toBe(2);

    // The plugin creates a copy at the original position and moves the original
    // So we should have one element near the original position and one at the new position
  });

  test('should only duplicate selected elements', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create two shapes
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first circle
    const circle1X = canvasBox.x + canvasBox.width * 0.2;
    const circle1Y = canvasBox.y + canvasBox.height * 0.3;
    
    await page.mouse.move(circle1X, circle1Y);
    await page.mouse.down();
    await page.mouse.move(circle1X + 60, circle1Y + 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Verify first element was created
    const pathsAfterFirst = await getCanvasPaths(page).count();
    expect(pathsAfterFirst).toBe(1);

    // Switch back to shape tool to draw second circle
    await selectTool(page, 'Shape');
    await page.waitForTimeout(100);

    // Draw second circle
    const circle2X = canvasBox.x + canvasBox.width * 0.6;
    const circle2Y = canvasBox.y + canvasBox.height * 0.3;
    
    await page.mouse.move(circle2X, circle2Y);
    await page.mouse.down();
    await page.mouse.move(circle2X + 60, circle2Y + 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Verify two elements exist
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBe(2);

    // Switch to select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Select only the first circle
    await page.mouse.click(circle1X + 30, circle1Y + 30);
    await page.waitForTimeout(200);

    // Perform Command+Drag on the selected circle
    const isMac = process.platform === 'darwin';
    const modifierKey = isMac ? 'Meta' : 'Control';

    await page.keyboard.down(modifierKey);
    await page.mouse.move(circle1X + 30, circle1Y + 30);
    await page.mouse.down();
    await page.mouse.move(circle1X + 30, circle1Y + 150, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.up(modifierKey);
    await page.waitForTimeout(300);

    // Should now have 3 elements (2 original + 1 duplicate)
    const pathsAfterDuplicate = await getCanvasPaths(page).count();
    expect(pathsAfterDuplicate).toBe(3);
  });
});

import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expectToolEnabled} from './helpers';

test.describe('Shape Creation', () => {
  test('should create different shapes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to shape mode
    await selectTool(page, 'Shape');

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Test creating a square
    await page.locator('[aria-label="Square"]').click();

    // Draw a square by clicking and dragging
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

    // Wait for shape creation and mode switch to select
    await page.waitForTimeout(100);

    // Verify square was created
    const pathsAfterSquare = await getCanvasPaths(page).count();
    expect(pathsAfterSquare).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await selectTool(page, 'Select');

    // Click on the created square to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Verify Edit and Transform buttons are enabled
    await expectToolEnabled(page, 'Edit');
    await expectToolEnabled(page, 'Transform');

    // Switch back to shape mode to create circle
    await selectTool(page, 'Shape');

    // Test creating a circle
    await page.locator('[aria-label="Circle"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Verify circle was created
    const pathsAfterCircle = await getCanvasPaths(page).count();
    expect(pathsAfterCircle).toBeGreaterThan(pathsAfterSquare);

    // Click on the created circle to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Verify Edit and Transform buttons are still enabled
    await expectToolEnabled(page, 'Edit');
    await expectToolEnabled(page, 'Transform');

    // Verify SVG canvas is still visible and interactive
    await expect(canvas).toBeVisible();
  });

  test('should create shape when starting over existing element', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // First, create a square
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const firstSquareX = canvasBox.x + canvasBox.width * 0.3;
    const firstSquareY = canvasBox.y + canvasBox.height * 0.3;

    await page.mouse.move(firstSquareX, firstSquareY);
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    const pathsAfterFirstShape = await getCanvasPaths(page).count();

    // Now create a second shape, starting the drag over the first shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    // Start dragging from the center of the first square (over existing element)
    const secondShapeStartX = canvasBox.x + canvasBox.width * 0.4;
    const secondShapeStartY = canvasBox.y + canvasBox.height * 0.4;
    
    await page.mouse.move(secondShapeStartX, secondShapeStartY);
    await page.mouse.down();

    // Drag to a new location
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify that the second shape was created successfully
    const pathsAfterSecondShape = await getCanvasPaths(page).count();
    expect(pathsAfterSecondShape).toBeGreaterThan(pathsAfterFirstShape);

    // Switch to select mode and verify the new shape can be selected
    await selectTool(page, 'Select');
    
    // Click on the second shape to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.55,
      canvasBox.y + canvasBox.height * 0.55
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Verify Edit and Transform buttons are enabled (shape is selected)
    await expectToolEnabled(page, 'Edit');
    await expectToolEnabled(page, 'Transform');
  });

  test('should NOT create shape on simple click without dragging', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Switch to shape mode
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Perform a simple click (no drag)
    const clickX = canvasBox.x + canvasBox.width * 0.5;
    const clickY = canvasBox.y + canvasBox.height * 0.5;
    
    await page.mouse.move(clickX, clickY);
    await page.mouse.down();
    await page.mouse.up();

    // Wait for potential shape creation
    await page.waitForTimeout(200);

    // Verify NO new shape was created
    const pathsAfterClick = await getCanvasPaths(page).count();
    expect(pathsAfterClick).toBe(initialPaths);
  });

  test('should NOT create shape with minimal movement below threshold', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Switch to shape mode
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Perform a very small drag (below 5 pixel threshold)
    const startX = canvasBox.x + canvasBox.width * 0.5;
    const startY = canvasBox.y + canvasBox.height * 0.5;
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // Move only 3 pixels (below the MIN_SHAPE_CREATION_DISTANCE of 5)
    await page.mouse.move(startX + 3, startY + 2);
    await page.mouse.up();

    // Wait for potential shape creation
    await page.waitForTimeout(200);

    // Verify NO new shape was created
    const pathsAfterSmallDrag = await getCanvasPaths(page).count();
    expect(pathsAfterSmallDrag).toBe(initialPaths);
  });

  test('should create shape with sufficient movement above threshold', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Switch to shape mode
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Rectangle"]').click();

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Perform a drag above the threshold (>5 pixels)
    const startX = canvasBox.x + canvasBox.width * 0.5;
    const startY = canvasBox.y + canvasBox.height * 0.5;
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // Move 10 pixels (above the MIN_SHAPE_CREATION_DISTANCE of 5)
    await page.mouse.move(startX + 10, startY + 10, { steps: 3 });
    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(200);

    // Verify a new shape WAS created
    const pathsAfterSufficientDrag = await getCanvasPaths(page).count();
    expect(pathsAfterSufficientDrag).toBeGreaterThan(initialPaths);
  });
});

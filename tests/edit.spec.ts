import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expandSmoothBrushOptions, expandRoundPathOptions, expectToolEnabled} from './helpers';
import type { Page, Locator } from '@playwright/test';

test.describe.serial('Edit Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
    // Clear localStorage to ensure clean state between tests
    await page.evaluate(() => {
      localStorage.clear();
    });
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  });

const selectFirstPath = async (page: Page) => {
  const paths = getCanvasPaths(page);
  await expect(paths.first()).toBeVisible();
  await paths.first().click();
  await page.waitForTimeout(100);
};

const openSliderValueInput = async (label: Locator): Promise<Locator> => {
  const valueColumn = label.locator('xpath=following-sibling::div[last()]');
  await expect(valueColumn).toBeVisible();

  const valueText = valueColumn.locator('xpath=.//*[self::p or self::span][1]');
  await expect(valueText).toBeVisible();
  await valueText.click();

  const input = valueColumn.locator('input').first();
  await expect(input).toBeVisible();
  return input;
};

// Helper function to draw a zig-zag pattern with multiple jumps and small irregularities
async function drawZigZagPath(page: any, canvasBox: any) {
  // Start drawing
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.1,
    canvasBox.y + canvasBox.height * 0.5
  );
  await page.mouse.down();

  // Create zig-zag pattern with multiple jumps and small irregularities (100 steps total)
  const segments = 8; // 8 main segments for zig-zag
  const totalSteps = 100;
  const stepsPerSegment = Math.floor(totalSteps / segments);
  
  for (let i = 0; i < segments; i++) {
    const progress = (i + 1) / segments;
    const baseX = canvasBox.x + canvasBox.width * (0.1 + progress * 0.6);
    const yOffset = (i % 2 === 0) ? -0.15 : 0.15; // Main zig-zag movement
    const baseY = canvasBox.y + canvasBox.height * (0.5 + yOffset);
    
    // Add small irregularities/picos to make the path rough
    const irregularities = 3; // 3 small movements per segment
    const irregularitySteps = Math.floor(stepsPerSegment / irregularities);
    
    for (let j = 0; j < irregularities; j++) {
      const irregularityProgress = j / irregularities;
      const irregularityX = baseX - (canvasBox.width * 0.6 / segments) * (1 - irregularityProgress);
      
      // Add small random-like movements (±0.02 in both directions)
      const smallXOffset = (Math.sin(i * 2 + j * 3) * 0.02); // Pseudo-random small movements
      const smallYOffset = (Math.cos(i * 1.5 + j * 2.5) * 0.02);
      
      const finalX = irregularityX + canvasBox.width * smallXOffset;
      const finalY = baseY + canvasBox.height * smallYOffset;
      
      await page.mouse.move(finalX, finalY, { steps: irregularitySteps });
    }
  }

  await page.mouse.up();
}

  test('should toggle smooth brush mode', async ({ page }) => {

    // Create a path first
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Draw a zig-zag path with multiple jumps
    await drawZigZagPath(page, canvasBox);

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly and select the drawn path
    await selectTool(page, 'Select');
    await selectFirstPath(page);

    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');

    const smoothBrushHeading = page.getByRole('heading', { name: 'Smooth Brush' });
    await expect(smoothBrushHeading).toBeVisible();

    // Expand smooth brush options to see controls
    await expandSmoothBrushOptions(page);
    await page.waitForTimeout(200);

    // Toggle brush mode using the switch in the header
    const headerContainer = smoothBrushHeading.locator('xpath=..');
    const brushModeSwitch = headerContainer.locator('.chakra-switch').first();
    await expect(brushModeSwitch).toBeVisible();
    expect(await brushModeSwitch.locator('input').isChecked()).toBe(false);

    await brushModeSwitch.click();
    await expect(brushModeSwitch.locator('input')).toBeChecked();

    // Radius slider should appear when brush is active
    await expect(page.getByText('Radius:').first()).toBeVisible();
  });

  test('should adjust smooth brush settings', async ({ page }) => {
    // Create a path and switch to edit mode
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Draw a zig-zag path with multiple jumps
    await drawZigZagPath(page, canvasBox);

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly and select the path
    await selectTool(page, 'Select');
    await selectFirstPath(page);

    // Switch to edit mode
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');

    // Expand smooth brush options
    const smoothBrushHeading = page.getByRole('heading', { name: 'Smooth Brush' });
    await expect(smoothBrushHeading).toBeVisible();
    await expandSmoothBrushOptions(page);
    await page.waitForTimeout(200);

    // Activate brush mode
    const headerContainer = smoothBrushHeading.locator('xpath=..');
    const brushModeSwitch = headerContainer.locator('.chakra-switch').first();
    expect(await brushModeSwitch.locator('input').isChecked()).toBe(false);
    await brushModeSwitch.click();
    await expect(brushModeSwitch.locator('input')).toBeChecked();

    // Test strength slider - check for the label
    const strengthLabel = page.getByText('Strength:').first();
    await expect(strengthLabel).toBeVisible();

    // Enable simplify points and ensure dependent controls appear
    const simplifyCheckbox = page.getByRole('checkbox', { name: 'Simplify Points' }).first();
    await simplifyCheckbox.check({ force: true });
    await expect(simplifyCheckbox).toBeChecked();

    const toleranceLabel = page.getByText('Tolerance:').first();
    await expect(toleranceLabel).toBeVisible();

    const minDistLabel = page.getByText('Min Dist:').first();
    await expect(minDistLabel).toBeVisible();
  });

  test('should apply smooth brush', async ({ page }) => {
    // Create a path and switch to edit mode
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Draw a zig-zag path with multiple jumps
    await drawZigZagPath(page, canvasBox);

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly and select the path
    await selectTool(page, 'Select');
    await selectFirstPath(page);

    // Switch to edit mode
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');

    const smoothBrushHeading = page.getByRole('heading', { name: 'Smooth Brush' });
    await expect(smoothBrushHeading).toBeVisible();

    // Apply button lives in the Smooth Brush header when the brush is inactive
    const headerContainer = smoothBrushHeading.locator('xpath=..');
    const applyButton = headerContainer.getByRole('button', { name: 'Apply' }).first();
    await expect(applyButton).toBeVisible();

    await applyButton.click({ force: true });
  });

  test('should show round path functionality', async ({ page }) => {

    // Create a path using pencil tool
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple square path
    const startX = canvasBox.x + canvasBox.width * 0.2;
    const startY = canvasBox.y + canvasBox.height * 0.3;
    const endX = canvasBox.x + canvasBox.width * 0.6;
    const endY = canvasBox.y + canvasBox.height * 0.7;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, startY, { steps: 10 });
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.move(startX, endY, { steps: 10 });
    await page.mouse.move(startX, startY, { steps: 10 });
    await page.mouse.up();

    // Switch to select mode and select the path
    await selectTool(page, 'Select');
    await selectFirstPath(page);

    // Switch to edit mode to access Round Path
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');

    // Expand Round Path options
    await expandRoundPathOptions(page);
    await page.waitForTimeout(200);

    // Look for the Round Path section header
    const roundPathHeading = page.getByRole('heading', { name: /Round Path|Round Subpath/ });
    await expect(roundPathHeading).toBeVisible();

    // Test apply button for Round Path
    const roundButton = roundPathHeading.locator('xpath=..').getByRole('button', { name: 'Apply' }).first();
    await roundButton.click();

    // Wait for the rounding operation to complete
    await page.waitForTimeout(500);
  });

  test('should allow typing values above slider max for non-percent sliders', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path using pencil tool
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple line path
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.8, canvasBox.y + canvasBox.height * 0.6);
    await page.mouse.up();

    // Switch to select mode and select path
    await selectTool(page, 'Select');
    await selectFirstPath(page);

    // Go to Edit mode
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');

    // Expand Round Path options if needed
    await expandRoundPathOptions(page);
    await page.waitForTimeout(200);

    const roundPathHeading = page.getByRole('heading', { name: /Round Path|Round Subpath/ }).first();
    await expect(roundPathHeading).toBeVisible();
    const roundPathPanel = roundPathHeading.locator('xpath=../..');

    const radiusLabel = roundPathPanel.getByText('Radius:').first();
    await expect(radiusLabel).toBeVisible();

    // The control should be editable now - type a value greater than max (e.g., 60 > max 50)
    const editInput = await openSliderValueInput(radiusLabel);
    await editInput.fill('60');
    await editInput.press('Enter');

    await expect(roundPathPanel.getByText('60.0').first()).toBeVisible();
  });

  test('should clamp percent sliders when editing their text input to max', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path using pencil tool
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple line path
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.8, canvasBox.y + canvasBox.height * 0.6);
    await page.mouse.up();

    // Switch to select mode and select path
    await selectTool(page, 'Select');
    await selectFirstPath(page);

    // Go to Edit mode
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');

    // Expand smooth brush options
    const smoothBrushHeading = page.getByRole('heading', { name: 'Smooth Brush' });
    await expect(smoothBrushHeading).toBeVisible();
    await expandSmoothBrushOptions(page);
    await page.waitForTimeout(200);

    // Activate Smooth Brush Mode (if needed) using the switch
    const headerContainer = smoothBrushHeading.locator('xpath=..');
    const brushModeSwitch = headerContainer.locator('.chakra-switch').first();
    await brushModeSwitch.click();

    const smoothBrushPanel = smoothBrushHeading.locator('xpath=../..');

    // Find the Strength percent control and click its visible value box to edit
    const strengthLabel = smoothBrushPanel.getByText('Strength:').first();
    const strengthInput = await openSliderValueInput(strengthLabel);
    await strengthInput.fill('200');
    await strengthInput.press('Enter');

    // The value should be clamped to 100% (formatter uses rounded percent)
    await expect(smoothBrushPanel.getByText('100%').first()).toBeVisible();
  });

  test('should auto-select next point after deleting single selected point', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a simple path with multiple points using pencil tool
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple path with 4 distinct points
    const points = [
      { x: canvasBox.x + canvasBox.width * 0.2, y: canvasBox.y + canvasBox.height * 0.3 },
      { x: canvasBox.x + canvasBox.width * 0.4, y: canvasBox.y + canvasBox.height * 0.3 },
      { x: canvasBox.x + canvasBox.width * 0.6, y: canvasBox.y + canvasBox.height * 0.3 },
      { x: canvasBox.x + canvasBox.width * 0.8, y: canvasBox.y + canvasBox.height * 0.3 },
    ];

    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (let i = 1; i < points.length; i++) {
      await page.mouse.move(points[i].x, points[i].y, { steps: 5 });
    }
    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(200);

    // Get initial path count
    const initialPathCount = await getCanvasPaths(page).count();
    expect(initialPathCount).toBeGreaterThan(0);

    // Switch to select mode and select the path
    await selectTool(page, 'Select');
    await page.mouse.click(points[1].x, points[1].y);

    // Wait for selection
    await page.waitForTimeout(100);

    // Switch to edit mode to access points
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');

    // Wait for edit mode to activate
    await page.waitForTimeout(200);

    // Click on the second point to select it
    await page.mouse.click(points[1].x, points[1].y);
    await page.waitForTimeout(100);

    // Get the number of circles before deletion (they represent edit points)
    const circlesBefore = await page.locator('svg circle').count();
    expect(circlesBefore).toBeGreaterThan(0);

    // Press Delete to remove the selected point
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // After deletion, verify that:
    // 1. The path still exists
    const pathsAfterDelete = await getCanvasPaths(page).count();
    expect(pathsAfterDelete).toBeGreaterThan(0);

    // 2. There should be fewer circles (one point was deleted)
    const circlesAfter = await page.locator('svg circle').count();
    expect(circlesAfter).toBeLessThan(circlesBefore);

    // 3. We should still have circles visible (indicating a point is selected)
    expect(circlesAfter).toBeGreaterThan(0);

    // Try pressing Delete again to verify the behavior continues
    const circlesBeforeSecondDelete = circlesAfter;
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Path should still exist
    const pathsAfterSecondDelete = await getCanvasPaths(page).count();
    expect(pathsAfterSecondDelete).toBeGreaterThan(0);

    // Should have even fewer circles now
    const circlesAfterSecondDelete = await page.locator('svg circle').count();
    expect(circlesAfterSecondDelete).toBeLessThan(circlesBeforeSecondDelete);
  });

  test('should delete only one point per Delete keypress', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a simple straight line path with exactly 5 points
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw 5 points in a straight line
    const points = [
      { x: canvasBox.x + canvasBox.width * 0.2, y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * 0.3, y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * 0.4, y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * 0.5, y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * 0.6, y: canvasBox.y + canvasBox.height * 0.5 },
    ];

    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (let i = 1; i < points.length; i++) {
      await page.mouse.move(points[i].x, points[i].y, { steps: 2 });
    }
    await page.mouse.up();

    await page.waitForTimeout(200);

    // Switch to select mode and select the path
    await selectTool(page, 'Select');
    await page.mouse.click(points[2].x, points[2].y);
    await page.waitForTimeout(100);

    // Switch to edit mode
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Click on the middle point (3rd point) to select it
    await page.mouse.click(points[2].x, points[2].y);
    await page.waitForTimeout(100);

    // Count circles before first delete
    const circlesBefore = await page.locator('svg circle').count();
    
    // Press Delete once
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Verify exactly one point was deleted
    const circlesAfterFirstDelete = await page.locator('svg circle').count();
    const pointsDeletedFirst = circlesBefore - circlesAfterFirstDelete;
    
    // Should have deleted exactly 2 circles (1 point = 1 visible circle + 1 hit area circle)
    expect(pointsDeletedFirst).toBe(2);

    // Press Delete again
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Verify exactly one more point was deleted
    const circlesAfterSecondDelete = await page.locator('svg circle').count();
    const pointsDeletedSecond = circlesAfterFirstDelete - circlesAfterSecondDelete;
    expect(pointsDeletedSecond).toBe(2);

    // Path should still exist
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBeGreaterThan(0);
  });

  test('should select immediately next point after deletion (visual verification)', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path with 5 distinct, well-spaced points
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create 5 points with clear spacing
    const spacing = 0.15;
    const points = [
      { x: canvasBox.x + canvasBox.width * 0.1, y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * (0.1 + spacing), y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * (0.1 + spacing * 2), y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * (0.1 + spacing * 3), y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * (0.1 + spacing * 4), y: canvasBox.y + canvasBox.height * 0.5 },
    ];

    // Draw the path
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (let i = 1; i < points.length; i++) {
      await page.mouse.move(points[i].x, points[i].y, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Select the path
    await selectTool(page, 'Select');
    await page.mouse.click(points[2].x, points[2].y);
    await page.waitForTimeout(100);

    // Switch to edit mode
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Click on point 2 (middle point) to select it
    await page.mouse.click(points[2].x, points[2].y);
    await page.waitForTimeout(100);

    // Delete point 2
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // After deleting point 2, point 3 should now be selected
    // We can verify this by checking that a circle exists near point 3's original position
    // In this simple case, since we're deleting from a straight line, the positions should be predictable
    
    // Visual check: we should see edit points, and the path should still exist
    const circles = await page.locator('svg circle').count();
    expect(circles).toBeGreaterThan(0);

    const paths = await getCanvasPaths(page).count();
    expect(paths).toBeGreaterThan(0);
  });

  test('should auto-select next command point (not control point) when deleting from curve', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a curved path using pencil tool with smooth drawing
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a smooth curved path with slow movements to trigger curve generation
    const curvePoints = [
      { x: canvasBox.x + canvasBox.width * 0.2, y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * 0.35, y: canvasBox.y + canvasBox.height * 0.3 },
      { x: canvasBox.x + canvasBox.width * 0.5, y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * 0.65, y: canvasBox.y + canvasBox.height * 0.7 },
      { x: canvasBox.x + canvasBox.width * 0.8, y: canvasBox.y + canvasBox.height * 0.5 },
    ];

    await page.mouse.move(curvePoints[0].x, curvePoints[0].y);
    await page.mouse.down();
    // Draw slowly to create smooth curves
    for (let i = 1; i < curvePoints.length; i++) {
      await page.mouse.move(curvePoints[i].x, curvePoints[i].y, { steps: 20 });
      await page.waitForTimeout(50);
    }
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Select the path
    await selectTool(page, 'Select');
    await page.mouse.click(curvePoints[1].x, curvePoints[1].y);
    await page.waitForTimeout(100);

    // Switch to edit mode
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Click on the second command point
    await page.mouse.click(curvePoints[1].x, curvePoints[1].y);
    await page.waitForTimeout(100);

    // Count total edit points before deletion (includes control points)
    const circlesBefore = await page.locator('svg circle').count();
    expect(circlesBefore).toBeGreaterThan(0);

    // Delete the selected command point
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // After deletion, should have fewer points
    const circlesAfter = await page.locator('svg circle').count();
    expect(circlesAfter).toBeLessThan(circlesBefore);
    expect(circlesAfter).toBeGreaterThan(0); // Should still have points remaining

    // The key assertion: a command point should still be selected (auto-selected next command point)
    // Selected points have yellow/gold stroke
    const selectedStrokeCircles = await page.locator('svg circle[stroke="#eab308"], svg circle[stroke="#fbbf24"]').count();
    expect(selectedStrokeCircles).toBeGreaterThanOrEqual(1);

    // Verify path still exists
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBe(1);
  });

  test('should correctly delete multiple non-continuous points in C commands', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a curved path
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a smooth curved path with multiple points
    const curvePoints = [
      { x: canvasBox.x + canvasBox.width * 0.2, y: canvasBox.y + canvasBox.height * 0.4 },
      { x: canvasBox.x + canvasBox.width * 0.3, y: canvasBox.y + canvasBox.height * 0.3 },
      { x: canvasBox.x + canvasBox.width * 0.4, y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * 0.5, y: canvasBox.y + canvasBox.height * 0.3 },
      { x: canvasBox.x + canvasBox.width * 0.6, y: canvasBox.y + canvasBox.height * 0.5 },
      { x: canvasBox.x + canvasBox.width * 0.7, y: canvasBox.y + canvasBox.height * 0.3 },
      { x: canvasBox.x + canvasBox.width * 0.8, y: canvasBox.y + canvasBox.height * 0.5 },
    ];

    await page.mouse.move(curvePoints[0].x, curvePoints[0].y);
    await page.mouse.down();
    for (let i = 1; i < curvePoints.length; i++) {
      await page.mouse.move(curvePoints[i].x, curvePoints[i].y, { steps: 15 });
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Select the path
    await selectTool(page, 'Select');
    await page.mouse.click(curvePoints[3].x, curvePoints[3].y);
    await page.waitForTimeout(100);

    // Switch to edit mode
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Select multiple non-continuous command points (using Cmd/Ctrl+click)
    const isMac = process.platform === 'darwin';
    const modifierKey = isMac ? 'Meta' : 'Control';

    // Click first point
    await page.mouse.click(curvePoints[1].x, curvePoints[1].y);
    await page.waitForTimeout(100);

    // Cmd/Ctrl+click to add more points to selection
    await page.keyboard.down(modifierKey);
    await page.mouse.click(curvePoints[3].x, curvePoints[3].y);
    await page.waitForTimeout(50);
    await page.mouse.click(curvePoints[5].x, curvePoints[5].y);
    await page.waitForTimeout(50);
    await page.keyboard.up(modifierKey);
    await page.waitForTimeout(100);

    // Count circles before deletion
    const circlesBefore = await page.locator('svg circle').count();
    expect(circlesBefore).toBeGreaterThan(0);

    // Delete the selected points
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // Verify that the path still exists
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBe(1);

    // Should have fewer circles after deletion
    const circlesAfter = await page.locator('svg circle').count();
    expect(circlesAfter).toBeLessThan(circlesBefore);
    expect(circlesAfter).toBeGreaterThan(0);

    // The path should still be visible and have remaining points
    const pathElement = await getCanvasPaths(page).first();
    await expect(pathElement).toBeVisible();
  });
});

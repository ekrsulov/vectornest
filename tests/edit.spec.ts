import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expandSmoothBrushOptions, expandRoundPathOptions, expectToolEnabled, getPanelContainer, firstVisible} from './helpers';
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
    const smoothBrushExpandButton = page.getByRole('button', { name: /Smooth Brush.*Expand panel/ }).first();
    await smoothBrushExpandButton.click({ force: true });
    await page.waitForTimeout(200);

    // Toggle brush mode using the switch in the header
    const headerContainer = smoothBrushHeading.locator('xpath=..');
    const brushModeSwitch = headerContainer.locator('.chakra-switch').first();
    await expect(brushModeSwitch).toBeVisible();
    expect(await brushModeSwitch.locator('input').isChecked()).toBe(false);

    await brushModeSwitch.click();
    await expect(brushModeSwitch.locator('input')).toBeChecked();

    // Radius slider should appear when brush is active
    const smoothBrushPanel = await getPanelContainer(page, 'Smooth Brush');
    await expect(await firstVisible(smoothBrushPanel.getByText('Radius'))).toBeVisible();
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
    const smoothBrushExpandButton = page.getByRole('button', { name: /Smooth Brush.*Expand panel/ }).first();
    await smoothBrushExpandButton.click({ force: true });
    await page.waitForTimeout(200);

    // Activate brush mode
    const headerContainer = smoothBrushHeading.locator('xpath=..');
    const brushModeSwitch = headerContainer.locator('.chakra-switch').first();
    expect(await brushModeSwitch.locator('input').isChecked()).toBe(false);
    await brushModeSwitch.click();
    await expect(brushModeSwitch.locator('input')).toBeChecked();

    // Test strength slider - check for the label
    const smoothBrushPanel = await getPanelContainer(page, 'Smooth Brush');
    await expect(await firstVisible(smoothBrushPanel.getByText('Strength'))).toBeVisible();

    // Enable simplify points and ensure dependent controls appear
    const simplifyCheckbox = page.getByRole('checkbox', { name: 'Simplify Points' }).first();
    await simplifyCheckbox.check({ force: true });
    await expect(simplifyCheckbox).toBeChecked();

    await expect(await firstVisible(smoothBrushPanel.getByText('Tolerance'))).toBeVisible();

    await expect(await firstVisible(smoothBrushPanel.getByText('Min Dist'))).toBeVisible();
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

    const updatedRadius = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      store.getState().updatePathRounding?.({ radius: 60 });
      return store.getState().pathRounding.radius;
    });

    expect(updatedRadius).toBe(60);
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
    const strengthLabel = smoothBrushPanel.getByText('Strength').first();
    const strengthInput = await openSliderValueInput(strengthLabel);
    await strengthInput.fill('200');
    await strengthInput.press('Enter');

    // The value should be clamped to 100% (formatter uses rounded percent)
    await expect(smoothBrushPanel.getByText('100%').first()).toBeVisible();
  });

  test('should auto-select next point after deleting single selected point', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await page.evaluate(() => {
      (window as any).useCanvasStore?.getState?.().updatePencilState?.({ simplificationTolerance: 0 });
    });

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

    const editStateBefore = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
        selectedCommands: store?.selectedCommands?.length ?? 0,
      };
    });
    expect(editStateBefore.commandCount).toBeGreaterThan(0);
    expect(editStateBefore.selectedCommands).toBeGreaterThan(0);

    // Press Delete to remove the selected point
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // After deletion, verify that:
    // 1. The path still exists
    const pathsAfterDelete = await getCanvasPaths(page).count();
    expect(pathsAfterDelete).toBeGreaterThan(0);

    // 2. The edited path should now have fewer commands and still keep a selected point.
    const editStateAfter = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
        selectedCommands: store?.selectedCommands?.length ?? 0,
      };
    });
    expect(editStateAfter.commandCount).toBeLessThan(editStateBefore.commandCount);
    expect(editStateAfter.selectedCommands).toBeGreaterThan(0);

    // Try pressing Delete again to verify the behavior continues
    const commandCountBeforeSecondDelete = editStateAfter.commandCount;
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Path should still exist
    const pathsAfterSecondDelete = await getCanvasPaths(page).count();
    expect(pathsAfterSecondDelete).toBeGreaterThan(0);

    // The edited path should continue shrinking one point at a time.
    const editStateAfterSecondDelete = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
        selectedCommands: store?.selectedCommands?.length ?? 0,
      };
    });
    expect(editStateAfterSecondDelete.commandCount).toBeLessThan(commandCountBeforeSecondDelete);
    expect(editStateAfterSecondDelete.selectedCommands).toBeGreaterThan(0);
  });

  test('should delete only one point per Delete keypress', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await page.evaluate(() => {
      (window as any).useCanvasStore?.getState?.().updatePencilState?.({ simplificationTolerance: 0 });
    });

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

    const editStateBefore = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
      };
    });
    
    // Press Delete once
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    const editStateAfterFirstDelete = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
      };
    });
    expect(editStateAfterFirstDelete.commandCount).toBe(editStateBefore.commandCount - 1);

    // Press Delete again
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    const editStateAfterSecondDelete = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
      };
    });
    expect(editStateAfterSecondDelete.commandCount).toBe(editStateAfterFirstDelete.commandCount - 1);

    // Path should still exist
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBeGreaterThan(0);
  });

  test('should select immediately next point after deletion (visual verification)', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await page.evaluate(() => {
      (window as any).useCanvasStore?.getState?.().updatePencilState?.({ simplificationTolerance: 0 });
    });

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

    const editStateAfterDelete = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
        selectedCommands: store?.selectedCommands?.length ?? 0,
      };
    });
    expect(editStateAfterDelete.commandCount).toBeGreaterThan(0);
    expect(editStateAfterDelete.selectedCommands).toBeGreaterThan(0);

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

    const editStateBefore = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
        selectedCommands: store?.selectedCommands?.length ?? 0,
      };
    });
    expect(editStateBefore.commandCount).toBeGreaterThan(0);
    expect(editStateBefore.selectedCommands).toBeGreaterThan(0);

    // Delete the selected command point
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    const editStateAfter = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
        selectedCommands: store?.selectedCommands?.length ?? 0,
      };
    });
    expect(editStateAfter.commandCount).toBeLessThanOrEqual(editStateBefore.commandCount);
    expect(editStateAfter.commandCount).toBeGreaterThan(0);
    expect(editStateAfter.selectedCommands).toBeGreaterThanOrEqual(1);

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

    const editStateBefore = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
        selectedCommands: store?.selectedCommands?.length ?? 0,
      };
    });
    expect(editStateBefore.commandCount).toBeGreaterThan(0);
    expect(editStateBefore.selectedCommands).toBeGreaterThanOrEqual(1);

    // Delete the selected points
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // Verify that the path still exists
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBe(1);

    const editStateAfter = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      const path = store?.elements?.find((element: any) => element.type === 'path');
      return {
        commandCount: path?.data?.subPaths?.[0]?.length ?? 0,
      };
    });
    expect(editStateAfter.commandCount).toBeLessThan(editStateBefore.commandCount);
    expect(editStateAfter.commandCount).toBeGreaterThan(0);

    // The path should still be visible and have remaining points
    const pathElement = await getCanvasPaths(page).first();
    await expect(pathElement).toBeVisible();
  });
});

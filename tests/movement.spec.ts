import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expectToolEnabled, isToolButtonEnabled} from './helpers';

test.describe('Path Movement Tests', () => {
  test('should move complete paths in select mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path first
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Draw a path
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.6,
      { steps: 10 }
    );

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Get initial path d attribute
    const initialPathD = await canvas.locator('path').first().getAttribute('d');
    expect(initialPathD).toBeTruthy();

    // Switch to select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Click on the path element to select it
    const paths = getCanvasPaths(page);
    await paths.first().click();

    // Wait for selection
    await page.waitForTimeout(100);

    // Verify Edit and Transform buttons are enabled
    await expectToolEnabled(page, 'Edit');
    await expectToolEnabled(page, 'Transform');

    // Get the path bounding box for dragging
    const pathBox = await paths.first().boundingBox();
    if (!pathBox) throw new Error('Path bounding box not found');

    // Calculate drag positions
    const startX = pathBox.x + pathBox.width / 2;
    const startY = pathBox.y + pathBox.height / 2;
    const endX = canvasBox.x + canvasBox.width * 0.6;
    const endY = canvasBox.y + canvasBox.height * 0.8;

    // Now drag the path
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    // Wait for movement to complete
    await page.waitForTimeout(100);

    // Get final path data
    const finalPathD = await canvas.locator('path').first().getAttribute('d');
    
    // Verify the path has moved (d attribute should be different)
    expect(finalPathD).not.toBe(initialPathD);
    expect(finalPathD).not.toBe('M 256 360'); // Should not be reduced to a single point

    // Verify the path has moved (transform attribute should be different or path position changed)
    const finalPath = canvas.locator('path').first();

    // The path should still exist and be visible
    await expect(finalPath).toBeVisible();

    // Verify the path count remains the same (no new paths created)
    const pathsAfterMovement = await getCanvasPaths(page).count();
    expect(pathsAfterMovement).toBe(pathsAfterCreation);
  });

  test('should move individual subpaths in subpath mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to pencil mode
    await selectTool(page, 'Pencil');

    // Click add subpath button to switch to subpath mode
    const addButton = page.locator('button', { hasText: 'Add' });
    await addButton.click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first subpath (horizontal line)
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.3,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait a bit before drawing second subpath
    await page.waitForTimeout(100);

    // Draw second subpath (diagonal line from the middle of the screen)
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(50);

    // Switch to select mode
    await selectTool(page, 'Select');

    // Click on the created path to select it (clicking on the first subpath)
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.3
    );

    // Wait for selection
    await page.waitForTimeout(50);

    // Check if the subpath button is now enabled
    const subpathEnabled = await isToolButtonEnabled(page, 'Subpath');
    if (!subpathEnabled) {
      throw new Error('Subpath button should be enabled after selecting a path');
    }

    // Now switch to subpath mode
    await selectTool(page, 'Subpath');

    // Wait for subpath mode to activate
    await page.waitForTimeout(50);

    // In subpath mode, click to select the diagonal subpath
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.6
    );

    // Wait for subpath selection
    await page.waitForTimeout(100);

    // Drag to move the subpath
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 10 }
    );
    await page.mouse.up();

    // Wait for movement
    await page.waitForTimeout(50);

    // Verify the shape still exists
    const finalPath = canvas.locator('path').first();
    await expect(finalPath).toBeVisible();
  });

  test('should move individual points in edit mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a simple path first
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple path
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.6,
      { steps: 10 }
    );

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(100);

    // Get initial path data from store
    const initialPathData = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const pathElement = state.elements.find((el: any) => el.type === 'path');
        return pathElement ? pathElement.data : null;
      }
      return null;
    });
    expect(initialPathData).toBeTruthy();
    expect(initialPathData.subPaths[0].length).toBeGreaterThan(1); // Should have more than just M command

    // Switch to select mode first to select the path
    await selectTool(page, 'Select');

    // Click on the path to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.6
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Switch to edit mode
    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');

    // Wait for edit mode to activate
    await page.waitForTimeout(100);

    // Check that edit panel is visible
    await expect(page.getByRole('heading', { name: 'Smooth Brush' })).toBeVisible();

    // Click on canvas to start point selection (when smooth brush is off)
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Drag to select only some points (not all points) - smaller selection to leave some points out
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 10 }
    );
    await page.mouse.up();

    // Wait for point selection
    await page.waitForTimeout(200);

    // Now try to move a selected point
    // Click on a point to select it for dragging
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.7
    );

    // Wait for point selection
    await page.waitForTimeout(100);

    // Drag the point
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 10 }
    );
    await page.mouse.up();

    // Wait for movement
    await page.waitForTimeout(100);

    // Get final path data
    const finalPathData = await canvas.locator('path').first().getAttribute('d');
    
    // Verify the path has changed (d attribute should be different)
    expect(finalPathData).not.toBe(initialPathData);
    expect(finalPathData).not.toBe('M 256 360'); // Should not be reduced to a single point

    // Verify the path still exists and is visible
    const finalPath = canvas.locator('path').first();
    await expect(finalPath).toBeVisible();
  });

  test('should move all selected edit points when dragging one of them', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    const startX = canvasBox.x + canvasBox.width * 0.25;
    const startY = canvasBox.y + canvasBox.height * 0.25;
    const endX = canvasBox.x + canvasBox.width * 0.45;
    const endY = canvasBox.y + canvasBox.height * 0.45;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(120);

    await selectTool(page, 'Select');
    await page.mouse.click((startX + endX) / 2, (startY + endY) / 2);
    await page.waitForTimeout(100);

    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');
    await page.waitForTimeout(180);

    const editPoints = page.locator('[data-edit-point-hit="true"]');
    const pointCount = await editPoints.count();
    expect(pointCount).toBeGreaterThanOrEqual(2);

    await editPoints.nth(0).click();
    await page.keyboard.down('Shift');
    await editPoints.nth(1).click();
    await page.keyboard.up('Shift');
    await page.waitForTimeout(120);

    const selectedRefs = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      const state = store?.getState?.();
      if (!state) return null;

      const selected = state.selectedCommands ?? [];
      if (selected.length < 2) return null;

      return selected.slice(0, 2).map((cmd: any) => ({
        elementId: cmd.elementId,
        commandIndex: cmd.commandIndex,
        pointIndex: cmd.pointIndex,
      }));
    });
    expect(selectedRefs).toBeTruthy();

    const readPoints = async (refs: Array<{ elementId: string; commandIndex: number; pointIndex: number }>) =>
      page.evaluate((pointRefs) => {
        const store = (window as any).useCanvasStore;
        const state = store?.getState?.();
        if (!state) return null;

        const getPointFromCommand = (command: any, pointIndex: number) => {
          if (!command) return null;
          if ((command.type === 'M' || command.type === 'L') && pointIndex === 0) {
            return { x: command.position.x, y: command.position.y };
          }
          if (command.type === 'C') {
            if (pointIndex === 0) return { x: command.controlPoint1.x, y: command.controlPoint1.y };
            if (pointIndex === 1) return { x: command.controlPoint2.x, y: command.controlPoint2.y };
            if (pointIndex === 2) return { x: command.position.x, y: command.position.y };
          }
          return null;
        };

        const output = pointRefs.map((ref) => {
          const element = state.elements.find((el: any) => el.id === ref.elementId);
          if (!element || element.type !== 'path') return null;

          const commands = element.data.subPaths.flat();
          const point = getPointFromCommand(commands[ref.commandIndex], ref.pointIndex);
          if (!point) return null;

          return { ...ref, point };
        });

        return output.every(Boolean) ? output : null;
      }, refs);

    const initialPoints = await readPoints(selectedRefs as Array<{ elementId: string; commandIndex: number; pointIndex: number }>);
    expect(initialPoints).toBeTruthy();

    const dragHandleBox = await editPoints.nth(0).boundingBox();
    if (!dragHandleBox) throw new Error('Edit point bounding box not found');

    const dragStartX = dragHandleBox.x + dragHandleBox.width / 2;
    const dragStartY = dragHandleBox.y + dragHandleBox.height / 2;
    const dragDelta = { x: 42, y: 28 };

    await page.mouse.move(dragStartX, dragStartY);
    await page.mouse.down();
    await page.mouse.move(dragStartX + dragDelta.x, dragStartY + dragDelta.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(150);

    const finalPoints = await readPoints(selectedRefs as Array<{ elementId: string; commandIndex: number; pointIndex: number }>);
    expect(finalPoints).toBeTruthy();

    const initial = initialPoints as Array<{ point: { x: number; y: number } }>;
    const final = finalPoints as Array<{ point: { x: number; y: number } }>;

    const delta1 = {
      x: final[0].point.x - initial[0].point.x,
      y: final[0].point.y - initial[0].point.y,
    };
    const delta2 = {
      x: final[1].point.x - initial[1].point.x,
      y: final[1].point.y - initial[1].point.y,
    };

    const movedDistance = Math.hypot(delta1.x, delta1.y);
    expect(movedDistance).toBeGreaterThan(0.5);

    expect(Math.abs(delta1.x - delta2.x)).toBeLessThan(0.5);
    expect(Math.abs(delta1.y - delta2.y)).toBeLessThan(0.5);
  });

  test('should handle multiple path movement', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape and a line
    await selectTool(page, 'Shape');

    // Select square shape
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square shape
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.4,
      { steps: 5 }
    );
    await page.mouse.up();

    // Switch to pencil to draw a line
    await selectTool(page, 'Pencil');

    // Draw second path (line)
    await page.waitForTimeout(200);
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.8
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 5 }
    );
    await page.mouse.up();

    // Wait for paths creation
    await page.waitForTimeout(100);

    // Verify both elements were created
    const initialPaths = await getCanvasPaths(page).count();
    expect(initialPaths).toBeGreaterThanOrEqual(2);

    // Capture initial d attributes
    const path1InitialD = await canvas.locator('path').nth(0).getAttribute('d');
    const path2InitialD = await canvas.locator('path').nth(1).getAttribute('d');

    // Switch to select mode
    await selectTool(page, 'Select');

    // Select both elements (shift+click)
    await page.keyboard.down('Shift');
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.3
    );

    await page.waitForTimeout(300);

    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.8
    );
    await page.keyboard.up('Shift');

    // Wait for multi-selection
    await page.waitForTimeout(100);

    // Drag both elements
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 20 }
    );
    await page.mouse.up();

    // Wait for movement
    await page.waitForTimeout(100);

    // Verify both elements still exist and were moved
    const finalPaths = await getCanvasPaths(page).count();
    expect(finalPaths).toBeGreaterThanOrEqual(2);

    const path1FinalD = await canvas.locator('path').nth(0).getAttribute('d');
    const path2FinalD = await canvas.locator('path').nth(1).getAttribute('d');

    expect(path1FinalD).not.toBe(path1InitialD);
    expect(path2FinalD).not.toBe(path2InitialD);
  });
});

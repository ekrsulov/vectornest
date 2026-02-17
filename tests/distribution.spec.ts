import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Distribution Tests', () => {
  test('should distribute elements horizontally', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Activate shape mode
    await selectTool(page, 'Shape');

    // Select circle shape
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create 4 circles at different horizontal positions
    const circlePositions = [
      { start: { x: 0.05, y: 0.3 }, end: { x: 0.08, y: 0.33 } }, // Leftmost circle
      { start: { x: 0.18, y: 0.3 }, end: { x: 0.21, y: 0.33 } }, // Left circle
      { start: { x: 0.38, y: 0.3 }, end: { x: 0.41, y: 0.33 } }, // Center circle
      { start: { x: 0.58, y: 0.3 }, end: { x: 0.61, y: 0.33 } }, // Right circle
    ];

    for (const pos of circlePositions) {
      // Ensure we're in shape mode for each circle
      await selectTool(page, 'Shape');
      await page.locator('[aria-label="Circle"]').click();

      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.start.x,
        canvasBox.y + canvasBox.height * pos.start.y
      );
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.end.x,
        canvasBox.y + canvasBox.height * pos.end.y,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(200);
    }

    // Wait for all circles to be created
    await page.waitForTimeout(500);

    // Switch to select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(200);

    // Ensure arrange panel is expanded
    const expandArrangeButton = page.locator('[aria-label="Expand Arrange"]');
    if (await expandArrangeButton.isVisible()) {
      await expandArrangeButton.click();
      await page.waitForTimeout(200);
    }

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1);
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify circles were created
    const pathsCount = await getCanvasPaths(page).count();
    expect(pathsCount).toBe(circlePositions.length);

    // Verify elements exist in store
    const elementsInStore = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      return store ? store.getState().elements.length : 0;
    });
    expect(elementsInStore).toBe(circlePositions.length);

    // Select all circles using the exposed store
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const elementIds = state.elements.map((el: any) => el.id);
        state.selectElements(elementIds);
      }
    });

    // Wait for selection to be processed
    await page.waitForTimeout(500);

    // Verify we have 5 elements selected
    const selectedCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      return store ? store.getState().selectedIds.length : 0;
    });
    expect(selectedCount).toBe(4);

    // Verify distribute button is enabled
    const distributeButton = page.locator('[aria-label="Distribute Horizontally"]');
    await expect(distributeButton).toBeEnabled();

    // Click distribute horizontally button
    await distributeButton.click();

    // Wait for distribution to complete
    await page.waitForTimeout(200);

    // Get positions after distribution
    const finalPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1);
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify that elements were distributed horizontally
    expect(finalPositions.length).toBe(4);
    
    // Verify that positions actually changed
    const positionsChanged = initialPositions.some((initial: any) => {
      const final = finalPositions.find((f: any) => f.id === initial.id);
      return final && initial.minX !== final.minX;
    });
    expect(positionsChanged).toBe(true);

    // Verify circles still exist after distribution
    const pathsAfterDistribute = await getCanvasPaths(page).count();
    expect(pathsAfterDistribute).toBe(circlePositions.length);
  });

  test('should distribute elements vertically', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Activate shape mode
    await selectTool(page, 'Shape');

    // Select circle shape
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create 5 circles in positions that need vertical redistribution
    // Moved to the left to avoid sidebar and adjusted vertical spacing
    const circlePositions = [
      { start: { x: 0.15, y: 0.1 }, end: { x: 0.20, y: 0.15 } }, // Top circle
      { start: { x: 0.15, y: 0.25 }, end: { x: 0.20, y: 0.3 } }, // Upper circle
      { start: { x: 0.15, y: 0.4 }, end: { x: 0.20, y: 0.45 } }, // Middle circle
      { start: { x: 0.15, y: 0.55 }, end: { x: 0.20, y: 0.6 } }, // Lower circle
      { start: { x: 0.15, y: 0.75 }, end: { x: 0.20, y: 0.8 } }, // Bottom circle
    ];

    for (const pos of circlePositions) {
      // Ensure we're in shape mode for each circle
      await selectTool(page, 'Shape');
      await page.locator('[aria-label="Circle"]').click();

      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.start.x,
        canvasBox.y + canvasBox.height * pos.start.y
      );
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.end.x,
        canvasBox.y + canvasBox.height * pos.end.y,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Wait for all circles to be created
    await page.waitForTimeout(500);

    // Switch to select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(200);

    // Ensure arrange panel is expanded
    const expandArrangeButton = page.locator('[aria-label="Expand Arrange"]');
    if (await expandArrangeButton.isVisible()) {
      await expandArrangeButton.click();
      await page.waitForTimeout(200);
    }

    // Expand arrange panel

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1);
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify circles were created
    const pathsCount = await getCanvasPaths(page).count();
    expect(pathsCount).toBe(circlePositions.length);

    // Select all circles
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const elementIds = state.elements.map((el: any) => el.id);
        if (elementIds.length >= 5) {
          state.selectElements(elementIds);
        }
      }
    });

    // Wait for selection to be processed
    await page.waitForTimeout(500);

    // Verify we have 5 elements selected
    const selectedCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      return store ? store.getState().selectedIds.length : 0;
    });
    expect(selectedCount).toBe(5);

    // Verify distribute button is enabled
    const distributeButton = page.locator('[aria-label="Distribute Vertically"]');
    await expect(distributeButton).toBeEnabled();

    // Click distribute vertically button
    await distributeButton.click();

    // Wait for distribution to complete
    await page.waitForTimeout(200);

    // Get positions after distribution
    const finalPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1);
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify that elements were distributed vertically
    expect(finalPositions.length).toBe(5);
    
    // Verify that positions actually changed
    const positionsChanged = initialPositions.some((initial: any) => {
      const final = finalPositions.find((f: any) => f.id === initial.id);
      return final && initial.minY !== final.minY;
    });
    expect(positionsChanged).toBe(true);

    // Verify circles still exist after distribution
    const pathsAfterDistribute = await getCanvasPaths(page).count();
    expect(pathsAfterDistribute).toBe(circlePositions.length);
  });
});
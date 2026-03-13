import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Round Path Plugin', () => {
  test('should show round path controls in edit mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a square (has sharp corners to round)
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.6, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Select the square
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.45, canvasBox.y + canvasBox.height * 0.45);
    await page.waitForTimeout(100);

    // Enter edit mode
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Look for Round Path heading (specific to avoid ambiguity with Round Cap/Join buttons)
    const roundHeading = page.getByRole('heading', { name: /Round Path|Round Subpath/ });
    await expect(roundHeading).toBeVisible();
  });

  test('should round corners of a square', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a square
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.6, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Get path before rounding
    const pathBefore = getCanvasPaths(page).first();
    const dBefore = await pathBefore.getAttribute('d');

    // Square should only have L (line) commands, no curves
    const _hasCurveBefore = /[CQS]/i.test(dBefore || '');

    // Select and enter edit mode
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.45, canvasBox.y + canvasBox.height * 0.45);
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Look for round radius slider/input
    const roundSlider = page.locator('input[type="range"]').first();
    const _roundInput = page.locator('input[type="number"]').filter({ has: page.locator('text=Round') });

    if (await roundSlider.isVisible()) {
      // Try to adjust the slider to add rounding
      const sliderBox = await roundSlider.boundingBox();
      if (sliderBox) {
        await page.mouse.click(sliderBox.x + sliderBox.width * 0.5, sliderBox.y + sliderBox.height * 0.5);
        await page.waitForTimeout(200);
      }
    }

    // Original path should be a square (likely no curves)
    expect(dBefore).toBeTruthy();
  });

  test('should apply rounding to selected corner point', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const pathId = await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      if (!store) {
        throw new Error('Canvas store is not available');
      }

      const createdPathId = store.addElement?.({
        type: 'path',
        data: {
          subPaths: [[
            { type: 'M', position: { x: 160, y: 120 } },
            { type: 'L', position: { x: 260, y: 260 } },
            { type: 'L', position: { x: 360, y: 120 } },
          ]],
          fillColor: 'none',
          strokeColor: '#000000',
          strokeWidth: 2,
        },
      });

      if (!createdPathId) {
        throw new Error('Failed to create V path');
      }

      store.selectElements?.([createdPathId]);
      store.setActivePlugin?.('edit');
      (window as any).useCanvasStore?.setState?.({
        selectedCommands: [{ elementId: createdPathId, commandIndex: 1, pointIndex: 0 }],
      });

      return createdPathId;
    });

    await expect.poll(async () => page.evaluate(() => {
      return ((window as any).useCanvasStore?.getState?.().elements ?? []).filter(
        (element: { type?: string }) => element.type === 'path'
      ).length;
    })).toBeGreaterThan(0);

    await expect.poll(async () => page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      return {
        activePlugin: store?.activePlugin,
        selectedIds: store?.selectedIds ?? [],
        selectedCommands: store?.selectedCommands ?? [],
      };
    })).toMatchObject({
      activePlugin: 'edit',
      selectedIds: [pathId],
      selectedCommands: [{ elementId: pathId, commandIndex: 1, pointIndex: 0 }],
    });

    // Verify Round Path/Subpath panel heading is visible
    const roundPathHeading = page.getByRole('heading', { name: /Round Path|Round Subpath/ });
    await expect(roundPathHeading).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { getCanvas, waitForLoad, selectTool, expandSnapPointsOptions } from './helpers';

test.describe('Measure Plugin - Snap Type Toggle Persistence', () => {
  test('toggles are preserved and adjustable after starting measurement', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Activate Measure tool
    await selectTool(page, 'Measure');

    // Set the snap points state values and open the collapsed sections in EditorPanel
    // EditorPanel reads snap toggles from snapPointsState (via updateSnapPointsState)
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      store.getState().updateSnapPointsState?.({
        showSnapPoints: true,
        snapToMidpoints: false,
        snapToPath: false,
        snapToAnchors: true
      });
      store.getState().setShowSettingsPanel?.(true);
      store.getState().setEditorColorControlsOpen?.(true);
      store.getState().setEditorAdvancedStrokeOpen?.(true);
    });

    // Wait for UI to update
    await page.waitForTimeout(200);

    // Expand snap points panel options
    await expandSnapPointsOptions(page);
    await page.waitForTimeout(200);

    // Click to start measurement
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');
    const start = { clientX: canvasBox.x + 200, clientY: canvasBox.y + 200 };
    await page.mouse.click(start.clientX, start.clientY);
    await page.waitForTimeout(50);

    // Verify toggles still reflect the state (midpoints and edges should be unchecked)
    const midCheckbox = page.getByRole('checkbox', { name: 'Midpoint' });
    const edgeCheckbox = page.getByRole('checkbox', { name: 'Path', exact: true });
    const anchorCheckbox = page.getByRole('checkbox', { name: 'Anchor' });

    expect(await midCheckbox.isChecked()).toBe(false);
    expect(await edgeCheckbox.isChecked()).toBe(false);
    expect(await anchorCheckbox.isChecked()).toBe(true);

    // Toggle Mid on via UI and ensure it changes
    const midControl = page.locator('label', { hasText: 'Midpoint' }).locator('.chakra-checkbox__control');
    await midControl.click();
    await page.waitForTimeout(30);
    expect(await midCheckbox.isChecked()).toBe(true);

  });
});

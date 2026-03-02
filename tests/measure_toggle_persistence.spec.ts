import { test, expect } from '@playwright/test';
import { getCanvas, waitForLoad, selectTool, openSettingsPanel } from './helpers';

test.describe('Measure Plugin - Snap Type Toggle Persistence', () => {
  test('toggles are preserved and adjustable after starting measurement', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Activate Measure tool
    await selectTool(page, 'Measure');
    await openSettingsPanel(page);

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

    // Click to start measurement
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');
    const start = { clientX: canvasBox.x + 200, clientY: canvasBox.y + 200 };
    await page.mouse.click(start.clientX, start.clientY);
    await page.waitForTimeout(50);

    // Verify toggles still reflect the state after measurement starts
    const snapPointsState = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      return store.getState().snapPoints;
    });

    expect(snapPointsState.showSnapPoints).toBe(true);
    expect(snapPointsState.snapToMidpoints).toBe(false);
    expect(snapPointsState.snapToPath).toBe(false);
    expect(snapPointsState.snapToAnchors).toBe(true);

    // Update a toggle after measurement starts and ensure the state changes
    const updatedMidpoint = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      store.getState().updateSnapPointsState?.({ snapToMidpoints: true });
      return store.getState().snapPoints.snapToMidpoints;
    });

    expect(updatedMidpoint).toBe(true);

  });
});

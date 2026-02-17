import { test, expect } from '@playwright/test';
import {getCanvas, waitForLoad, selectTool} from './helpers';

test.describe('Measure Plugin - Virtual Shift (mobile) compatibility', () => {
  test('works with virtual shift to constrain to cardinal/diagonal', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Activate Measure tool
    await selectTool(page, 'Measure');

    // Toggle virtual shift ON
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      store.getState().setVirtualShift(true);
    });

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    const start = {
      clientX: canvasBox.x + canvasBox.width * 0.3,
      clientY: canvasBox.y + canvasBox.height * 0.3,
    };

    // Move to a point that isn't perfectly aligned - the virtual shift should constrain it
    const moveTo = {
      clientX: canvasBox.x + canvasBox.width * 0.55,
      clientY: canvasBox.y + canvasBox.height * 0.5,
    };

    // Click to start
    await page.mouse.click(start.clientX, start.clientY);
    await page.waitForTimeout(50);

    // Move to update (with no physical shift but virtual shift is active)
    await page.mouse.move(moveTo.clientX, moveTo.clientY, { steps: 10 });
    await page.waitForTimeout(50);

    const measurement = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      const s = store.getState();
      return s.measure.measurement;
    });

    // Validate that the final measurement is aligned to a cardinal or diagonal
    const startPt = measurement.startPoint;
    const endPt = measurement.endPoint;
    expect(startPt).toBeTruthy();
    expect(endPt).toBeTruthy();

    const dx = Math.abs(endPt.x - startPt.x);
    const dy = Math.abs(endPt.y - startPt.y);
    const epsilon = 0.001;

    const isHorizontal = Math.abs(dy) < epsilon;
    const isVertical = Math.abs(dx) < epsilon;
    const isDiagonal = Math.abs(dx - dy) < epsilon;

    expect(isHorizontal || isVertical || isDiagonal).toBeTruthy();
  });
});

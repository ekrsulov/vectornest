import { test, expect } from '@playwright/test';
import { createShape, firstVisible, getCanvasPaths, selectTool, waitForLoad } from './helpers';

test.describe('Transformation Plugin - Virtual Shift', () => {
  test('uses virtual shift for discrete rotation on mobile-compatible flows', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await createShape(page);

    await selectTool(page, 'Select');
    const paths = getCanvasPaths(page);
    await paths.first().click();
    await page.waitForTimeout(100);

    await selectTool(page, 'Transform');
    await page.waitForTimeout(150);

    await page.evaluate(() => {
      const store = (window as typeof window & { useCanvasStore?: { getState: () => { setVirtualShift?: (active: boolean) => void } } }).useCanvasStore;
      store?.getState().setVirtualShift?.(true);
    });

    const rotateHandle = await firstVisible(page.locator('[data-transform-handler="rotate-tr"]'));
    await expect(rotateHandle).toBeVisible();

    const handleBox = await rotateHandle.boundingBox();
    if (!handleBox) {
      throw new Error('Rotation handle bounding box not found');
    }

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 43, startY + 71, { steps: 12 });
    await page.waitForTimeout(100);

    const rotationFeedback = await page.evaluate(() => {
      const store = (window as typeof window & {
        useCanvasStore?: {
          getState: () => {
            transformFeedback?: {
              rotation?: {
                degrees: number;
                visible: boolean;
                isShiftPressed: boolean;
                isMultipleOf15: boolean;
              };
            };
          };
        };
      }).useCanvasStore;

      return store?.getState().transformFeedback?.rotation ?? null;
    });

    await page.mouse.up();

    expect(rotationFeedback).toBeTruthy();
    expect(rotationFeedback?.visible).toBe(true);
    expect(rotationFeedback?.isShiftPressed).toBe(true);
    expect(rotationFeedback?.isMultipleOf15).toBe(true);
    expect((rotationFeedback?.degrees ?? 0) % 15).toBe(0);
  });
});

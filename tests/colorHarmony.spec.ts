import { expect, test } from '@playwright/test';
import { createShape, getCanvas, selectTool, waitForLoad } from './helpers';

test.describe('Color Harmony', () => {
  test('should appear after selecting an element without switching to Prefs or Audit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForLoad(page);

    await createShape(page, 'Square', { x: 320, y: 220 });

    await selectTool(page, 'Select');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.click(canvasBox.x + 320, canvasBox.y + 220);

    await expect(page.getByRole('heading', { name: 'Color Harmony' })).toBeVisible({ timeout: 5000 });
  });
});

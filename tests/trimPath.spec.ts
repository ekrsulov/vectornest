import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Trim Path - cleanup', () => {
  test('after trim, should not create duplicate or point-only paths', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw two overlapping circles using Shape tool
    await selectTool(page, 'Shape');

    // First circle centered left
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.6, { steps: 20 });
    await page.mouse.up();

    // Second circle overlapping to the right
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.55, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.65, canvasBox.y + canvasBox.height * 0.6, { steps: 20 });
    await page.mouse.up();

    // Wait for creation
    await page.waitForTimeout(200);

    // Select both by dragging a selection rectangle
    await selectTool(page, 'Select');
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.8, canvasBox.y + canvasBox.height * 0.7, { steps: 10 });
    await page.mouse.up();

    // Activate Trim Path
    await selectTool(page, 'Trim Path');

    // Drag across to mark segments
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.35, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.7, canvasBox.y + canvasBox.height * 0.5, { steps: 8 });
    await page.mouse.up();

    // Wait for trim to apply
    await page.waitForTimeout(300);

    // Collect paths and assert no zero-length/point-only paths
    const paths = await getCanvasPaths(page).all();
    expect(paths.length).toBeGreaterThan(0);

    // get 'd' attribute for each path and assert it's not a single move command or degenerate
    const degenerate = await Promise.all(paths.map(async (p) => {
      const d = await p.getAttribute('d');
      return typeof d === 'string' && /^M\s*-?\d+(?:\.\d+)?\s*-?\d+\s*$/.test(d.trim());
    }));

    // None should be degenerate
    const anyDeg = degenerate.some(v => v);
    expect(anyDeg).toBe(false);

    // ensure no duplications by 'd' string
    const dPaths = await Promise.all(paths.map(async p => (await p.getAttribute('d')) || ''));
    const uniqD = new Set(dPaths);
    expect(uniqD.size).toBe(dPaths.length);
  });
});

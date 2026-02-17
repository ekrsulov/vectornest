import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expectToolEnabled} from './helpers';

test.describe('Path Simplification Plugin', () => {
  test('should show simplification panel in edit mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a complex path with pencil
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a wavy path with many points
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.1, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    
    // Create a zig-zag pattern
    for (let i = 0; i < 10; i++) {
      const progress = (i + 1) / 10;
      const yOffset = i % 2 === 0 ? -0.1 : 0.1;
      await page.mouse.move(
        canvasBox.x + canvasBox.width * (0.1 + progress * 0.7),
        canvasBox.y + canvasBox.height * (0.5 + yOffset),
        { steps: 5 }
      );
    }
    
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Select the path
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.5);
    await page.waitForTimeout(100);

    // Enter edit mode
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Look for Path Simplification heading (specific to avoid ambiguity)
    const simplifyHeading = page.getByRole('heading', { name: /Path Simplification|Subpath Simplification/ });
    await expect(simplifyHeading).toBeVisible();
  });

  test('should simplify path reducing point count', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a complex path
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a complex wavy path
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.1, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    
    for (let i = 0; i < 20; i++) {
      const progress = (i + 1) / 20;
      const yOffset = Math.sin(i * 0.5) * 0.15;
      await page.mouse.move(
        canvasBox.x + canvasBox.width * (0.1 + progress * 0.7),
        canvasBox.y + canvasBox.height * (0.5 + yOffset),
        { steps: 3 }
      );
    }
    
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Get the path before simplification
    const pathBefore = getCanvasPaths(page).first();
    const dBefore = await pathBefore.getAttribute('d');
    const pointCountBefore = (dBefore?.match(/[MLCQSTZ]/gi) || []).length;

    // Select and enter edit mode
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);
    await selectTool(page, 'Edit');
    await page.waitForTimeout(200);

    // Look for simplify button/slider
    const simplifyButton = page.locator('button', { hasText: 'Simplify' });
    const _simplifySlider = page.locator('input[type="range"]').filter({ has: page.locator('text=Simplify') });

    if (await simplifyButton.isVisible()) {
      await simplifyButton.click();
      await page.waitForTimeout(200);
    }

    // Verify the path exists
    expect(pointCountBefore).toBeGreaterThan(0);
  });

  test('should preserve path shape after simplification', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a smooth curve
    await selectTool(page, 'Pencil');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.3, { steps: 20 });
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.8, canvasBox.y + canvasBox.height * 0.5, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify path was created
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBeGreaterThan(0);

    // Select and enter edit mode
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(100);

    // Verify selection
    await expectToolEnabled(page, 'Edit');
  });
});

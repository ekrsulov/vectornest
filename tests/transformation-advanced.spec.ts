import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Transformation Advanced Controls', () => {
  test('should show skew and distort controls stacked vertically and apply typed values', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a square
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );
    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(200);

    // Switch to select mode (keepShapeMode is enabled by default)
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Select the created shape
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Switch to transform panel
    await selectTool(page, 'Transform');
    await page.waitForTimeout(100);

    // Enable Advanced Mode
    await page.locator('text=Advanced').click();

    // Expand distort and perspective controls
    await page.locator('[aria-label="Expand Distort"]').click();
    await page.locator('[aria-label="Expand Perspective"]').click();

    // Ensure skew inputs exist and that they are in a skew-row
    const skewX = page.locator('[data-testid="skew-x-input"]');
    const skewY = page.locator('[data-testid="skew-y-input"]');
    await expect(skewX).toBeVisible();
    await expect(skewY).toBeVisible();
    // Skew row should exist
    await expect(page.locator('[data-testid="skew-row"]')).toBeVisible();

    // Ensure distort corner rows exist and inputs are in each row
    const distTlX = page.locator('[data-testid="distort-tl-x-input"]');
    const distBrY = page.locator('[data-testid="distort-br-y-input"]');
    await expect(distTlX).toBeVisible();
    await expect(distBrY).toBeVisible();
    await expect(page.locator('[data-testid="distort-row-tl"]')).toBeVisible();
    await expect(page.locator('[data-testid="distort-row-tr"]')).toBeVisible();
    await expect(page.locator('[data-testid="distort-row-bl"]')).toBeVisible();
    await expect(page.locator('[data-testid="distort-row-br"]')).toBeVisible();

    // Perspective rows should be visible
    await expect(page.locator('[data-testid="perspective-row-top"]')).toBeVisible();
    await expect(page.locator('[data-testid="perspective-row-bottom"]')).toBeVisible();
    await expect(page.locator('[data-testid="perspective-row-left"]')).toBeVisible();
    await expect(page.locator('[data-testid="perspective-row-right"]')).toBeVisible();

    // Record path 'd' before changes
    const path = getCanvasPaths(page).first();
    const dBefore = await path.getAttribute('d');

    // Type in skew x and press Enter to apply (transient input, resets to 0 after submit)
    await skewX.fill('12');
    await skewX.press('Enter');
    // Wait for transform to run
    await page.waitForTimeout(100);
    const dAfterSkew = await path.getAttribute('d');
    expect(dAfterSkew).not.toEqual(dBefore);
    // Input should reset to 0 after apply
    await expect(skewX).toHaveValue('0');

    // Rotation and Width/Height controls should be hidden in Advanced mode
    await expect(page.locator('[data-testid="rotation-input"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="width-input"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="height-input"]')).toHaveCount(0);

    // Type in distort tl-x and check path updated again; Distort inputs are transient and reset to 0
    await distTlX.fill('10');
    await distTlX.press('Enter');
    await page.waitForTimeout(100);
    const dAfterDistort = await path.getAttribute('d');
    expect(dAfterDistort).not.toEqual(dAfterSkew);
    await expect(distTlX).toHaveValue('0');

    // Type in distort br-x and check path updated again (others corners included)
    const distBrX = page.locator('[data-testid="distort-br-x-input"]');
    await distBrX.fill('10');
    await distBrX.press('Enter');
    await page.waitForTimeout(100);
    const dAfterDistortBr = await path.getAttribute('d');
    expect(dAfterDistortBr).not.toEqual(dAfterDistort);
    await expect(distBrX).toHaveValue('0');

    // Apply perspective: top edge X delta
    const persTopX = page.locator('[data-testid="perspective-top-x-input"]');
    await persTopX.fill('8');
    await persTopX.press('Enter');
    await page.waitForTimeout(100);
    const dAfterPerspective = await path.getAttribute('d');
    expect(dAfterPerspective).not.toEqual(dAfterDistort);
    await expect(persTopX).toHaveValue('0');
  });
});

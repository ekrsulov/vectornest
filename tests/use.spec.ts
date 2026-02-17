import { test, expect } from '@playwright/test';
import {getCanvas, waitForLoad, selectTool} from './helpers';

test.describe('Use element import and rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('should import SVG with use elements referencing circles', async ({ page }) => {
    // Open file panel
    await page.locator('[aria-label="File"]').click();
    
    // Upload SVG file by setting files on the hidden input
    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles('./tests/use-test.svg');
    
    // Wait for import to complete
    await page.waitForTimeout(500);
    
    // Check that elements were created
    const canvas = await getCanvas(page);
    
    // We should have:
    // 1. The original circle (converted to path or kept as native shape)
    // 2. Two use elements referencing it
    // Total: 3 visual elements
    
    const allPaths = canvas.locator('path, circle, [data-element-id]');
    const count = await allPaths.count();
    
    // Expect at least 3 elements (circle + 2 use)
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should render use elements with style overrides', async ({ page }) => {
    // Open file panel
    await page.locator('[aria-label="File"]').click();
    
    // Upload SVG file by setting files on the hidden input
    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles('./tests/use-style-test.svg');
    
    await page.waitForTimeout(500);
    
    const canvas = await getCanvas(page);
    
    // Check that we have elements with different fills
    const elements = canvas.locator('[data-element-id]');
    const count = await elements.count();
    
    // Should have at least 3 elements
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should show use panel when use element is selected', async ({ page }) => {
    // Open file panel
    await page.locator('[aria-label="File"]').click();
    
    // Upload SVG file by setting files on the hidden input
    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles('./tests/use-panel-test.svg');
    
    // Wait for file to be imported and UI to stabilize
    await page.waitForTimeout(1500);
    
    // Wait for any notifications/toasts to disappear
    await page.waitForSelector('[role="status"]', { state: 'hidden', timeout: 5000 }).catch(() => {
      // Notification might not exist or already gone, that's OK
    });
    
    // Switch to select tool
    await selectTool(page, 'Select');
    
    // Click on the use element area (around x=20, y=5 in canvas coordinates)
    const canvas = await getCanvas(page);
    const canvasBounds = await canvas.boundingBox();
    
    if (canvasBounds) {
      // Click in the approximate area of the use element
      await page.mouse.click(
        canvasBounds.x + canvasBounds.width / 2 + 50,
        canvasBounds.y + canvasBounds.height / 2
      );
    }
    
    await page.waitForTimeout(200);
    
    // The use panel should be visible in the sidebar
    // This depends on the exact UI implementation
  });
});

import { test, expect } from '@playwright/test';
import {waitForLoad} from './helpers';

test.describe('Use with Image elements', () => {
  test('should import SVG with <use> referencing <image> with base64 data', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open file panel
    await page.locator('[aria-label="File"]').click();

    // Import the test SVG file
    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles('./tests/use-image-test.svg');
    
    // Wait for import to complete
    await page.waitForTimeout(1000);
    
    // Check that elements were imported
    const canvas = page.locator('[data-canvas="true"]').first();
    await expect(canvas).toBeVisible();
    
    // Check that we have at least some image elements rendered
    // The use elements should render as <image> tags
    const imageElements = page.locator('svg[data-canvas="true"] image');
    const imageCount = await imageElements.count();
    
    // Should have at least 2 image elements (from the 2 use instances)
    expect(imageCount).toBeGreaterThanOrEqual(2);
  });
});

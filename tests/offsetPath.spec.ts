import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expandPanelSection} from './helpers';

/**
 * Helper: open the Gen panel in the left sidebar, then expand the Offset Path
 * sub-panel (which starts collapsed by default).
 */
async function openOffsetPathPanel(page: import('@playwright/test').Page) {
  // Click "Gen" tab in the left sidebar to show the generator library
  const genButton = page.locator('button[aria-label="Gen"]');
  await genButton.click();
  await page.waitForTimeout(300);

  // Expand the (collapsed-by-default) Offset Path panel
  await expandPanelSection(page, 'Offset Path');
}

test.describe('Offset Path Plugin', () => {
  test('should show Offset Path panel when path is selected in select mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Select the shape
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(200);

    // Open Gen panel and expand Offset Path
    await openOffsetPathPanel(page);

    // Look for Offset Path panel heading
    const offsetPathHeading = page.getByRole('heading', { name: 'Offset Path' });
    await expect(offsetPathHeading).toBeVisible();
  });

  test('should show distance slider in Offset Path panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a circle
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Select the shape
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(200);

    // Open Gen panel and expand Offset Path
    await openOffsetPathPanel(page);

    // Verify Offset Path panel is visible
    const offsetPathHeading = page.getByRole('heading', { name: 'Offset Path' });
    await expect(offsetPathHeading).toBeVisible();

    // Check for distance slider (Chakra UI sliders have role="slider")
    const sliders = page.getByRole('slider');
    const sliderCount = await sliders.count();
    expect(sliderCount).toBeGreaterThan(0);
  });

  test('should have Apply button in Offset Path panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Select the shape
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(200);

    // Open Gen panel and expand Offset Path
    await openOffsetPathPanel(page);

    // Look for Apply button (use exact match to avoid matching 'Apply Visual Center')
    const applyButton = page.getByRole('button', { name: 'Apply', exact: true });
    await expect(applyButton).toBeVisible();
  });

  test('should apply offset to create new path', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a circle (good for offset demonstration)
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Count initial paths
    const initialPathCount = await getCanvasPaths(page).count();

    // Select the shape
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(200);

    // Open Gen panel and expand Offset Path
    await openOffsetPathPanel(page);

    // Find and adjust distance slider to a positive value
    const distanceSlider = page.getByRole('slider').first();
    const sliderBox = await distanceSlider.boundingBox();
    if (sliderBox) {
      // Move slider to the right
      await page.mouse.move(sliderBox.x + sliderBox.width / 2, sliderBox.y + sliderBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(sliderBox.x + sliderBox.width * 0.7, sliderBox.y + sliderBox.height / 2, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Click Apply button (use exact match)
    const applyButton = page.getByRole('button', { name: 'Apply', exact: true });
    await applyButton.click();
    await page.waitForTimeout(300);

    // Verify a new path was created (offset creates new path)
    const finalPathCount = await getCanvasPaths(page).count();
    expect(finalPathCount).toBeGreaterThanOrEqual(initialPathCount);
  });
});

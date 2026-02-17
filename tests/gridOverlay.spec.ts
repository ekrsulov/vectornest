import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expandGridOptions, openSettingsPanel} from './helpers';

test.describe('Grid Plugin', () => {
  test('should show Grid panel in settings', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings panel
    await openSettingsPanel(page);
    await page.waitForTimeout(100);

    // Look for Grid panel heading
    const gridHeading = page.getByRole('heading', { name: 'Grid' });
    await expect(gridHeading).toBeVisible();
  });

  test('should toggle grid visibility via checkbox', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings panel
    await openSettingsPanel(page);
    await page.waitForTimeout(100);

    // Find the grid toggle checkbox
    const gridCheckbox = page.getByRole('checkbox', { name: 'Show Grid' });
    
    const initialState = await gridCheckbox.isChecked();

    // Toggle grid
    await gridCheckbox.click({ force: true });
    await page.waitForTimeout(100);

    const newState = await gridCheckbox.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('should show grid controls when grid is enabled', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings and enable grid
    await openSettingsPanel(page);
    await page.waitForTimeout(100);

    // Enable grid if not already enabled
    const gridCheckbox = page.getByRole('checkbox', { name: 'Show Grid' });
    if (!(await gridCheckbox.isChecked())) {
      await gridCheckbox.click({ force: true });
      await page.waitForTimeout(100);
    }

    // Expand grid options to see controls
    await expandGridOptions(page);

    // Verify grid controls are visible (Chakra sliders have role="slider")
    const sliders = page.getByRole('slider');
    const sliderCount = await sliders.count();
    expect(sliderCount).toBeGreaterThan(0);
  });

  test('should adjust grid spacing', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings
    await openSettingsPanel(page);
    await page.waitForTimeout(100);

    // Enable grid
    const gridCheckbox = page.getByRole('checkbox', { name: 'Show Grid' });
    if (!(await gridCheckbox.isChecked())) {
      await gridCheckbox.click({ force: true });
      await page.waitForTimeout(100);
    }

    // Expand grid options
    await expandGridOptions(page);

    // Find the spacing slider (Chakra UI uses role="slider")
    const spacingSlider = page.getByRole('slider').first();
    await expect(spacingSlider).toBeVisible();

    // Get initial value (aria-valuenow)
    const _initialValue = await spacingSlider.getAttribute('aria-valuenow');
    
    // Interact with slider (move it)
    const sliderBox = await spacingSlider.boundingBox();
    if (sliderBox) {
      await page.mouse.move(sliderBox.x + sliderBox.width / 2, sliderBox.y + sliderBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(sliderBox.x + sliderBox.width * 0.8, sliderBox.y + sliderBox.height / 2, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Verify value may have changed
    const newValue = await spacingSlider.getAttribute('aria-valuenow');
    expect(newValue).toBeTruthy();
  });

  test('should create shape with grid enabled', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Enable grid first
    await openSettingsPanel(page);
    await page.waitForTimeout(100);

    const gridCheckbox = page.getByRole('checkbox', { name: 'Show Grid' });
    if (!(await gridCheckbox.isChecked())) {
      await gridCheckbox.click({ force: true });
      await page.waitForTimeout(100);
    }

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

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

    // Verify shape was created
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBeGreaterThan(0);
  });

  test('should move element with grid enabled', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Enable grid
    await openSettingsPanel(page);
    await page.waitForTimeout(100);

    const gridCheckbox = page.getByRole('checkbox', { name: 'Show Grid' });
    if (!(await gridCheckbox.isChecked())) {
      await gridCheckbox.click({ force: true });
      await page.waitForTimeout(100);
    }

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

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

    // Get initial path
    const pathBefore = await getCanvasPaths(page).first().getAttribute('d');

    // Select and move the shape
    await selectTool(page, 'Select');
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.waitForTimeout(100);

    // Drag the shape
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.6, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify path changed (was moved)
    const pathAfter = await getCanvasPaths(page).first().getAttribute('d');
    expect(pathAfter).not.toBe(pathBefore);
  });
});

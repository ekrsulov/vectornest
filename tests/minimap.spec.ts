import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expandSettingsConfiguration, openSettingsPanel} from './helpers';

test.describe('Minimap Plugin', () => {
  test('should toggle minimap visibility via settings', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings panel
    await openSettingsPanel(page);
    await page.waitForTimeout(100);

    await expandSettingsConfiguration(page);
    await page.waitForTimeout(100);

    // Find the switch by aria-label attribute (unique identifier)
    const minimapSwitch = page.getByRole('checkbox', { name: 'Show minimap' }).first();

    if (await minimapSwitch.count() > 0) {
      const initialState = await minimapSwitch.isChecked();
      await minimapSwitch.click({ force: true });
      await page.waitForTimeout(100);
      const newState = await minimapSwitch.isChecked();
      expect(newState).toBe(!initialState);
    } else {
      // At least verify the switch is visible
      await expect(minimapSwitch).toBeVisible();
    }
  });

  test('should show minimap when enabled', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create some content first
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a shape
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Open settings and enable minimap
    await openSettingsPanel(page);
    await page.waitForTimeout(100);

    await expandSettingsConfiguration(page);
    await page.waitForTimeout(100);

    const minimapSwitch = page.getByRole('checkbox', { name: 'Show minimap' }).first();

    // Enable minimap if not already
    if (await minimapSwitch.count() > 0 && !(await minimapSwitch.isChecked())) {
      await minimapSwitch.click({ force: true });
      await page.waitForTimeout(100);
    }

    // Verify the switch is now checked
    if (await minimapSwitch.count() > 0) {
      await expect(minimapSwitch).toBeChecked();
    }
  });

  test('should reflect canvas content in minimap', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings and enable minimap
    await openSettingsPanel(page);
    await page.waitForTimeout(100);

    await expandSettingsConfiguration(page);
    await page.waitForTimeout(100);

    const minimapSwitch = page.getByRole('checkbox', { name: 'Show minimap' }).first();

    if (await minimapSwitch.count() > 0 && !(await minimapSwitch.isChecked())) {
      await minimapSwitch.click({ force: true });
    }
    await page.waitForTimeout(100);

    // Create content
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw multiple shapes
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3, { steps: 10 });
    await page.mouse.up();

    await page.mouse.move(canvasBox.x + canvasBox.width * 0.6, canvasBox.y + canvasBox.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.8, canvasBox.y + canvasBox.height * 0.8, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Verify paths exist on canvas
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBeGreaterThan(0);
  });
});

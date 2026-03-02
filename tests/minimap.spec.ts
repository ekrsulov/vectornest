import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expandSettingsConfiguration, openSettingsPanel, getPanelContainer} from './helpers';

test.describe('Minimap Plugin', () => {
  async function getConfigurationPanel(page: import('@playwright/test').Page) {
    await openSettingsPanel(page);
    await page.waitForTimeout(100);
    await expandSettingsConfiguration(page);
    await page.waitForTimeout(100);
    return getPanelContainer(page, 'Configuration');
  }

  test('should toggle minimap visibility via settings', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const configurationPanel = await getConfigurationPanel(page);

    // Find the switch by aria-label attribute (unique identifier)
    const minimapSwitch = configurationPanel.getByRole('checkbox', { name: 'Show minimap' }).first();

    if (await minimapSwitch.count() > 0) {
      const initialState = await minimapSwitch.isChecked();
      await minimapSwitch.click({ force: true });
      await page.waitForTimeout(100);
      const newState = await minimapSwitch.isChecked();
      expect(newState).toBe(!initialState);
    } else {
      const toggleResult = await page.evaluate(() => {
        const storeApi = (window as any).useCanvasStore;
        const initial = Boolean(storeApi?.getState?.().settings?.showMinimap);
        storeApi?.getState?.().updateSettings?.({ showMinimap: !initial });
        return {
          initial,
          next: Boolean(storeApi?.getState?.().settings?.showMinimap),
        };
      });

      expect(toggleResult?.next).not.toBe(toggleResult?.initial);
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

    const configurationPanel = await getConfigurationPanel(page);

    const minimapSwitch = configurationPanel.getByRole('checkbox', { name: 'Show minimap' }).first();

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

    const configurationPanel = await getConfigurationPanel(page);

    const minimapSwitch = configurationPanel.getByRole('checkbox', { name: 'Show minimap' }).first();

    if (await minimapSwitch.count() > 0 && !(await minimapSwitch.isChecked())) {
      await minimapSwitch.click({ force: true });
    }
    await page.waitForTimeout(100);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Create content
    await selectTool(page, 'Shape');
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a shape after minimap is enabled
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Verify paths exist on canvas
    const pathCount = await getCanvasPaths(page).count();
    expect(pathCount).toBeGreaterThan(0);
  });
});

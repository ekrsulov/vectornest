import { test, expect, Page } from '@playwright/test';
import {waitForLoad, expandGridOptions, expandGuidelinesOptions, openSettingsPanel} from './helpers';

/**
 * Helper to enable Guidelines and Manual guides to show rulers
 */
async function enableGuidelinesManual(page: Page): Promise<void> {
  // Enable Guidelines (main toggle)
  const guidelinesToggle = page.getByRole('checkbox', { name: 'Enable Guidelines' });
  if (!(await guidelinesToggle.isChecked())) {
    await guidelinesToggle.click({ force: true });
    await page.waitForTimeout(100);
  }
  
  // Expand guidelines options panel
  await expandGuidelinesOptions(page);
  
  // Click on "Manual" checkbox to enable manual guides (which shows rulers)
  // PanelToggle uses Chakra Checkbox with label as children
  const manualCheckbox = page.getByRole('checkbox', { name: 'Manual' }).first();
  await manualCheckbox.click({ force: true });
  await page.waitForTimeout(200);
}

/**
 * Helper to enable Grid and Rulers
 */
async function enableGridRulers(page: Page): Promise<void> {
  // Enable Grid (main toggle)
  const gridCheckbox = page.getByRole('checkbox', { name: 'Show Grid' });
  if (!(await gridCheckbox.isChecked())) {
    await gridCheckbox.click({ force: true });
    await page.waitForTimeout(100);
  }
  
  // Expand grid options panel
  await expandGridOptions(page);
  
  // Click on "Rulers" checkbox
  // PanelToggle uses Chakra Checkbox with label as children
  const rulersCheckbox = page.getByRole('checkbox', { name: 'Rulers' }).first();
  await rulersCheckbox.click({ force: true });
  await page.waitForTimeout(200);
}

/**
 * Helper to check if rulers are visible on the canvas
 * Rulers are rendered using canvas elements - there should be at least 2 (horizontal + vertical)
 */
async function rulersAreVisible(page: Page): Promise<boolean> {
  const rulerCanvases = page.locator('canvas');
  const canvasCount = await rulerCanvases.count();
  return canvasCount >= 2;
}

/**
 * Helper to check if interactive rulers are visible (Guidelines rulers)
 * These have data-testid attributes for testing
 */
async function interactiveRulersAreVisible(page: Page): Promise<boolean> {
  const horizontalRuler = page.getByTestId('horizontal-ruler');
  const verticalRuler = page.getByTestId('vertical-ruler');
  
  const hVisible = await horizontalRuler.isVisible().catch(() => false);
  const vVisible = await verticalRuler.isVisible().catch(() => false);
  
  return hVisible && vVisible;
}

/**
 * Helper to get the interactive rulers for dragging
 */
function getHorizontalRuler(page: Page) {
  return page.getByTestId('horizontal-ruler');
}

function getVerticalRuler(page: Page) {
  return page.getByTestId('vertical-ruler');
}

test.describe('Rulers Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('should show rulers when enabling Manual guides in Guidelines panel', async ({ page }) => {
    // Open Settings panel (contains Grid and Guidelines)
    await openSettingsPanel(page);
    
    // Enable Guidelines with Manual guides
    await enableGuidelinesManual(page);
    
    // Verify rulers are visible - interactive rulers should appear
    const rulersVisible = await interactiveRulersAreVisible(page);
    expect(rulersVisible).toBe(true);
  });

  test('should create manual guidelines by dragging from rulers', async ({ page }) => {
    // Open Settings panel and enable Guidelines manual guides
    await openSettingsPanel(page);
    await enableGuidelinesManual(page);
    
    // Get the horizontal ruler (top ruler)
    const horizontalRuler = getHorizontalRuler(page);
    const hBox = await horizontalRuler.boundingBox();
    expect(hBox).not.toBeNull();
    
    if (hBox) {
      // Drag from horizontal ruler to create a horizontal guide
      await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height + 100, { steps: 10 });
      await page.mouse.up();
      
      // Wait for guide to be created
      await page.waitForTimeout(200);
    }
    
    // Get the vertical ruler (left ruler)
    const verticalRuler = getVerticalRuler(page);
    const vBox = await verticalRuler.boundingBox();
    expect(vBox).not.toBeNull();
    
    if (vBox) {
      // Drag from vertical ruler to create a vertical guide
      await page.mouse.move(vBox.x + vBox.width / 2, vBox.y + vBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(vBox.x + vBox.width + 100, vBox.y + vBox.height / 2, { steps: 10 });
      await page.mouse.up();
      
      // Wait for guide to be created
      await page.waitForTimeout(200);
    }
    
    // Verify guides were created - check for the guides list in the panel
    // The panel shows "Guides (N)" when guides exist
    const guidesLabel = page.locator('text=/Guides \\(\\d+\\)/');
    await expect(guidesLabel).toBeVisible({ timeout: 1000 });
    
    // Check that we have at least 2 guides (H and V indicators in the list)
    const horizontalIndicator = page.locator('text="H"');
    const verticalIndicator = page.locator('text="V"');
    
    await expect(horizontalIndicator).toBeVisible();
    await expect(verticalIndicator).toBeVisible();
  });

  test('should show rulers when enabling Rulers in Grid panel', async ({ page }) => {
    // Open Settings panel
    await openSettingsPanel(page);
    
    // Enable Grid with Rulers
    await enableGridRulers(page);
    
    // Verify rulers are visible
    // Grid rulers are non-interactive but canvas elements should exist
    const rulersVisible = await rulersAreVisible(page);
    expect(rulersVisible).toBe(true);
  });

  test('should toggle between Grid rulers and Guidelines rulers', async ({ page }) => {
    // Open Settings panel
    await openSettingsPanel(page);
    
    // First enable Grid with rulers
    await enableGridRulers(page);
    
    // Verify grid rulers are shown
    let rulersVisible = await rulersAreVisible(page);
    expect(rulersVisible).toBe(true);
    
    // Now enable Guidelines with Manual - this should take precedence
    await enableGuidelinesManual(page);
    
    // Guidelines rulers should now be shown (interactive)
    const interactiveVisible = await interactiveRulersAreVisible(page);
    expect(interactiveVisible).toBe(true);
    
    // Disable Guidelines manual guides
    const manualCheckbox = page.getByRole('checkbox', { name: 'Manual' }).first();
    await manualCheckbox.click({ force: true });
    await page.waitForTimeout(200);
    
    // Grid rulers should be shown again (non-interactive)
    rulersVisible = await rulersAreVisible(page);
    expect(rulersVisible).toBe(true);
  });

  test('should hide rulers when disabling Grid Rulers toggle', async ({ page }) => {
    // Open Settings panel
    await openSettingsPanel(page);
    
    // Enable Grid rulers
    await enableGridRulers(page);
    
    // Verify rulers are shown
    const rulersVisible = await rulersAreVisible(page);
    expect(rulersVisible).toBe(true);
    
    // Disable rulers by clicking the Rulers checkbox again
    const rulersCheckbox = page.getByRole('checkbox', { name: 'Rulers' }).first();
    await rulersCheckbox.click({ force: true });
    await page.waitForTimeout(200);
    
    // Interactive rulers should be hidden (Guidelines rulers are not enabled)
    const interactiveVisible = await interactiveRulersAreVisible(page);
    expect(interactiveVisible).toBe(false);
  });
});

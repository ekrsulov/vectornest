import { test, expect, Page } from '@playwright/test';
import {waitForLoad, expandGuidelinesOptions, openSettingsPanel, getPanelContainer, selectTool, getCanvasPaths} from './helpers';

async function bootstrap(page: Page): Promise<void> {
  await page.goto('/');
  await waitForLoad(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage?.clear();
  });
  await page.reload();
  await waitForLoad(page);
}

/**
 * Helper to enable Guidelines and Manual guides to show rulers
 */
async function enableGuidelinesManual(page: Page): Promise<void> {
  const guidelinesPanel = await getPanelContainer(page, 'Guidelines');
  // Enable Guidelines (main toggle)
  const guidelinesToggle = guidelinesPanel.getByRole('checkbox', { name: 'Enable Guidelines' });
  if (!(await guidelinesToggle.isChecked())) {
    await guidelinesToggle.click({ force: true });
    await page.waitForTimeout(100);
  }
  
  // Expand guidelines options panel
  await expandGuidelinesOptions(page);
  
  // Click on "Manual" checkbox to enable manual guides (which shows rulers)
  const manualCheckbox = guidelinesPanel.getByRole('checkbox', { name: 'Manual' }).first();
  await manualCheckbox.click({ force: true });
  await page.waitForTimeout(200);
}

/**
 * Helper to enable Grid and Rulers
 */
async function enableGridRulers(page: Page): Promise<void> {
  await getPanelContainer(page, 'Grid');
  await page.evaluate(() => {
    const store = (window as any).useCanvasStore?.getState?.();
    store?.updateGridState?.({ enabled: true, showRulers: true });
  });
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

async function createSelectedRectangle(
  page: Page,
  { x = 80, y = 110, width = 120, height = 80 }: { x?: number; y?: number; width?: number; height?: number } = {}
): Promise<void> {
  await page.evaluate(({ x, y, width, height }) => {
    const storeApi = window.useCanvasStore;
    if (!storeApi) {
      throw new Error('Canvas store is not available');
    }

    const { addElement, selectElements } = storeApi.getState();
    const id = addElement({
      type: 'path',
      data: {
        subPaths: [[
          { type: 'M', position: { x, y } },
          { type: 'L', position: { x: x + width, y } },
          { type: 'L', position: { x: x + width, y: y + height } },
          { type: 'L', position: { x, y: y + height } },
          { type: 'Z' },
        ]],
        strokeWidth: 1,
        strokeColor: '#000000',
        strokeOpacity: 1,
        fillColor: '#ffffff',
        fillOpacity: 1,
      },
    });

    selectElements([id]);
  }, { x, y, width, height });

  await page.waitForTimeout(150);
}

test.describe('Rulers Tests', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrap(page);
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
    const guidelinesPanel = await getPanelContainer(page, 'Guidelines');
    const manualCheckbox = guidelinesPanel.getByRole('checkbox', { name: 'Manual' }).first();
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
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      store?.updateGridState?.({ showRulers: false });
    });
    await page.waitForTimeout(200);
    
    // Interactive rulers should be hidden (Guidelines rulers are not enabled)
    const interactiveVisible = await interactiveRulersAreVisible(page);
    expect(interactiveVisible).toBe(false);
  });

  test('should project the current selection onto both rulers and update while moving', async ({ page }) => {
    await openSettingsPanel(page);
    await enableGridRulers(page);
    await createSelectedRectangle(page);
    await selectTool(page, 'Select');

    const horizontalBand = page.getByTestId('horizontal-ruler-selection-band');
    const verticalBand = page.getByTestId('vertical-ruler-selection-band');

    await expect(horizontalBand).toBeVisible();
    await expect(verticalBand).toBeVisible();

    const initialHorizontalBox = await horizontalBand.boundingBox();
    const initialVerticalBox = await verticalBand.boundingBox();
    expect(initialHorizontalBox).not.toBeNull();
    expect(initialVerticalBox).not.toBeNull();

    const canvasPath = getCanvasPaths(page).first();
    const pathBox = await canvasPath.boundingBox();
    expect(pathBox).not.toBeNull();

    if (!initialHorizontalBox || !initialVerticalBox || !pathBox) {
      throw new Error('Expected ruler bands and path to have bounding boxes');
    }

    await page.mouse.move(pathBox.x + pathBox.width / 2, pathBox.y + pathBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      pathBox.x + pathBox.width / 2 + 90,
      pathBox.y + pathBox.height / 2 + 60,
      { steps: 8 }
    );
    await page.waitForTimeout(100);

    const midDragHorizontalBox = await horizontalBand.boundingBox();
    const midDragVerticalBox = await verticalBand.boundingBox();

    await page.mouse.up();

    expect(midDragHorizontalBox).not.toBeNull();
    expect(midDragVerticalBox).not.toBeNull();

    if (!midDragHorizontalBox || !midDragVerticalBox) {
      throw new Error('Expected ruler bands to update during drag');
    }

    expect(midDragHorizontalBox.x).toBeGreaterThan(initialHorizontalBox.x + 40);
    expect(midDragVerticalBox.y).toBeGreaterThan(initialVerticalBox.y + 20);
  });

  test('should move the context bar below the rulers when rulers are active', async ({ page }) => {
    await createSelectedRectangle(page);
    await selectTool(page, 'Select');

    const contextBar = page.getByTestId('context-bar');
    await expect(contextBar).toBeVisible();

    const initialBox = await contextBar.boundingBox();
    expect(initialBox).not.toBeNull();

    await page.evaluate(() => {
      const store = (window as any).useCanvasStore?.getState?.();
      store?.updateGridState?.({ enabled: true, showRulers: true });
    });
    await page.waitForTimeout(150);

    const shiftedBox = await contextBar.boundingBox();
    expect(shiftedBox).not.toBeNull();

    if (!initialBox || !shiftedBox) {
      throw new Error('Expected context bar to have a bounding box before and after enabling rulers');
    }

    expect(shiftedBox.y).toBeGreaterThan(initialBox.y + 10);
    expect(shiftedBox.y).toBeGreaterThanOrEqual(20);
  });
});

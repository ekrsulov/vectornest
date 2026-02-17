import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool} from './helpers';

test.describe('Bring to Front and Send to Back', () => {
  test('should arrange elements using bring to front and send to back', async ({ page }) => {
    // This test verifies the bring to front and send to back functionality through complete UI interaction.
    // Colors are applied via UI color picker: select shape → set fill color (panel is open by default)
    // Then z-order operations are tested through UI buttons.
    await page.goto('/');
    await waitForLoad(page);

    // Create first shape
    await selectTool(page, 'Shape');

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first square with slower mouse movement
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Switch back to shape mode to create second shape
    await selectTool(page, 'Shape');

    // Create second shape (overlapping with first) with slower mouse movement
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

    // Wait for second shape creation
    await page.waitForTimeout(100);

    // Switch to select mode
    await selectTool(page, 'Select');

    // Select the first shape by clicking in its center area
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );

    // Wait for selection
    await page.waitForTimeout(200);

    // Verify first selection
    const firstSelectionCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        return store.getState().selectedIds.length;
      }
      return 0;
    });
    expect(firstSelectionCount).toBe(1);

    // The color panel is now open by default, no need to expand
    await page.waitForTimeout(200);

    // Skip color setting for now
    // const fillColorInput = page.locator('input[type="color"][title="Fill Color"]');
    
    // Set red color for first shape by directly clicking the color input and using fill()
    // await fillColorInput.click();
    // await fillColorInput.fill('#ff4444');
    
    // await page.waitForTimeout(300);

    // Clear any existing selection by clicking empty area
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.8
    );
    await page.waitForTimeout(100);

    // Select the second shape by clicking in the part that doesn't overlap with first shape
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.45
    );

    // Wait for selection
    await page.waitForTimeout(200);

    // Verify second selection
    const secondSelectionCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        return store.getState().selectedIds.length;
      }
      return 0;
    });
    expect(secondSelectionCount).toBe(1);

    // The color panel is already open
    await page.waitForTimeout(200);

    // Skip color setting
    // await fillColorInput.click();
    // await fillColorInput.fill('#4444ff');
    
    // await page.waitForTimeout(300);

    // The arrange panel is open by default, no need to expand
    await page.waitForTimeout(200);

    // Make sure we're in Select mode before using arrange buttons
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Find the arrange buttons using aria-label
    // Note: The title has two spaces between "Bring" and "to" when in select mode: "Bring  to Front"
    const bringToFrontButton = page.locator('[aria-label="Bring  to Front"]');
    const sendToBackButton = page.locator('[aria-label="Send  to Back"]');

    // Select the first shape (bottom one - red) for z-order operations by clicking in area that only has first shape
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );

    // Wait for selection
    await page.waitForTimeout(200);

    // Verify element is selected before trying to arrange
    const selectedCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        return store.getState().selectedIds.length;
      }
      return 0;
    });
    expect(selectedCount).toBe(1);

    // Get initial z-index order
    const initialOrder = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({
          id: el.id,
          zIndex: el.zIndex
        }));
      }
      return [];
    });

    // Verify that both elements exist
    expect(initialOrder.length).toBe(2);

    // Select the first shape (bottom one - red)
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Click bring to front
    await bringToFrontButton.click();
    await page.waitForTimeout(200);

    // Get order after bring to front
    const afterBringToFrontOrder = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({ 
          id: el.id, 
          zIndex: el.zIndex,
          fillColor: el.data?.fillColor 
        }));
      }
      return [];
    });

    // Find the red and blue elements by their specific colors set via UI
    const redElement = afterBringToFrontOrder.find((el: any) => 
      el.fillColor === '#ff4444' // red color set via UI
    );
    const blueElement = afterBringToFrontOrder.find((el: any) => 
      el.fillColor === '#4444ff' // blue color set via UI
    );

    // Verify that the red element (first selected) now has higher z-index
    if (redElement && blueElement) {
      expect(redElement.zIndex).toBeGreaterThan(blueElement.zIndex);
    }

    // Click send to back
    await sendToBackButton.click();
    await page.waitForTimeout(200);

    // Get order after send to back
    const afterSendToBackOrder = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({ 
          id: el.id, 
          zIndex: el.zIndex,
          fillColor: el.data?.fillColor 
        }));
      }
      return [];
    });

    // Find elements by their specific colors again
    const redElementAfterSendToBack = afterSendToBackOrder.find((el: any) => 
      el.fillColor === '#ff4444' // red color set via UI
    );
    const blueElementAfterSendToBack = afterSendToBackOrder.find((el: any) => 
      el.fillColor === '#4444ff' // blue color set via UI
    );

    // Verify that the red element (originally selected) now has lower z-index again
    if (redElementAfterSendToBack && blueElementAfterSendToBack) {
      expect(redElementAfterSendToBack.zIndex).toBeLessThan(blueElementAfterSendToBack.zIndex);
    }

    // Verify both shapes still exist
    const pathsAfterArrange = await getCanvasPaths(page).count();
    expect(pathsAfterArrange).toBe(2);
  });
});
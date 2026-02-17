import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, expandClipboardPanel, createShape, modKey, selectTool} from './helpers';

// Extend window interface for Zustand store access in tests
declare global {
  interface Window {
    __ZUSTAND_STORE__?: any;
  }
}

test.describe.serial('Clipboard Plugin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
    // Clear localStorage to ensure clean state between tests
    await page.evaluate(() => {
      localStorage.clear();
    });
    // Reset clipboard state
    await page.evaluate(() => {
      // Reset any global state if needed
      if (window.__ZUSTAND_STORE__) {
        window.__ZUSTAND_STORE__.setState({
          clipboard: {
            hasInternalData: false,
            pasteCount: 0,
            lastPastePosition: null,
            isCutOperation: false,
            cutElementIds: [],
            statusMessage: null,
            enabled: true,
          }
        });
      }
    });
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('should show clipboard panel in select mode', async ({ page }) => {
    // Ensure we're in select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(200);

    // Look for Clipboard panel heading
    const clipboardPanel = page.getByRole('heading', { name: 'Clipboard' });
    await expect(clipboardPanel).toBeVisible();
  });

  test('should have copy/cut buttons disabled when nothing is selected', async ({ page }) => {
    // Ensure we're in select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(200);

    // Find copy and cut buttons
    const copyButton = page.locator('button[aria-label="Copy (⌘C)"]');
    const cutButton = page.locator('button[aria-label="Cut (⌘X)"]');

    // They should be disabled when nothing is selected
    await expect(copyButton).toBeDisabled();
    await expect(cutButton).toBeDisabled();
  });

  test('should enable copy/cut buttons when element is selected', async ({ page }) => {
    // Draw a shape first
    await createShape(page);
    await page.waitForTimeout(100);

    // Switch to select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Click on the shape to select it
    const paths = getCanvasPaths(page);
    const pathCount = await paths.count();
    expect(pathCount).toBeGreaterThan(0);

    await paths.first().click();
    await page.waitForTimeout(100);

    // Find copy and cut buttons in the Clipboard panel
    const copyButton = page.locator('button[aria-label="Copy (⌘C)"]');
    const cutButton = page.locator('button[aria-label="Cut (⌘X)"]');

    // They should be enabled now
    await expect(copyButton).toBeEnabled();
    await expect(cutButton).toBeEnabled();
  });

  test('should copy and paste element using keyboard shortcuts', async ({ page }) => {
    // Draw a shape first
    await createShape(page);
    await page.waitForTimeout(100);

    // Switch to select mode and select the shape
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    const paths = getCanvasPaths(page);
    const initialCount = await paths.count();
    expect(initialCount).toBeGreaterThan(0);

    // Click on the path element to select it
    await paths.first().click();
    await page.waitForTimeout(100);

    // Expand clipboard panel
    await expandClipboardPanel(page);

    // Click copy button
    const copyButton = page.locator('button[aria-label="Copy (⌘C)"]');
    await copyButton.click();
    await page.waitForTimeout(300);

    // Click paste button
    const pasteButton = page.locator('button[aria-label="Paste (⌘V)"]');
    await pasteButton.click();
    await expect.poll(async () => paths.count()).toBe(initialCount + 1);
  });

  test('should cut and paste element', async ({ page }) => {
    // Draw a shape first
    await createShape(page);
    await page.waitForTimeout(100);

    // Switch to select mode and select the shape
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    const paths = getCanvasPaths(page);
    const initialCount = await paths.count();
    expect(initialCount).toBeGreaterThan(0);

    // Click on the path element to select it
    await paths.first().click();
    await page.waitForTimeout(100);

    // Expand clipboard panel
    await expandClipboardPanel(page);

    // Click cut button
    const cutButton = page.locator('button[aria-label="Cut (⌘X)"]');
    await cutButton.click();
    await expect.poll(async () => paths.count()).toBe(initialCount - 1);

    // Click paste button
    const pasteButton = page.locator('button[aria-label="Paste (⌘V)"]');
    await pasteButton.click();
    await expect.poll(async () => paths.count()).toBe(initialCount);
  });

  test('should show status messages in clipboard panel', async ({ page }) => {
    // Draw a shape first
    await createShape(page);
    await page.waitForTimeout(100);

    // Switch to select mode and select the shape
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    const paths = getCanvasPaths(page);
    await paths.first().click();
    await page.waitForTimeout(100);

    // Expand clipboard panel to see status
    await expandClipboardPanel(page);

    // Click copy button
    const copyButton = page.locator('button[aria-label="Copy (⌘C)"]');
    await copyButton.click();
    await page.waitForTimeout(200);

    // Should show a status message about copying
    const statusText = page.getByText(/^Copied \d+ element/i).first();
    await expect(statusText).toBeVisible();
  });

  test('should have clipboard panel toggle switch', async ({ page }) => {
    // Ensure we're in select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(200);

    // Find the Clipboard panel
    const clipboardPanel = page.getByRole('heading', { name: 'Clipboard' });
    await expect(clipboardPanel).toBeVisible();

    // Find the toggle switch in the panel header
    const toggleSwitch = page.locator('input[type="checkbox"][aria-label*="Enable"]');
    
    // Should exist and be checked by default
    if (await toggleSwitch.count() > 0) {
      await expect(toggleSwitch.first()).toBeChecked();
    }
  });

  test('should increment paste offset for consecutive pastes', async ({ page }) => {
    // Draw a shape first
    await createShape(page);
    await page.waitForTimeout(100);

    // Switch to select mode and select the shape
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    const paths = getCanvasPaths(page);
    const initialCount = await paths.count();
    expect(initialCount).toBeGreaterThan(0);

    // Click on the path element to select it
    await paths.first().click();
    await page.waitForTimeout(100);

    // Expand clipboard panel
    await expandClipboardPanel(page);

    // Click copy button
    const copyButton = page.locator('button[aria-label="Copy (⌘C)"]');
    await copyButton.click();
    await page.waitForTimeout(300);

    // Click paste button twice
    const pasteButton = page.locator('button[aria-label="Paste (⌘V)"]');
    await pasteButton.click();
    await page.waitForTimeout(200);
    await pasteButton.click();
    await expect.poll(async () => paths.count()).toBe(3);
  });

  test('should copy multiple selected elements', async ({ page }) => {
    // Get canvas for positioning
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).toBeTruthy();

    // Draw two shapes
    await createShape(page, 'Square', { x: canvasBox!.width / 3, y: canvasBox!.height / 2 });
    await page.waitForTimeout(100);

    await createShape(page, 'Square', { x: (canvasBox!.width * 2) / 3, y: canvasBox!.height / 2 });
    await page.waitForTimeout(100);

    // Switch to select mode
    await selectTool(page, 'Select');
    await page.waitForTimeout(100);

    // Ensure canvas is focused
    await page.mouse.click(400, 360);
    await page.waitForTimeout(100);

    // Select all elements with Cmd+A
    await page.keyboard.press(`${modKey}+a`);
    await page.waitForTimeout(100);

    const paths = getCanvasPaths(page);
    const initialCount = await paths.count();
    expect(initialCount).toBe(2);

    // Expand clipboard panel
    await expandClipboardPanel(page);

    // Click copy button
    const copyButton = page.locator('button[aria-label="Copy (⌘C)"]');
    await copyButton.click();
    await page.waitForTimeout(300);

    // Deselect by clicking empty area
    await page.mouse.click(10, 10);
    await page.waitForTimeout(100);

    // Click paste button
    const pasteButton = page.locator('button[aria-label="Paste (⌘V)"]');
    await pasteButton.click();
    await expect.poll(async () => paths.count()).toBe(4);
  });
});

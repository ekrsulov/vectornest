import { expect, test } from '@playwright/test';
import { waitForLoad } from './helpers';

test.describe('Global Overlays', () => {
  test('should open the plugin selector dialog when its store flag changes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await page.waitForFunction(() => {
      const store = (window as unknown as { useCanvasStore?: { getState?: () => { setPluginSelectorDialogOpen?: (isOpen: boolean) => void } } }).useCanvasStore;
      return typeof store?.getState?.().setPluginSelectorDialogOpen === 'function';
    });

    await page.evaluate(() => {
      const store = (window as unknown as { useCanvasStore?: { getState?: () => { setPluginSelectorDialogOpen?: (isOpen: boolean) => void } } }).useCanvasStore;
      store?.getState?.().setPluginSelectorDialogOpen?.(true);
    });

    await expect(page.locator('[role="dialog"]').filter({ hasText: 'Select Plugins' })).toBeVisible();
  });

  test('should open the animation workspace dialog when its store flag changes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await page.waitForFunction(() => {
      const store = (window as unknown as { useCanvasStore?: { getState?: () => { setAnimationWorkspaceOpen?: (isOpen: boolean) => void } } }).useCanvasStore;
      return typeof store?.getState?.().setAnimationWorkspaceOpen === 'function';
    });

    await page.evaluate(() => {
      const store = (window as unknown as { useCanvasStore?: { getState?: () => { setAnimationWorkspaceOpen?: (isOpen: boolean) => void } } }).useCanvasStore;
      store?.getState?.().setAnimationWorkspaceOpen?.(true);
    });

    await expect(page.locator('[role="dialog"]').filter({ hasText: 'Animation Workspace' })).toBeVisible();
  });

  test('should show and hide the minimap when its store flag changes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForLoad(page);

    const minimap = page.getByTestId('minimap-minimized');

    await page.waitForFunction(() => {
      const store = (window as unknown as { useCanvasStore?: { getState?: () => { updateSettings?: (settings: { showMinimap: boolean; withoutDistractionMode?: boolean }) => void } } }).useCanvasStore;
      return typeof store?.getState?.().updateSettings === 'function';
    });

    await page.evaluate(() => {
      const store = (window as unknown as { useCanvasStore?: { getState?: () => { updateSettings?: (settings: { showMinimap: boolean; withoutDistractionMode?: boolean }) => void } } }).useCanvasStore;
      store?.getState?.().updateSettings?.({ showMinimap: false, withoutDistractionMode: false });
    });

    await expect(minimap).toHaveCount(0);

    await page.evaluate(() => {
      const store = (window as unknown as { useCanvasStore?: { getState?: () => { updateSettings?: (settings: { showMinimap: boolean; withoutDistractionMode?: boolean }) => void } } }).useCanvasStore;
      store?.getState?.().updateSettings?.({ showMinimap: true, withoutDistractionMode: false });
    });

    await expect(minimap).toBeAttached({ timeout: 5000 });
  });
});

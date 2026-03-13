import { test, expect } from '@playwright/test';
import { firstVisible, openSettingsPanel, waitForLoad } from './helpers';

test.describe('Reset App location', () => {
  test('shows Reset App in Prefs below Theme instead of File', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const fileButton = await firstVisible(page.getByRole('button', { name: 'File' }));
    await fileButton.click({ force: true });
    await page.waitForTimeout(200);

    const sidebar = page.locator('[data-sidebar-scroll-area="true"]');
    await expect(sidebar.getByRole('button', { name: 'Reset App' })).toHaveCount(0);

    await openSettingsPanel(page);

    const themeLabel = await firstVisible(page.getByText('Theme'));
    const resetButton = await firstVisible(page.getByRole('button', { name: 'Reset App' }));
    const configurationHeading = await firstVisible(page.getByRole('heading', { name: 'Configuration' }));

    await expect(resetButton).toBeVisible();

    const themeBox = await themeLabel.boundingBox();
    const resetBox = await resetButton.boundingBox();
    const configurationBox = await configurationHeading.boundingBox();

    expect(themeBox).not.toBeNull();
    expect(resetBox).not.toBeNull();
    expect(configurationBox).not.toBeNull();

    expect(resetBox!.y).toBeGreaterThan(themeBox!.y);
    expect(resetBox!.y).toBeLessThan(configurationBox!.y);
  });

  test('asks for confirmation before resetting the app', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await openSettingsPanel(page);

    const resetButton = await firstVisible(page.getByRole('button', { name: 'Reset App' }));
    await resetButton.click();

    await expect(page.getByText('Confirm Reset App')).toBeVisible();
    await expect(page.getByText('This will permanently remove all canvas content and reset the editor settings.')).toBeVisible();

    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await expect(page.getByText('Confirm Reset App')).toHaveCount(0);
  });
});

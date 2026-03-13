import { test, expect } from '@playwright/test';
import { expandPanelSection, firstVisible, openSettingsPanel, waitForLoad } from './helpers';

test.describe('LLM Assistant settings location', () => {
  test('shows LLM Assistant in Prefs instead of File', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const fileButton = await firstVisible(page.getByRole('button', { name: 'File' }));
    await fileButton.click({ force: true });
    await page.waitForTimeout(200);

    await expect(page.getByRole('heading', { name: 'LLM Assistant' })).toHaveCount(0);

    await openSettingsPanel(page);

    const llmAssistantHeading = await firstVisible(page.getByRole('heading', { name: 'LLM Assistant' }));
    await expect(llmAssistantHeading).toBeVisible();
    await expandPanelSection(page, 'LLM Assistant');
    await expect(page.getByText('Provider')).toBeVisible();
  });
});

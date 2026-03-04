import { test, expect, type Page, type Locator } from '@playwright/test';
import {
  expandPanelSection,
  expandSnapPointsOptions,
  firstVisible,
  openSettingsPanel,
  waitForLoad,
} from './helpers';

async function openSidebarSection(page: Page, label: string) {
  const button = await firstVisible(
    page.getByRole('button', { name: new RegExp(`^${label}$`) })
  );
  await button.click({ force: true });
  await page.waitForTimeout(250);
}

async function getPanelHeader(page: Page, heading: string): Promise<Locator> {
  return firstVisible(
    page.locator('[data-panel-header]').filter({
      has: page.getByRole('heading', { name: heading }),
    })
  );
}

async function expectPanelExpanded(page: Page, heading: string, expanded: boolean) {
  const header = await getPanelHeader(page, heading);
  await expect(header).toHaveAttribute('aria-expanded', expanded ? 'true' : 'false');
}

test.describe('Exclusive panel sections', () => {
  test('Prefs closes the previously open panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await openSettingsPanel(page);
    await expandPanelSection(page, 'Configuration');
    await expectPanelExpanded(page, 'Configuration', true);

    await expandSnapPointsOptions(page);

    await expectPanelExpanded(page, 'Snap Points', true);
    await expectPanelExpanded(page, 'Configuration', false);
  });

  test('Gen closes the previously open panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await openSidebarSection(page, 'Gen');
    await expandPanelSection(page, 'Gear Generator');
    await expectPanelExpanded(page, 'Gear Generator', true);

    await expandPanelSection(page, 'Noise Generator');

    await expectPanelExpanded(page, 'Noise Generator', true);
    await expectPanelExpanded(page, 'Gear Generator', false);
  });

  test('Audit closes the previously open panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await openSidebarSection(page, 'Audit');
    await expandPanelSection(page, 'Document Audit');
    await expectPanelExpanded(page, 'Document Audit', true);

    await expandPanelSection(page, 'SVG Size Analyzer');

    await expectPanelExpanded(page, 'SVG Size Analyzer', true);
    await expectPanelExpanded(page, 'Document Audit', false);
  });
});

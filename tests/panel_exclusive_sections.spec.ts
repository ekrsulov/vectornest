import { test, expect, type Page, type Locator } from '@playwright/test';
import {
  createShape,
  expectToolEnabled,
  expandPanelSection,
  expandRoundPathOptions,
  expandSmoothBrushOptions,
  getCanvas,
  getCanvasPaths,
  expandSnapPointsOptions,
  firstVisible,
  openSettingsPanel,
  selectTool,
  waitForLoad,
} from './helpers';

async function openSidebarSection(page: Page, label: string) {
  const labelPattern =
    label === 'Gen'
      ? /Generator Library|Gen|Generators/
      : label === 'Audit'
        ? /Audit|Audit Library/
        : label === 'Prefs'
          ? /Preferences|Prefs|Settings/
          : new RegExp(`^${label}$`);
  const button = await firstVisible(
    page.getByRole('button', { name: labelPattern })
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

async function expectHeadingOrder(page: Page, headings: string[]) {
  const positions: number[] = [];

  for (const heading of headings) {
    const locator = await firstVisible(page.getByRole('heading', { name: heading }));
    await expect(locator).toBeVisible();
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error(`Heading "${heading}" has no bounding box`);
    }
    positions.push(box.y);
  }

  for (let index = 1; index < positions.length; index += 1) {
    expect(positions[index]).toBeGreaterThan(positions[index - 1]);
  }
}

async function createSimplePathForEditing(page: Page) {
  await selectTool(page, 'Pencil');

  const canvas = getCanvas(page);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) {
    throw new Error('Canvas not found');
  }

  await page.mouse.move(canvasBox.x + canvasBox.width * 0.25, canvasBox.y + canvasBox.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.7, canvasBox.y + canvasBox.height * 0.6, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(100);
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

  test('Select closes the previously open panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await createShape(page);
    await selectTool(page, 'Select');

    const paths = getCanvasPaths(page);
    await paths.first().click();
    await page.waitForTimeout(100);

    await expandPanelSection(page, 'Clipboard');
    await expectPanelExpanded(page, 'Clipboard', true);

    await expandPanelSection(page, 'Select Similar');

    await expectPanelExpanded(page, 'Select Similar', true);
    await expectPanelExpanded(page, 'Clipboard', false);
  });

  test('Select orders visible panels alphabetically', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await createShape(page);
    await selectTool(page, 'Select');

    const paths = getCanvasPaths(page);
    await paths.first().click();
    await page.waitForTimeout(100);

    await expectHeadingOrder(page, [
      'Clipboard',
      'Color Harmony',
      'Filters',
      'Paints',
      'Select Similar',
    ]);
  });

  test('Edit closes the previously open panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await createSimplePathForEditing(page);

    await selectTool(page, 'Select');
    const paths = getCanvasPaths(page);
    await paths.first().click();
    await page.waitForTimeout(100);

    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');

    await expandSmoothBrushOptions(page);
    await expectPanelExpanded(page, 'Smooth Brush', true);

    await expandRoundPathOptions(page);

    await expectPanelExpanded(page, 'Round Path', true);
    await expectPanelExpanded(page, 'Smooth Brush', false);
  });

  test('Edit orders visible panels alphabetically', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await createSimplePathForEditing(page);

    await selectTool(page, 'Select');
    const paths = getCanvasPaths(page);
    await paths.first().click();
    await page.waitForTimeout(100);

    await expectToolEnabled(page, 'Edit');
    await selectTool(page, 'Edit');
    await page.waitForTimeout(150);

    const editPoints = page.locator('[data-edit-point-hit="true"]');
    await expect(editPoints.first()).toBeVisible();
    await editPoints.first().click();
    await page.waitForTimeout(100);

    await expectHeadingOrder(page, [
      'Add Point',
      'Path Simplification',
      'Point',
      'Round Path',
      'Smooth Brush',
    ]);
  });
});

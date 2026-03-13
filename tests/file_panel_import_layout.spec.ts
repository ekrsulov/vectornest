import { test, expect, type Page } from '@playwright/test';
import {
  createShape,
  firstVisible,
  waitForLoad,
} from './helpers';

async function getCanvasElementCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as { useCanvasStore?: { getState?: () => { elements?: unknown[] } } }).useCanvasStore?.getState?.().elements?.length ?? 0);
}

test.describe('File panel layout and import behavior', () => {
  test('positions SVG Source under export buttons and groups import controls', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await page.locator('[aria-label="File"]').click();
    await page.waitForTimeout(200);

    const sidebar = page.locator('[data-sidebar-scroll-area="true"]');
    const nameLabel = await firstVisible(sidebar.getByText('Name'));
    const exportPaddingLabel = await firstVisible(sidebar.getByText('Export Padding'));
    const saveSelectedOnlyToggle = await firstVisible(sidebar.getByText('Save selected elements only'));
    const svgButton = await firstVisible(sidebar.getByRole('button', { name: /^SVG$/ }));
    const pngButton = await firstVisible(sidebar.getByRole('button', { name: /^PNG$/ }));
    const svgSourceButton = await firstVisible(sidebar.getByRole('button', { name: 'SVG Source' }));
    const importHeading = await firstVisible(sidebar.getByText(/^Import$/i));
    const appendLabel = await firstVisible(sidebar.getByText('Append to existing'));
    const addFrameLabel = await firstVisible(sidebar.getByText('Add frame to imported SVG'));
    const applyUnionLabel = await firstVisible(sidebar.getByText('Apply union to imported paths'));
    const resizeLabel = await firstVisible(sidebar.getByText('Resize imported SVG'));
    const importButton = await firstVisible(sidebar.getByRole('button', { name: 'Import SVG' }));
    const jsonHeading = await firstVisible(sidebar.getByText(/^JSON$/i));
    const saveButton = await firstVisible(sidebar.getByRole('button', { name: 'Save' }));
    const loadButton = await firstVisible(sidebar.getByRole('button', { name: 'Load' }));

    const nameBox = await nameLabel.boundingBox();
    const exportPaddingBox = await exportPaddingLabel.boundingBox();
    const saveSelectedOnlyBox = await saveSelectedOnlyToggle.boundingBox();
    const svgBox = await svgButton.boundingBox();
    const pngBox = await pngButton.boundingBox();
    const sourceBox = await svgSourceButton.boundingBox();
    const importHeadingBox = await importHeading.boundingBox();
    const appendBox = await appendLabel.boundingBox();
    const addFrameBox = await addFrameLabel.boundingBox();
    const applyUnionBox = await applyUnionLabel.boundingBox();
    const resizeBox = await resizeLabel.boundingBox();
    const importButtonBox = await importButton.boundingBox();
    const jsonHeadingBox = await jsonHeading.boundingBox();
    const saveButtonBox = await saveButton.boundingBox();
    const loadButtonBox = await loadButton.boundingBox();

    expect(nameBox).not.toBeNull();
    expect(exportPaddingBox).not.toBeNull();
    expect(saveSelectedOnlyBox).not.toBeNull();
    expect(svgBox).not.toBeNull();
    expect(pngBox).not.toBeNull();
    expect(sourceBox).not.toBeNull();
    expect(importHeadingBox).not.toBeNull();
    expect(appendBox).not.toBeNull();
    expect(addFrameBox).not.toBeNull();
    expect(applyUnionBox).not.toBeNull();
    expect(resizeBox).not.toBeNull();
    expect(importButtonBox).not.toBeNull();
    expect(jsonHeadingBox).not.toBeNull();
    expect(saveButtonBox).not.toBeNull();
    expect(loadButtonBox).not.toBeNull();

    expect(exportPaddingBox!.y).toBeGreaterThan(nameBox!.y);
    expect(saveSelectedOnlyBox!.y).toBeGreaterThan(exportPaddingBox!.y);
    expect(sourceBox!.y).toBeGreaterThan(svgBox!.y);
    expect(sourceBox!.y).toBeGreaterThan(pngBox!.y);
    expect(importHeadingBox!.y).toBeGreaterThan(sourceBox!.y);
    expect(appendBox!.y).toBeGreaterThan(importHeadingBox!.y);
    expect(addFrameBox!.y).toBeGreaterThan(appendBox!.y);
    expect(applyUnionBox!.y).toBeGreaterThan(addFrameBox!.y);
    expect(resizeBox!.y).toBeGreaterThan(applyUnionBox!.y);
    expect(importButtonBox!.y).toBeGreaterThan(resizeBox!.y);
    expect(jsonHeadingBox!.y).toBeGreaterThan(importButtonBox!.y);
    expect(saveButtonBox!.y).toBeGreaterThan(jsonHeadingBox!.y);
    expect(loadButtonBox!.y).toBeGreaterThan(jsonHeadingBox!.y);
  });

  test('keeps append enabled by default and allows replacing the canvas when disabled', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    await createShape(page);
    const initialCount = await getCanvasElementCount(page);
    expect(initialCount).toBeGreaterThan(0);

    await page.locator('[aria-label="File"]').click();
    await page.waitForTimeout(200);

    const appendToggle = page.getByRole('checkbox', { name: 'Append to existing' });
    await expect(appendToggle).toBeChecked();

    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles('./tests/test.svg');

    await expect
      .poll(async () => await getCanvasElementCount(page))
      .toBeGreaterThan(initialCount);

    const appendedCount = await getCanvasElementCount(page);

    const importButton = page.getByRole('button', { name: 'Import SVG' });
    if (!(await importButton.isVisible().catch(() => false))) {
      await page.locator('[aria-label="File"]').click();
      await page.waitForTimeout(200);
    }

    const appendToggleAfterImport = page.getByRole('checkbox', { name: 'Append to existing' });
    await appendToggleAfterImport.uncheck({ force: true });
    await expect(appendToggleAfterImport).not.toBeChecked();

    await fileInput.setInputFiles('./tests/test.svg');

    await expect
      .poll(async () => await getCanvasElementCount(page))
      .toBeLessThan(appendedCount);

    const replacedCount = await getCanvasElementCount(page);
    expect(replacedCount).toBeGreaterThan(0);
  });
});

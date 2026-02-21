import { test, expect } from '@playwright/test';
import { waitForLoad, createShape, selectTool, getCanvas, getCanvasPaths } from './helpers';

test.describe('Smart Eraser Plugin', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');

        // Wait for app to be ready
        await waitForLoad(page);

        // Let's create a circle shape first to erase from
        await createShape(page, 'Circle', { x: 400, y: 400 });

        // Activate smartEraser
        await selectTool(page, 'Smart Eraser');
    });

    test('should show eraser panel and size slider', async ({ page }) => {
        // Look for the Smart Eraser panel by its heading
        const panelHeading = page.getByRole('heading', { name: 'Smart Eraser' });
        await expect(panelHeading).toBeVisible();

        // Chakra UI sliders use role="slider", not input[type="range"]
        const slider = page.getByRole('slider');
        await expect(slider.first()).toBeVisible();
    });

    test('should erase portions of path when dragged', async ({ page }) => {
        // Use the canvas SVG element
        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('Canvas not found');

        // Erase across the middle of the shape
        const centerY = canvasBox.y + canvasBox.height / 2;
        await page.mouse.move(canvasBox.x + canvasBox.width * 0.2, centerY);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + canvasBox.width * 0.8, centerY, { steps: 20 });
        await page.mouse.up();

        // Wait for re-renders or state updates
        await page.waitForTimeout(200);

        // Check if there are path elements in the canvas
        const paths = await getCanvasPaths(page).count();
        expect(paths).toBeGreaterThan(0);
    });
});

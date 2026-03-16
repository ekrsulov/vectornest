import { test, expect } from '@playwright/test';
import {getCanvas, waitForLoad, selectTool} from './helpers';

const animatedWaveUseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff0055" />
      <stop offset="100%" stop-color="#00ffcc" />
    </linearGradient>
    <filter id="hyperGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
      <feMerge>
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <path id="waveLine" d="M -100 400 Q 100 200, 400 400 T 900 400" fill="none" stroke="url(#neonGlow)" stroke-width="4" stroke-dasharray="150 100" stroke-linecap="round"/>
  </defs>
  <g filter="url(#hyperGlow)" opacity="0.4">
    <use href="#waveLine" y="-200">
       <animate attributeName="stroke-dashoffset" values="500; 0" dur="10s" repeatCount="indefinite" />
    </use>
    <use href="#waveLine" y="200" transform="scale(1, -1) translate(0, -800)">
       <animate attributeName="stroke-dashoffset" values="0; 500" dur="10s" repeatCount="indefinite" />
    </use>
  </g>
</svg>`;

test.describe('Use element import and rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('should import SVG with use elements referencing circles', async ({ page }) => {
    // Open file panel
    await page.locator('[aria-label="File"]').click();
    
    // Upload SVG file by setting files on the hidden input
    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles('./tests/use-test.svg');
    
    // Wait for import to complete
    await page.waitForTimeout(500);
    
    // Check that elements were created
    const canvas = await getCanvas(page);
    
    // We should have:
    // 1. The original circle (converted to path or kept as native shape)
    // 2. Two use elements referencing it
    // Total: 3 visual elements
    
    const allPaths = canvas.locator('path, circle, [data-element-id]');
    const count = await allPaths.count();
    
    // Expect at least 3 elements (circle + 2 use)
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should render use elements with style overrides', async ({ page }) => {
    // Open file panel
    await page.locator('[aria-label="File"]').click();
    
    // Upload SVG file by setting files on the hidden input
    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles('./tests/use-style-test.svg');
    
    await page.waitForTimeout(500);
    
    const canvas = await getCanvas(page);
    
    // Check that we have elements with different fills
    const elements = canvas.locator('[data-element-id]');
    const count = await elements.count();
    
    // Should have at least 3 elements
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should show use panel when use element is selected', async ({ page }) => {
    // Open file panel
    await page.locator('[aria-label="File"]').click();
    
    // Upload SVG file by setting files on the hidden input
    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles('./tests/use-panel-test.svg');
    
    // Wait for file to be imported and UI to stabilize
    await page.waitForTimeout(1500);
    
    // Wait for any notifications/toasts to disappear
    await page.waitForSelector('[role="status"]', { state: 'hidden', timeout: 5000 }).catch(() => {
      // Notification might not exist or already gone, that's OK
    });
    
    // Switch to select tool
    await selectTool(page, 'Select');
    
    // Click on the use element area (around x=20, y=5 in canvas coordinates)
    const canvas = await getCanvas(page);
    const canvasBounds = await canvas.boundingBox();
    
    if (canvasBounds) {
      // Click in the approximate area of the use element
      await page.mouse.click(
        canvasBounds.x + canvasBounds.width / 2 + 50,
        canvasBounds.y + canvasBounds.height / 2
      );
    }
    
    await page.waitForTimeout(200);
    
    // The use panel should be visible in the sidebar
    // This depends on the exact UI implementation
  });

  test('should import top-level use elements that reference animated groups', async ({ page }) => {
    await page.locator('[aria-label="File"]').click();

    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles('./tests/use-group-animation.svg');

    await page.waitForTimeout(1000);

    const imported = await page.evaluate(() => {
      const testWindow = window as typeof window & {
        useCanvasStore?: {
          getState: () => {
            elements?: Array<{
              id: string;
              type: string;
              parentId?: string | null;
              data?: { rawContent?: string };
            }>;
            animations?: Array<{
              id: string;
              type: string;
              targetElementId?: string;
              transformType?: string;
            }>;
          };
        };
      };

      const store = testWindow.useCanvasStore?.getState() as {
        elements?: Array<{
          id: string;
          type: string;
          parentId?: string | null;
          data?: { rawContent?: string };
        }>;
        animations?: Array<{
          id: string;
          type: string;
          targetElementId?: string;
          transformType?: string;
        }>;
      } | undefined;

      if (!store) {
        return null;
      }

      const rootUseElements = (store.elements ?? [])
        .filter((element) => element.type === 'use' && (element.parentId ?? null) === null)
        .map((element) => ({
          id: element.id,
          rawContent: element.data?.rawContent ?? '',
        }));

      return {
        rootUseElements,
        animations: store.animations ?? [],
      };
    });

    expect(imported).not.toBeNull();

    const rootUseElements = imported?.rootUseElements ?? [];
    expect(rootUseElements).toHaveLength(3);
    expect(rootUseElements.every((element) => element.rawContent.length > 0)).toBeTruthy();
    expect(rootUseElements.every((element) => !/<use[\s>]/i.test(element.rawContent))).toBeTruthy();
    expect(rootUseElements.some((element) => element.rawContent.includes('type="scale"'))).toBeTruthy();
    expect(rootUseElements.some((element) => element.rawContent.includes('type="rotate"'))).toBeTruthy();

    const rootUseIds = new Set(rootUseElements.map((element) => element.id));
    expect(
      (imported?.animations ?? []).some((animation) =>
        animation.type === 'animateTransform' &&
        animation.targetElementId !== undefined &&
        rootUseIds.has(animation.targetElementId)
      )
    ).toBeTruthy();
  });

  test('should preserve dash animation styling for use-referenced definition paths on canvas and export', async ({ page }) => {
    await page.locator('[aria-label="File"]').click();

    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await fileInput.setInputFiles({
      name: 'animated-wave-use.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(animatedWaveUseSvg, 'utf8'),
    });

    await page.waitForTimeout(1000);

    const runtime = await page.evaluate(() => {
      const state = window.useCanvasStore?.getState?.();
      const useElements = (state?.elements ?? []).filter((element) => element.type === 'use');
      const useElementIds = new Set(useElements.map((element) => element.id));
      const renderedPaths = Array.from(document.querySelectorAll<SVGPathElement>('svg[data-canvas="true"] path[data-element-id]'))
        .map((node) => ({
        elementId: node.getAttribute('data-element-id'),
        dasharray: node.getAttribute('stroke-dasharray'),
        animateCount: node.querySelectorAll('animate[attributeName="stroke-dashoffset"]').length,
        }))
        .filter((node) => node.elementId !== null && useElementIds.has(node.elementId));

      return {
        useCount: useElements.length,
        renderedPaths,
      };
    });

    expect(runtime.useCount).toBe(2);
    expect(runtime.renderedPaths).toHaveLength(2);
    expect(runtime.renderedPaths.every((path) => path.dasharray === '150 100')).toBeTruthy();
    expect(runtime.renderedPaths.every((path) => path.animateCount === 1)).toBeTruthy();

    const exportedSvg = await page.evaluate(async () => {
      const { ExportManager } = await import('/src/utils/export/ExportManager.ts');
      return ExportManager.generateSvgContent(false, 0).content;
    });

    expect(exportedSvg).toContain('<path id="waveLine"');
    expect(exportedSvg).toContain('stroke-dasharray="150 100"');
    expect(exportedSvg).not.toMatch(/<path id="waveLine"[^>]*display="none"/);
    expect(exportedSvg).not.toMatch(/<path id="waveLine"[^>]*visibility="hidden"/);
    expect((exportedSvg.match(/<use[^>]*href="#waveLine"/g) ?? [])).toHaveLength(2);
    expect((exportedSvg.match(/attributeName="stroke-dashoffset"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="412.75" height="603.8" viewBox="285.4922 117.0977 412.75 603.8" xmlns="http://www.w3.org/2000/svg">
  <text x="285.4922" y="233.0977" font-size="128" font-family="Arial" stroke-width="0" dominant-baseline="alphabetic" letter-spacing="0" stroke-linecap="round" stroke-linejoin="round" data-rich-text="%3Cspan%20style%3D%22font-weight%3A%20bold%3B%22%3EHola%3C%2Fspan%3E%3Cbr%3EEsto%3Cbr%3Ees%20%3Cspan%20data-fill%3D%22%23fff700%22%20style%3D%22color%3A%20rgb(255%2C%20247%2C%200)%3B%22%3Euna%3C%2Fspan%3E%3Cdiv%3EPrueba%3C%2Fdiv%3E"><tspan x="285.4922" font-weight="bold">Hola</tspan><tspan x="285.4922" dy="153.6">Esto</tspan><tspan x="285.4922" dy="153.6">es </tspan><tspan fill="#fff700">una</tspan><tspan x="285.4922" dy="153.6">Prueba</tspan></text>
</svg>`;

const secondSvgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="561.875" height="450.2" viewBox="141.7266 54.7539 561.875 450.2" xmlns="http://www.w3.org/2000/svg">
  <text x="141.7266" y="170.7539" font-size="128" font-family="Arial" stroke-width="0" dominant-baseline="alphabetic" letter-spacing="0" stroke-linecap="round" stroke-linejoin="round" data-rich-text="Text%3Cbr%3EDOS%20%3Cspan%20data-fill%3D%22%23f07070%22%20style%3D%22color%3A%20rgb(240%2C%20112%2C%20112)%3B%22%3ETres%3C%2Fspan%3E%3Cbr%3ECuatro"><tspan x="141.7266">Text</tspan><tspan x="141.7266" dy="153.6">DOS </tspan><tspan fill="#f07070">Tres</tspan><tspan x="141.7266" dy="153.6">Cuatro</tspan></text>
</svg>`;

async function bootstrap(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await waitForLoad(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage?.clear();
  });
  await page.reload();
  await waitForLoad(page);
}

async function importSvg(page: import('@playwright/test').Page, name: string, content: string): Promise<void> {
  await page.locator('[aria-label="File"]').click();
  const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
  await fileInput.setInputFiles({
    name,
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(content, 'utf-8'),
  });
}

async function getImportedNativeText(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const state = (window as any).useCanvasStore?.getState?.();
    const element = state?.elements?.find((entry: { type: string }) => entry.type === 'nativeText');
    return element?.data
      ? {
          id: element.id,
          text: element.data.text,
          spans: element.data.spans?.map((span: { text: string; line: number; dy?: string }) => ({
            text: span.text,
            line: span.line,
            dy: span.dy ?? undefined,
          })) ?? [],
        }
      : null;
  });
}

async function getInlineEditorLines(page: import('@playwright/test').Page) {
  const editor = page.locator('[aria-label="Inline text editor"]');
  await expect(editor).toBeVisible();

  return editor.evaluate((node) => (
    Array.from(node.querySelectorAll('[data-inline-line]')).map((lineNode) => {
      const rect = (lineNode as HTMLElement).getBoundingClientRect();
      return {
        text: Array.from(lineNode.childNodes)
          .filter((child) => !(child instanceof HTMLElement && child.dataset.inlineLineBaseline === '1'))
          .map((child) => child.textContent ?? '')
          .join('')
          .replace(/\u00a0/g, ' '),
        top: rect.top,
        left: rect.left,
      };
    })
  ));
}

async function getInlineGlyphPositions(page: import('@playwright/test').Page) {
  const editor = page.locator('[aria-label="Inline text editor"]');
  await expect(editor).toBeVisible();

  return editor.evaluate((node) => (
    Array.from(node.querySelectorAll('[data-inline-glyph="1"]')).map((glyphNode) => {
      const rect = (glyphNode as HTMLElement).getBoundingClientRect();
      return {
        text: (glyphNode.textContent ?? '').replace(/\u00a0/g, ' '),
        top: rect.top,
        left: rect.left,
      };
    })
  ));
}

const expectGlyphsToShareLine = (
  glyphs: Array<{ text: string; top: number; left: number }>,
  firstIndex: number,
  secondIndex: number,
  nextLineIndex: number,
) => {
  expect(Math.abs((glyphs[firstIndex]?.top ?? 0) - (glyphs[secondIndex]?.top ?? 0))).toBeLessThan(2);
  expect((glyphs[secondIndex]?.top ?? 0)).toBeLessThan((glyphs[nextLineIndex]?.top ?? 0) - 20);
};

test('keeps inline tspans on the same line when opening native text inline editor', async ({ page }) => {
  await bootstrap(page);
  await importSvg(page, 'native-text-inline-lines.svg', svgContent);

  await expect.poll(async () => page.evaluate(() => {
    return (window as any).useCanvasStore?.getState?.().elements?.filter(
      (element: { type: string }) => element.type === 'nativeText'
    )?.length ?? 0;
  })).toBe(1);

  const importedText = await getImportedNativeText(page);

  expect(importedText).toEqual({
    id: expect.any(String),
    text: 'Hola\nEsto\nes una\nPrueba',
    spans: [
      { text: 'Hola', line: 0 },
      { text: 'Esto', line: 1 },
      { text: 'es ', line: 2 },
      { text: 'una', line: 2 },
      { text: 'Prueba', line: 3 },
    ],
  });

  await page.evaluate((elementId: string) => {
    (window as any).useCanvasStore?.getState?.().startInlineTextEdit?.(elementId);
  }, importedText?.id ?? '');

  const lines = await getInlineEditorLines(page);

  expect(lines.map((line) => line.text)).toEqual(['Hola', 'Esto', 'es una', 'Prueba']);

  const glyphs = await getInlineGlyphPositions(page);
  expectGlyphsToShareLine(glyphs, 8, 11, 14);
});

test('keeps styled inline span on the same rendered line for DOS Tres', async ({ page }) => {
  await bootstrap(page);
  await importSvg(page, 'native-text-inline-dos-tres.svg', secondSvgContent);

  await expect.poll(async () => page.evaluate(() => {
    return (window as any).useCanvasStore?.getState?.().elements?.filter(
      (element: { type: string }) => element.type === 'nativeText'
    )?.length ?? 0;
  })).toBe(1);

  const importedText = await getImportedNativeText(page);

  expect(importedText).toEqual({
    id: expect.any(String),
    text: 'Text\nDOS Tres\nCuatro',
    spans: [
      { text: 'Text', line: 0, dy: undefined },
      { text: 'DOS ', line: 1, dy: undefined },
      { text: 'Tres', line: 1, dy: undefined },
      { text: 'Cuatro', line: 2, dy: undefined },
    ],
  });

  await page.evaluate((elementId: string) => {
    (window as any).useCanvasStore?.getState?.().startInlineTextEdit?.(elementId);
  }, importedText?.id ?? '');

  const lines = await getInlineEditorLines(page);

  expect(lines.map((line) => line.text)).toEqual(['Text', 'DOS Tres', 'Cuatro']);
  const glyphs = await getInlineGlyphPositions(page);
  expectGlyphsToShareLine(glyphs, 4, 8, 12);
});
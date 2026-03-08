import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  processSvgFileMock,
  translateImportedElementsMock,
  addImportedElementsToCanvasMock,
  mergeImportedResourcesMock,
} = vi.hoisted(() => ({
  processSvgFileMock: vi.fn(),
  translateImportedElementsMock: vi.fn(),
  addImportedElementsToCanvasMock: vi.fn(),
  mergeImportedResourcesMock: vi.fn(),
}));

vi.mock('../../utils/colorModeSyncUtils', () => ({
  detectThemeColorMode: () => 'dark',
}));

vi.mock('../../utils/sanitizeSvgContent', () => ({
  sanitizeSvgContent: (value: string) => value,
}));

vi.mock('../../utils/importProcessingUtils', () => ({
  processSvgFile: processSvgFileMock,
}));

vi.mock('../../utils/importHelpers', () => ({
  translateImportedElements: translateImportedElementsMock,
  addImportedElementsToCanvas: addImportedElementsToCanvasMock,
}));

vi.mock('../../utils/importContributionRegistry', () => ({
  mergeImportedResources: mergeImportedResourcesMock,
}));

vi.mock('./iconifyApi', async () => {
  const actual = await vi.importActual<typeof import('./iconifyApi')>('./iconifyApi');
  return {
    ...actual,
    buildIconSvgUrl: () => 'https://api.iconify.design/test/home.svg',
    prepareIconifySvgForImport: () => '<svg xmlns="http://www.w3.org/2000/svg" />',
    splitIconifyName: () => ({ prefix: 'test', name: 'home' }),
  };
});

import { insertIconifyIconAtPoint } from './placement';

describe('insertIconifyIconAtPoint', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    processSvgFileMock.mockReset();
    translateImportedElementsMock.mockReset();
    addImportedElementsToCanvasMock.mockReset();
    mergeImportedResourcesMock.mockReset();

    translateImportedElementsMock.mockImplementation((elements) => elements);
    addImportedElementsToCanvasMock.mockReturnValue({
      childIds: [],
      createdIds: [],
      sourceIdMap: new Map(),
      hiddenElementIds: [],
    });
    processSvgFileMock.mockResolvedValue({
      elements: [
        {
          type: 'path',
          data: {
            subPaths: [],
            strokeWidth: 0,
            strokeColor: 'none',
            strokeOpacity: 1,
            fillColor: '#ffffff',
            fillOpacity: 1,
          },
        },
      ],
      pathDataArray: [],
      bounds: {
        minX: 0,
        minY: 0,
        maxX: 24,
        maxY: 24,
        width: 24,
        height: 24,
      },
      dimensions: {
        width: 24,
        height: 24,
      },
      pluginImports: {},
      artboardMetadata: null,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg" />'),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('skips the generic dark-mode mono transform for iconify imports', async () => {
    const store = {
      style: {
        fillColor: 'none',
        strokeColor: '#ffffff',
      },
      settings: {
        importResize: false,
        importResizeWidth: 0,
        importResizeHeight: 0,
      },
      elements: [],
      addElement: vi.fn(),
      updateElement: vi.fn(),
      toggleElementVisibility: vi.fn(),
      selectElements: vi.fn(),
      setActivePlugin: vi.fn(),
    };

    await insertIconifyIconAtPoint(
      store as never,
      'test:home',
      { x: 100, y: 120 },
    );

    expect(processSvgFileMock).toHaveBeenCalledTimes(1);
    expect(processSvgFileMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      skipDarkModeColorTransform: true,
    }));
  });
});

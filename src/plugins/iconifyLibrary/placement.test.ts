import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  processSvgFileMock,
  translateImportedElementsMock,
  addImportedElementsToCanvasMock,
  mergeImportedResourcesMock,
  prepareIconifySvgForImportMock,
} = vi.hoisted(() => ({
  processSvgFileMock: vi.fn(),
  translateImportedElementsMock: vi.fn(),
  addImportedElementsToCanvasMock: vi.fn(),
  mergeImportedResourcesMock: vi.fn(),
  prepareIconifySvgForImportMock: vi.fn(),
}));

vi.mock('../../utils/colorModeSyncUtils', () => ({
  detectThemeColorMode: () => 'dark',
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
    getIconifySvgBounds: () => ({ minX: 0, minY: 0, width: 24, height: 12 }),
    loadIconifySvg: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 12" />'),
    prepareIconifySvgForImport: prepareIconifySvgForImportMock,
    splitIconifyName: () => ({ prefix: 'test', name: 'home' }),
  };
});

import { insertIconifyIconAtPoint, insertIconifyIconAtRect } from './placement';

describe('iconifyLibrary placement', () => {
  beforeEach(() => {
    processSvgFileMock.mockReset();
    translateImportedElementsMock.mockReset();
    addImportedElementsToCanvasMock.mockReset();
    mergeImportedResourcesMock.mockReset();
    prepareIconifySvgForImportMock.mockReset();

    translateImportedElementsMock.mockImplementation((elements) => elements);
    addImportedElementsToCanvasMock.mockReturnValue({
      childIds: [],
      createdIds: [],
      sourceIdMap: new Map(),
      hiddenElementIds: [],
    });
    prepareIconifySvgForImportMock.mockImplementation(() => '<svg xmlns="http://www.w3.org/2000/svg" />');
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

  it('fits drag placement to the requested rect while keeping the icon aspect ratio', async () => {
    const store = {
      style: {
        fillColor: '#111111',
        strokeColor: 'none',
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

    await insertIconifyIconAtRect(
      store as never,
      'test:home',
      { x: 10, y: 20, width: 90, height: 40 },
    );

    expect(prepareIconifySvgForImportMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        targetMaxSize: 80,
      }),
    );
  });
});

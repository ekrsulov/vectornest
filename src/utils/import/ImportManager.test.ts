import { describe, expect, it, vi } from 'vitest';

const { getStateMock, setStateMock } = vi.hoisted(() => ({
  getStateMock: vi.fn(),
  setStateMock: vi.fn(),
}));

vi.mock('../../store/canvasStore', () => ({
  canvasStoreApi: {
    getState: getStateMock,
    setState: setStateMock,
  },
}));

import { ImportManager } from './ImportManager';

describe('ImportManager', () => {
  it('uses store settings when import options are partial', async () => {
    getStateMock.mockReturnValue({
      settings: {
        importResize: false,
        importResizeWidth: 64,
        importResizeHeight: 64,
        importApplyUnion: false,
        importAddFrame: false,
      },
    });

    await expect(ImportManager.importFiles([], { appendMode: true })).resolves.toBe(0);
  });
});

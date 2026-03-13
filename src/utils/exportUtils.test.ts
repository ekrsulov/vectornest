import { describe, expect, it, vi } from 'vitest';

const { serializePathsForExportMock, prepareExportAnimationStateMock, detectThemeColorModeMock } = vi.hoisted(() => ({
  serializePathsForExportMock: vi.fn(),
  prepareExportAnimationStateMock: vi.fn(),
  detectThemeColorModeMock: vi.fn(),
}));

vi.mock('./export/svgSerialization', () => ({
  serializePathsForExport: serializePathsForExportMock,
}));

vi.mock('./animationStatePreparation', () => ({
  prepareExportAnimationState: prepareExportAnimationStateMock,
  getPausedAnimationTime: vi.fn(),
}));

vi.mock('./colorModeSyncUtils', () => ({
  detectThemeColorMode: detectThemeColorModeMock,
  transformMonoColor: vi.fn((value: string) => value),
}));

import { exportSelection } from './exportUtils';

describe('exportSelection', () => {
  it('preserves export padding when exporting selected elements only', () => {
    detectThemeColorModeMock.mockReturnValue('light');
    prepareExportAnimationStateMock.mockImplementation((state) => state);
    serializePathsForExportMock.mockReturnValue(null);

    exportSelection(
      'svg',
      [{ id: 'path-1', type: 'path', data: {} }] as never,
      ['path-1'],
      'Document',
      true,
      24,
    );

    expect(serializePathsForExportMock).toHaveBeenCalledWith(
      expect.any(Array),
      ['path-1'],
      expect.objectContaining({
        selectedOnly: true,
        padding: 24,
      }),
    );
  });
});

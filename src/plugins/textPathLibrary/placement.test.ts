import { describe, expect, it } from 'vitest';

import { measureCommandsBounds } from '../../utils/measurementUtils';
import { TEXT_PATH_PRESETS } from './presets';
import {
  createTextPathElementInput,
  getTextPathPresetSourceSize,
} from './placement';

describe('textPathLibrary placement', () => {
  it('measures intrinsic preset bounds from the generated path', () => {
    const ellipsePreset = TEXT_PATH_PRESETS.find((preset) => preset.id === 'ellipse');
    expect(ellipsePreset).toBeTruthy();

    const size = getTextPathPresetSourceSize(ellipsePreset!);

    expect(size.width).toBeGreaterThan(size.height);
    expect(size.width).toBeGreaterThan(150);
    expect(size.height).toBeLessThan(150);
  });

  it('creates a text path element that fills the provided placement rect', () => {
    const preset = TEXT_PATH_PRESETS.find((candidate) => candidate.id === 'ellipse');
    expect(preset).toBeTruthy();

    const element = createTextPathElementInput(
      preset!,
      { x: 25, y: 40, width: 180, height: 60 },
      {
        fillColor: '#123456',
        fillOpacity: 0.8,
      } as never,
    );

    expect(element.type).toBe('path');
    const bounds = measureCommandsBounds(element.data.subPaths[0]);
    expect(bounds).toBeTruthy();

    expect(bounds?.minX).toBeCloseTo(25, 3);
    expect(bounds?.minY).toBeCloseTo(40, 3);
    expect((bounds?.maxX ?? 0) - (bounds?.minX ?? 0)).toBeCloseTo(180, 3);
    expect((bounds?.maxY ?? 0) - (bounds?.minY ?? 0)).toBeCloseTo(60, 3);
    expect(element.data.textPath?.fillColor).toBe('#123456');
    expect(element.data.textPath?.fillOpacity).toBe(0.8);
  });
});

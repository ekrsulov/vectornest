import { describe, expect, it } from 'vitest';
import type { Command, PathData } from '../types';
import {
  scaleCommands,
  scalePathData,
  translateCommands,
  translatePathData,
} from './transformationUtils';

const pathFixture = (): PathData => ({
  subPaths: [[
    { type: 'M', position: { x: 1, y: 2 } },
    { type: 'L', position: { x: 3, y: 4 } },
    { type: 'Z' },
  ]],
  strokeWidth: 2,
  strokeColor: '#000000',
  strokeOpacity: 1,
  fillColor: 'none',
  fillOpacity: 1,
});

describe('transformationUtils', () => {
  it('translates commands and preserves Z commands', () => {
    const commands: Command[] = [
      { type: 'M', position: { x: 1, y: 1 } },
      { type: 'L', position: { x: 2, y: 2 } },
      { type: 'Z' },
    ];

    const translated = translateCommands(commands, 10, -5);
    expect(translated[0]).toEqual({ type: 'M', position: { x: 11, y: -4 } });
    expect(translated[1]).toEqual({ type: 'L', position: { x: 12, y: -3 } });
    expect(translated[2]).toEqual({ type: 'Z' });
  });

  it('scales commands around origin', () => {
    const commands: Command[] = [
      { type: 'M', position: { x: 1, y: 2 } },
      { type: 'L', position: { x: 3, y: 4 } },
    ];

    const scaled = scaleCommands(commands, 2, 3, 0, 0);
    expect((scaled[0] as Extract<Command, { type: 'M' | 'L' }>).position).toEqual({ x: 2, y: 6 });
    expect((scaled[1] as Extract<Command, { type: 'M' | 'L' }>).position).toEqual({ x: 6, y: 12 });
  });

  it('translates and scales PathData subpaths', () => {
    const translated = translatePathData(pathFixture(), 5, 6);
    expect(translated.subPaths[0][0]).toEqual({ type: 'M', position: { x: 6, y: 8 } });

    const scaled = scalePathData(pathFixture(), 2, 2, 0, 0);
    expect(scaled.subPaths[0][1]).toEqual({ type: 'L', position: { x: 6, y: 8 } });
  });
});

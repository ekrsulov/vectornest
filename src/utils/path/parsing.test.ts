import { describe, expect, it } from 'vitest';
import { parsePathD, getCommandStartPoint } from './parsing';

describe('parsePathD', () => {
  it('parses a simple M L Z path', () => {
    const cmds = parsePathD('M 10 20 L 30 40 Z');
    expect(cmds).toHaveLength(3);
    expect(cmds[0]).toEqual({ type: 'M', position: { x: 10, y: 20 } });
    expect(cmds[1]).toEqual({ type: 'L', position: { x: 30, y: 40 } });
    expect(cmds[2]).toEqual({ type: 'Z' });
  });

  it('handles compact paths without whitespace after command letters', () => {
    const cmds = parsePathD('M0,-42L10,20Z');
    expect(cmds).toHaveLength(3);
    expect(cmds[0]).toEqual({ type: 'M', position: { x: 0, y: -42 } });
    expect(cmds[1]).toEqual({ type: 'L', position: { x: 10, y: 20 } });
    expect(cmds[2]).toEqual({ type: 'Z' });
  });

  it('splits multi-coordinate M into M + implicit L commands (SVG spec)', () => {
    const cmds = parsePathD('M 10 20 30 40 50 60');
    expect(cmds).toHaveLength(3);
    expect(cmds[0]).toEqual({ type: 'M', position: { x: 10, y: 20 } });
    expect(cmds[1]).toEqual({ type: 'L', position: { x: 30, y: 40 } });
    expect(cmds[2]).toEqual({ type: 'L', position: { x: 50, y: 60 } });
  });

  it('handles multi-coordinate L as multiple L commands', () => {
    const cmds = parsePathD('M 0 0 L 10 20 30 40');
    expect(cmds).toHaveLength(3);
    expect(cmds[0]).toEqual({ type: 'M', position: { x: 0, y: 0 } });
    expect(cmds[1]).toEqual({ type: 'L', position: { x: 10, y: 20 } });
    expect(cmds[2]).toEqual({ type: 'L', position: { x: 30, y: 40 } });
  });

  it('parses cubic Bezier C commands', () => {
    const cmds = parsePathD('M 0 0 C 10 20 30 40 50 60');
    expect(cmds).toHaveLength(2);
    expect(cmds[0].type).toBe('M');
    const c = cmds[1];
    expect(c.type).toBe('C');
    if (c.type === 'C') {
      expect(c.position).toEqual({ x: 50, y: 60 });
      expect(c.controlPoint1.x).toBe(10);
      expect(c.controlPoint1.y).toBe(20);
      expect(c.controlPoint2.x).toBe(30);
      expect(c.controlPoint2.y).toBe(40);
    }
  });

  it('returns empty array for empty string', () => {
    expect(parsePathD('')).toEqual([]);
  });

  it('skips invalid (NaN) coordinates gracefully', () => {
    const cmds = parsePathD('M 10 20 L xxx yyy');
    expect(cmds).toHaveLength(1);
    expect(cmds[0]).toEqual({ type: 'M', position: { x: 10, y: 20 } });
  });

  it('handles comma-separated coordinates', () => {
    const cmds = parsePathD('M10,20 L30,40');
    expect(cmds).toHaveLength(2);
    expect(cmds[0]).toEqual({ type: 'M', position: { x: 10, y: 20 } });
    expect(cmds[1]).toEqual({ type: 'L', position: { x: 30, y: 40 } });
  });

  it('handles lowercase command letters (relative treated as absolute)', () => {
    const cmds = parsePathD('m 10 20 l 30 40 z');
    expect(cmds).toHaveLength(3);
    expect(cmds[0].type).toBe('M');
    expect(cmds[1].type).toBe('L');
    expect(cmds[2].type).toBe('Z');
  });
});

describe('getCommandStartPoint', () => {
  it('returns M position for first command', () => {
    const cmds = parsePathD('M 10 20 L 30 40');
    expect(getCommandStartPoint(cmds, 0)).toEqual({ x: 10, y: 20 });
  });

  it('returns previous command position for subsequent L', () => {
    const cmds = parsePathD('M 10 20 L 30 40');
    expect(getCommandStartPoint(cmds, 1)).toEqual({ x: 10, y: 20 });
  });

  it('returns first M position after Z command', () => {
    const cmds = parsePathD('M 10 20 L 30 40 Z L 50 60');
    const startAfterZ = getCommandStartPoint(cmds, 3);
    expect(startAfterZ).toEqual({ x: 10, y: 20 });
  });
});

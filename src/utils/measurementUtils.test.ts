import { describe, it, expect } from 'vitest';
import { formatDistance, formatAngle } from './measurementUtils';
import { DEFAULT_DPI } from '../constants';

describe('measurementUtils', () => {
  describe('formatDistance', () => {
    it('formats px values', () => {
      expect(formatDistance(123.456, 'px', 2)).toBe('123.46 px');
    });

    it('formats mm values', () => {
      const expected = (123.456 * 25.4 / DEFAULT_DPI).toFixed(1) + ' mm';
      expect(formatDistance(123.456, 'mm', 1)).toBe(expected);
    });

    it('formats inches', () => {
      const expected = (123.456 / DEFAULT_DPI).toFixed(3) + ' in';
      expect(formatDistance(123.456, 'in', 3)).toBe(expected);
    });
  });

  describe('formatAngle', () => {
    it('formats angle with precision', () => {
      expect(formatAngle(45.1234, 1)).toBe('45.1°');
      expect(formatAngle(0, 0)).toBe('0°');
    });
  });
});

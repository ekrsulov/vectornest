import { describe, expect, it } from 'vitest';
import { prettifySvg } from './svgExportOptimizer';

describe('prettifySvg', () => {
  it('keeps adjacent tspans inline inside text elements', () => {
    const svg = '<svg><g><text x="0" y="0"><tspan fill="#2D3436">Vector</tspan><tspan fill="#6C5CE7">Nest</tspan></text></g></svg>';

    expect(prettifySvg(svg)).toBe([
      '<svg>',
      '  <g>',
      '    <text x="0" y="0"><tspan fill="#2D3436">Vector</tspan><tspan fill="#6C5CE7">Nest</tspan></text>',
      '  </g>',
      '</svg>',
      '',
    ].join('\n'));
  });
});
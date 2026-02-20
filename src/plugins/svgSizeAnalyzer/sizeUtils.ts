import type { ElementWeight } from './slice';
import type { CanvasElement, SubPath } from '../../types';

function estimatePathBytes(subPaths: SubPath[]): { bytes: number; points: number; segments: number } {
  let bytes = 0;
  let points = 0;
  let segments = 0;

  for (const sp of subPaths) {
    for (const cmd of sp) {
      switch (cmd.type) {
        case 'M':
          // M123.45,678.90 ~= 16 chars
          bytes += 16;
          points++;
          break;
        case 'L':
          // L123.45,678.90 ~= 16 chars
          bytes += 16;
          points++;
          segments++;
          break;
        case 'C':
          // C cp1x,cp1y cp2x,cp2y x,y ~= 48 chars
          bytes += 48;
          points++;
          segments++;
          break;
        case 'Z':
          bytes += 1;
          break;
      }
    }
  }

  // Add overhead for element wrapper: <path d="..." style="..." /> ~= 80 chars
  bytes += 80;

  // Style attributes estimation
  bytes += 60; // fill, stroke, stroke-width, opacity, etc.

  return { bytes, points, segments };
}

function getComplexity(points: number): 'low' | 'medium' | 'high' | 'very-high' {
  if (points <= 10) return 'low';
  if (points <= 50) return 'medium';
  if (points <= 200) return 'high';
  return 'very-high';
}

export function analyzeElementSizes(
  elements: CanvasElement[]
): ElementWeight[] {
  const weights: ElementWeight[] = [];

  for (const el of elements) {
    if (el.type === 'path') {
      const { bytes, points, segments } = estimatePathBytes(el.data.subPaths);
      weights.push({
        id: el.id,
        type: 'path',
        points,
        segments,
        estimatedBytes: bytes,
        percentOfTotal: 0,
        complexity: getComplexity(points),
      });
    } else if (el.type === 'group') {
      // Groups have minimal overhead
      weights.push({
        id: el.id,
        type: 'group',
        points: 0,
        segments: 0,
        estimatedBytes: 30 + el.data.childIds.length * 10,
        percentOfTotal: 0,
        complexity: 'low',
      });
    }
  }

  // Calculate percentages
  const totalBytes = weights.reduce((s, w) => s + w.estimatedBytes, 0);
  if (totalBytes > 0) {
    for (const w of weights) {
      w.percentOfTotal = (w.estimatedBytes / totalBytes) * 100;
    }
  }

  return weights;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getComplexityColor(complexity: string): string {
  switch (complexity) {
    case 'low': return '#38A169';
    case 'medium': return '#D69E2E';
    case 'high': return '#DD6B20';
    case 'very-high': return '#E53E3E';
    default: return '#A0AEC0';
  }
}

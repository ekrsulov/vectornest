import type { GradientDef } from '../gradients/slice';
import type { CanvasElement } from '../../types';
import type { GradientInfo, GradientSimilarityPair } from './slice';

/**
 * Parse a hex/rgb color to [r, g, b] array.
 */
function parseColor(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }
  const match = color.match(/(\d+)/g);
  if (match && match.length >= 3) {
    return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  }
  return [0, 0, 0];
}

/**
 * Compare color similarity between 0 and 1.
 */
function colorSimilarity(a: string, b: string): number {
  const [r1, g1, b1] = parseColor(a);
  const [r2, g2, b2] = parseColor(b);
  const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  const maxDist = Math.sqrt(255 ** 2 * 3);
  return 1 - dist / maxDist;
}

/**
 * Compute similarity between two gradients based on type, stop count, and colors.
 */
function gradientSimilarity(a: GradientDef, b: GradientDef): number {
  let score = 0;
  let total = 0;

  // Type match
  total += 1;
  if (a.type === b.type) score += 1;

  // Stop count similarity
  total += 1;
  const maxStops = Math.max(a.stops.length, b.stops.length);
  const minStops = Math.min(a.stops.length, b.stops.length);
  score += maxStops > 0 ? minStops / maxStops : 1;

  // Color similarity (compare stops at matching offsets)
  const pairedCount = Math.min(a.stops.length, b.stops.length);
  if (pairedCount > 0) {
    total += pairedCount;
    const sortedA = [...a.stops].sort((x, y) => x.offset - y.offset);
    const sortedB = [...b.stops].sort((x, y) => x.offset - y.offset);
    for (let i = 0; i < pairedCount; i++) {
      score += colorSimilarity(sortedA[i].color, sortedB[i].color);
    }
  }

  return total > 0 ? Math.round((score / total) * 100) / 100 : 0;
}

/**
 * Find which elements reference a given gradient ID.
 */
function findGradientUsers(elements: CanvasElement[], gradientId: string): string[] {
  const users: string[] = [];
  const ref = `url(#${gradientId})`;
  for (const el of elements) {
    if (el.type !== 'path') continue;
    const fill = String(el.data.fillColor ?? '');
    const stroke = String(el.data.strokeColor ?? '');
    if (fill.includes(ref) || stroke.includes(ref)) {
      users.push(el.id);
    }
  }
  return users;
}

export function analyzeGradients(
  gradients: GradientDef[],
  elements: CanvasElement[],
  similarityThreshold = 0.85
): {
  gradientInfos: GradientInfo[];
  similarPairs: GradientSimilarityPair[];
  totalGradients: number;
  linearCount: number;
  radialCount: number;
  avgStopCount: number;
} {
  const infos: GradientInfo[] = gradients.map((g) => ({
    gradientId: g.id,
    name: g.name || g.id,
    type: g.type,
    stopCount: g.stops.length,
    colors: g.stops.map((s) => s.color),
    usedByElements: findGradientUsers(elements, g.id),
  }));

  const pairs: GradientSimilarityPair[] = [];
  for (let i = 0; i < gradients.length; i++) {
    for (let j = i + 1; j < gradients.length; j++) {
      const sim = gradientSimilarity(gradients[i], gradients[j]);
      if (sim >= similarityThreshold) {
        pairs.push({
          idA: gradients[i].id,
          idB: gradients[j].id,
          nameA: gradients[i].name || gradients[i].id,
          nameB: gradients[j].name || gradients[j].id,
          similarity: sim,
        });
      }
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity);

  const linearCount = gradients.filter((g) => g.type === 'linear').length;
  const radialCount = gradients.filter((g) => g.type === 'radial').length;
  const totalStops = gradients.reduce((sum, g) => sum + g.stops.length, 0);

  return {
    gradientInfos: infos,
    similarPairs: pairs,
    totalGradients: gradients.length,
    linearCount,
    radialCount,
    avgStopCount: gradients.length > 0 ? Math.round((totalStops / gradients.length) * 10) / 10 : 0,
  };
}

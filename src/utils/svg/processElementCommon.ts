import type { PathData } from '../../types';
import { generateShortId } from '../idGenerator';
import type { Matrix } from './transform';

export const createIdentityMatrix = (): Matrix => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
});

export const createSyntheticSourceId = (kind: string): string => {
  return generateShortId(`src-${kind}`);
};

export const toMatrixTuple = (
  matrix: Matrix
): [number, number, number, number, number, number] => {
  return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
};

export const sanitizeDisplayStyleAttributes = (
  styleAttrs: Partial<PathData>
): { hasDisplayNone: boolean; sanitizedStyleAttrs: Partial<PathData> } => {
  const hasDisplayNone = (styleAttrs as { display?: string }).display === 'none';
  const sanitizedStyleAttrs = hasDisplayNone ? { ...styleAttrs } : styleAttrs;
  if (hasDisplayNone) {
    delete (sanitizedStyleAttrs as { display?: string }).display;
  }

  return { hasDisplayNone, sanitizedStyleAttrs };
};

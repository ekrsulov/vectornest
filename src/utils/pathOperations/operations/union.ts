import type { PathData, SubPath } from '../../../types';
import { logger } from '../../logger';

/**
 * Perform union operation on multiple paths (simple concatenation).
 */
export function performPathUnion(paths: PathData[]): PathData | null {
  if (paths.length === 0) {
    return null;
  }
  if (paths.length === 1) {
    return paths[0];
  }

  try {
    const allSubPaths: SubPath[] = [];
    for (const pathData of paths) {
      allSubPaths.push(...pathData.subPaths);
    }

    return {
      ...paths[0],
      subPaths: allSubPaths,
    };
  } catch (error) {
    logger.error('Error performing path union', error);
    return null;
  }
}

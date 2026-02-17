import type { PathData } from '../../../types';
import { logger } from '../../logger';
import { ensurePaperSetup } from '../paperSetup';
import { convertPaperPathToPathData } from '../converters/fromPaperPath';
import { convertPathDataToPaperPath } from '../converters/toPaperPath';

type PaperPath = ReturnType<typeof convertPathDataToPaperPath>;

function performBooleanOperation(
  paths: PathData[],
  operation: (
    path1: PaperPath,
    path2: PaperPath
  ) => unknown,
  operationName: string
): PathData | null {
  if (paths.length === 0) {
    return null;
  }
  if (paths.length === 1) {
    return paths[0];
  }

  try {
    ensurePaperSetup();
    const paperPaths = paths.map((p) => convertPathDataToPaperPath(p));
    let result = paperPaths[0];

    for (let i = 1; i < paperPaths.length; i++) {
      result = operation(result, paperPaths[i]) as PaperPath;
    }

    return convertPaperPathToPathData(result);
  } catch (error) {
    logger.error(`Error in ${operationName}`, error);
    return null;
  }
}

/**
 * Perform union operation on multiple paths using Paper.js boolean operations.
 */
export function performPathUnionPaperJS(paths: PathData[]): PathData | null {
  return performBooleanOperation(paths, (path1, path2) => path1.unite(path2), 'union');
}

export function performPathSubtraction(path1: PathData, path2: PathData): PathData | null {
  return performBooleanOperation([path1, path2], (pathA, pathB) => pathA.subtract(pathB), 'subtraction');
}

export function performPathIntersect(path1: PathData, path2: PathData): PathData | null {
  return performBooleanOperation([path1, path2], (pathA, pathB) => pathA.intersect(pathB), 'intersect');
}

export function performPathExclude(path1: PathData, path2: PathData): PathData | null {
  return performBooleanOperation([path1, path2], (pathA, pathB) => pathA.exclude(pathB), 'exclude');
}

export function performPathDivide(path1: PathData, path2: PathData): PathData | null {
  return performBooleanOperation([path1, path2], (pathA, pathB) => pathA.divide(pathB), 'divide');
}

import paper from 'paper';
import type { PathData } from '../../../types';
import { logger } from '../../logger';
import { ensurePaperSetup } from '../paperSetup';
import { convertPaperPathToPathData } from '../converters/fromPaperPath';
import { convertPathDataToPaperPath } from '../converters/toPaperPath';
import { preservePathStyle } from '../style';

/**
 * Simplify a path using Paper.js simplify method.
 */
export function performPathSimplifyPaperJS(pathData: PathData, tolerance = 2.5): PathData | null {
  try {
    ensurePaperSetup();
    const paperPath = convertPathDataToPaperPath(pathData);

    if (paperPath instanceof paper.Path) {
      paperPath.simplify(tolerance);
      const simplifiedData = convertPaperPathToPathData(paperPath);
      return preservePathStyle(simplifiedData, pathData);
    }

    if (paperPath instanceof paper.CompoundPath) {
      for (const child of paperPath.children) {
        if (child instanceof paper.Path) {
          child.simplify(tolerance);
        }
      }
      const simplifiedData = convertPaperPathToPathData(paperPath);
      return preservePathStyle(simplifiedData, pathData);
    }

    return null;
  } catch (error) {
    logger.error('Error simplifying path with Paper.js', error);
    return null;
  }
}

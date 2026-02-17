import paper from 'paper';
import type { PathData } from '../../../types';
import { BEZIER_CIRCLE_KAPPA } from '../../bezierCircle';
import { logger } from '../../logger';
import { ensurePaperSetup } from '../paperSetup';
import { convertPaperPathToPathData, convertSinglePaperPathToPathData } from '../converters/fromPaperPath';
import { convertPathDataToPaperPath } from '../converters/toPaperPath';
import { preservePathStyle } from '../style';

/**
 * Round the corners of a path by converting sharp angles to smooth curves.
 */
export function performPathRound(pathData: PathData, radius = 5): PathData | null {
  try {
    ensurePaperSetup();
    const paperPath = convertPathDataToPaperPath(pathData);

    if (paperPath instanceof paper.Path) {
      const roundedPath = new paper.Path();
      roundedPath.strokeColor = paperPath.strokeColor;
      roundedPath.fillColor = paperPath.fillColor;
      roundedPath.strokeWidth = paperPath.strokeWidth;

      const segments = paperPath.segments;
      if (segments.length < 3) {
        return pathData;
      }

      for (let i = 0; i < segments.length; i++) {
        const prevIndex = (i - 1 + segments.length) % segments.length;
        const currIndex = i;
        const nextIndex = (i + 1) % segments.length;

        const prevSeg = segments[prevIndex];
        const currSeg = segments[currIndex];
        const nextSeg = segments[nextIndex];

        const toPrev = prevSeg.point.subtract(currSeg.point).normalize();
        const toNext = nextSeg.point.subtract(currSeg.point).normalize();

        const angle = Math.abs(toPrev.getAngle(toNext));
        const isSharpCorner = angle > 30 && angle < 150;

        if (isSharpCorner && !paperPath.closed && (i === 0 || i === segments.length - 1)) {
          roundedPath.add(currSeg.point);
        } else if (isSharpCorner) {
          const effectiveRadius = Math.min(
            radius,
            currSeg.point.getDistance(prevSeg.point) * 0.4,
            currSeg.point.getDistance(nextSeg.point) * 0.4
          );

          const pointToPrev = currSeg.point.add(toPrev.multiply(effectiveRadius));
          const pointToNext = currSeg.point.add(toNext.multiply(effectiveRadius));

          if (roundedPath.segments.length === 0) {
            roundedPath.moveTo(pointToPrev);
          } else {
            roundedPath.lineTo(pointToPrev);
          }

          const controlDistance = effectiveRadius * BEZIER_CIRCLE_KAPPA;
          const prevControl = pointToPrev.add(toPrev.multiply(-controlDistance));
          const nextControl = pointToNext.add(toNext.multiply(-controlDistance));

          roundedPath.cubicCurveTo(prevControl, nextControl, pointToNext);
        } else {
          if (roundedPath.segments.length === 0) {
            roundedPath.moveTo(currSeg.point);
          } else {
            roundedPath.lineTo(currSeg.point);
          }
        }
      }

      if (paperPath.closed) {
        roundedPath.closePath();
      }

      const roundedData = convertPaperPathToPathData(roundedPath);
      return preservePathStyle(roundedData, pathData);
    }

    if (paperPath instanceof paper.CompoundPath) {
      const roundedChildren: paper.Path[] = [];

      for (const child of paperPath.children) {
        if (child instanceof paper.Path) {
          const childData = convertSinglePaperPathToPathData(child);
          const roundedChildData = performPathRound(childData, radius);
          if (roundedChildData) {
            const roundedChildPath = convertPathDataToPaperPath(roundedChildData);
            if (roundedChildPath instanceof paper.Path) {
              roundedChildren.push(roundedChildPath);
            }
          }
        }
      }

      if (roundedChildren.length > 0) {
        const compoundPath = new paper.CompoundPath({ children: roundedChildren });
        const roundedData = convertPaperPathToPathData(compoundPath);
        return preservePathStyle(roundedData, pathData);
      }
    }

    return null;
  } catch (error) {
    logger.error('Error rounding path with Paper.js', error);
    return null;
  }
}

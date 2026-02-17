import paper from 'paper';
import type { PathData, SubPath } from '../../../types';
import { PATH_JOIN_TOLERANCE } from '../../../constants';
import { logger } from '../../logger';

function roundToPrecision(value: number, precision = 2): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

export function convertSinglePaperPathToPathData(paperPath: paper.Path): PathData {
  const pathData: PathData = {
    subPaths: [],
    strokeWidth: paperPath.strokeWidth || 1,
    strokeColor: paperPath.strokeColor
      ? (paperPath.strokeColor as paper.Color).toCSS(true)
      : '#000000',
    strokeOpacity: 1,
    fillColor: paperPath.fillColor ? (paperPath.fillColor as paper.Color).toCSS(true) : 'none',
    fillOpacity: 1,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fillRule: 'nonzero',
    strokeDasharray: 'none',
  };

  const segments = paperPath.segments;
  if (segments.length > 0) {
    const subPath: SubPath = [];

    subPath.push({
      type: 'M',
      position: {
        x: roundToPrecision(segments[0].point.x),
        y: roundToPrecision(segments[0].point.y),
      },
    });

    const numSegmentsToProcess = paperPath.closed ? segments.length : segments.length - 1;

    for (let i = 0; i < numSegmentsToProcess; i++) {
      const nextIndex = paperPath.closed ? (i + 1) % segments.length : i + 1;
      const cp1x = segments[i].point.x + segments[i].handleOut.x;
      const cp1y = segments[i].point.y + segments[i].handleOut.y;
      const cp2x = segments[nextIndex].point.x + segments[nextIndex].handleIn.x;
      const cp2y = segments[nextIndex].point.y + segments[nextIndex].handleIn.y;

      const hasHandles =
        Math.abs(segments[i].handleOut.x) > PATH_JOIN_TOLERANCE ||
        Math.abs(segments[i].handleOut.y) > PATH_JOIN_TOLERANCE ||
        Math.abs(segments[nextIndex].handleIn.x) > PATH_JOIN_TOLERANCE ||
        Math.abs(segments[nextIndex].handleIn.y) > PATH_JOIN_TOLERANCE;

      if (hasHandles) {
        const nextPoint = {
          x: roundToPrecision(segments[nextIndex].point.x),
          y: roundToPrecision(segments[nextIndex].point.y),
        };

        subPath.push({
          type: 'C',
          controlPoint1: {
            x: roundToPrecision(cp1x),
            y: roundToPrecision(cp1y),
            commandIndex: 0,
            pointIndex: 0,
            anchor: nextPoint,
            isControl: true,
          },
          controlPoint2: {
            x: roundToPrecision(cp2x),
            y: roundToPrecision(cp2y),
            commandIndex: 0,
            pointIndex: 1,
            anchor: nextPoint,
            isControl: true,
          },
          position: nextPoint,
        });
      } else {
        if (
          Math.abs(segments[i].handleOut.x) > 0 ||
          Math.abs(segments[i].handleOut.y) > 0 ||
          Math.abs(segments[nextIndex].handleIn.x) > 0 ||
          Math.abs(segments[nextIndex].handleIn.y) > 0
        ) {
          logger.debug('[PathOps] Very small handles detected, treating as line', {
            handleOut: { x: segments[i].handleOut.x, y: segments[i].handleOut.y },
            handleIn: {
              x: segments[nextIndex].handleIn.x,
              y: segments[nextIndex].handleIn.y,
            },
          });
        }

        subPath.push({
          type: 'L',
          position: {
            x: roundToPrecision(segments[nextIndex].point.x),
            y: roundToPrecision(segments[nextIndex].point.y),
          },
        });
      }
    }

    if (paperPath.closed) {
      subPath.push({ type: 'Z' });
    }

    pathData.subPaths.push(subPath);
  }

  return pathData;
}

export function convertPaperPathToPathData(paperPath: paper.Path | paper.CompoundPath): PathData {
  if (paperPath instanceof paper.CompoundPath) {
    const pathData: PathData = {
      subPaths: [],
      strokeWidth: paperPath.strokeWidth || 1,
      strokeColor: paperPath.strokeColor
        ? (paperPath.strokeColor as paper.Color).toCSS(true)
        : '#000000',
      strokeOpacity: 1,
      fillColor: paperPath.fillColor ? (paperPath.fillColor as paper.Color).toCSS(true) : 'none',
      fillOpacity: 1,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fillRule: 'nonzero',
      strokeDasharray: 'none',
    };

    for (const child of paperPath.children) {
      if (child instanceof paper.Path) {
        const childData = convertSinglePaperPathToPathData(child);
        pathData.subPaths.push(...childData.subPaths);
      }
    }

    return pathData;
  }

  return convertSinglePaperPathToPathData(paperPath);
}

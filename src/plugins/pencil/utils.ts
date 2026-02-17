import type { Point, PathData, SubPath } from '../../types';
import { commandsToString, formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import { performPathSimplifyPaperJS } from '../../utils/pathOperationsUtils';
import type { StyleSlice } from '../../store/slices/features/styleSlice';
import { getDefaultStrokeColorFromSettings } from '../../utils/defaultColors';

export type PathStyleLike = Pick<
  PathData,
  |
    'strokeWidth'
  | 'strokeColor'
  | 'strokeOpacity'
  | 'fillColor'
  | 'fillOpacity'
  | 'strokeLinecap'
  | 'strokeLinejoin'
  | 'fillRule'
  | 'strokeDasharray'
  | 'isPencilPath'
>;

/**
 * Get pencil path style from the centralized StyleSlice.
 * Style properties are now stored in state.style instead of state.pencil.
 */
export function getPencilPathStyle(style: StyleSlice['style']): PathStyleLike {
  const defaultStrokeColor = getDefaultStrokeColorFromSettings();
  const effectiveStrokeColor = style.strokeColor === 'none' ? defaultStrokeColor : style.strokeColor;

  return {
    strokeWidth: style.strokeWidth,
    strokeColor: effectiveStrokeColor,
    strokeOpacity: style.strokeOpacity,
    fillColor: 'none',
    fillOpacity: 1,
    strokeLinecap: style.strokeLinecap ?? 'round',
    strokeLinejoin: style.strokeLinejoin ?? 'round',
    fillRule: style.fillRule ?? 'nonzero',
    strokeDasharray: style.strokeDasharray ?? 'none',
    isPencilPath: true,
  };
}

export function createPathDataFromPoints(points: Point[], style: PathStyleLike): PathData {
  const subPath: SubPath = [];

  if (points.length > 0) {
    const firstPoint = points[0];
    subPath.push({
      type: 'M',
      position: {
        x: formatToPrecision(firstPoint.x, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(firstPoint.y, PATH_DECIMAL_PRECISION),
      },
    });

    for (let i = 1; i < points.length; i++) {
      subPath.push({
        type: 'L',
        position: {
          x: formatToPrecision(points[i].x, PATH_DECIMAL_PRECISION),
          y: formatToPrecision(points[i].y, PATH_DECIMAL_PRECISION),
        },
      });
    }
  }

  return {
    subPaths: subPath.length > 0 ? [subPath] : [],
    strokeWidth: style.strokeWidth,
    strokeColor: style.strokeColor,
    strokeOpacity: style.strokeOpacity,
    fillColor: style.fillColor,
    fillOpacity: style.fillOpacity,
    strokeLinecap: style.strokeLinecap,
    strokeLinejoin: style.strokeLinejoin,
    fillRule: style.fillRule,
    strokeDasharray: style.strokeDasharray,
    isPencilPath: style.isPencilPath,
  };
}

export function simplifyPathFromPoints(
  points: Point[],
  style: PathStyleLike,
  tolerance: number
): PathData {
  if (tolerance <= 0) {
    return createPathDataFromPoints(points, style);
  }

  if (points.length < 2) {
    return createPathDataFromPoints(points, style);
  }

  const rawPathData = createPathDataFromPoints(points, style);
  const simplified = performPathSimplifyPaperJS(rawPathData, tolerance);

  if (simplified && simplified.subPaths.length > 0) {
    return {
      ...simplified,
      strokeWidth: style.strokeWidth,
      strokeColor: style.strokeColor,
      strokeOpacity: style.strokeOpacity,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
      strokeLinecap: style.strokeLinecap,
      strokeLinejoin: style.strokeLinejoin,
      fillRule: style.fillRule,
      strokeDasharray: style.strokeDasharray,
      isPencilPath: style.isPencilPath,
    };
  }

  return rawPathData;
}

export function subPathsToPathString(subPaths: SubPath[]): string {
  return subPaths
    .map(commands => commandsToString(commands))
    .filter(segment => segment.length > 0)
    .join(' ');
}

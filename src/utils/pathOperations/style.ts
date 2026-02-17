import type { PathData } from '../../types';

export function preservePathStyle(result: PathData, source: PathData): PathData {
  return {
    ...result,
    strokeColor: source.strokeColor,
    strokeWidth: source.strokeWidth,
    strokeOpacity: source.strokeOpacity,
    fillColor: source.fillColor,
    fillOpacity: source.fillOpacity,
    strokeLinecap: source.strokeLinecap,
    strokeLinejoin: source.strokeLinejoin,
    fillRule: source.fillRule,
    strokeDasharray: source.strokeDasharray,
  };
}

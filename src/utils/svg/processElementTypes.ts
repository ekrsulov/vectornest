import type { PathData } from '../../types';
import type { GlobalTextStyle } from '../import/textStyleUtils';
import type { SVGDimensions } from './importTypes';
import type { Matrix } from './transform';

export type TextPathAttachment = { targetId: string; textPath: PathData['textPath'] };

export type ImportContext = {
  textStyle?: GlobalTextStyle | null;
  doc?: Document;
  svgDimensions?: SVGDimensions;
  visitedIds?: Set<string>;
  inheritedStyle?: Partial<PathData>;
  inDefs?: boolean;
  cumulativeTransform?: Matrix;
  ancestorGroupSourceIds?: string[];
  hiddenAncestor?: boolean;
  hasAnimatedAncestor?: boolean;
};

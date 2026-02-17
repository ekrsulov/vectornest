export type { Bounds } from '../boundsUtils';
export { calculateBounds } from '../boundsUtils';

export {
  MIN_CONTAINER_CONTENT_AREA_RATIO,
  type AlignmentContext,
  type AlignmentStrategy,
  type ContainerContentPair,
  type PathElementInfo,
  type VisualAlignmentResult,
} from './types';

export {
  getElementBoundsAndArea,
  identifyContainerAndContent,
  prepareAlignmentContext,
} from './context';

export {
  computeVisualAlignment,
} from './visualAlignment';

export {
  applyProtectionPadding,
  calculateMathematicalOffset,
  translateSubPaths,
} from './offsets';

export {
  findFeasiblePairs,
  getContainerContentIds,
  getPathElementsInfo,
} from './pairing';

export {
  processFeasiblePairs,
} from './processing';

export {
  mathematicalAlignmentStrategy,
  visualAlignmentStrategy,
} from './strategies';

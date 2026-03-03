import type { CanvasElement, PresentationAttributes, PathData } from '../../types';
import type { SvgStructureAttributeSnapshot } from '../../types/plugins';

export interface SvgTreeNode {
  key: string;
  numberPath: string | null;
  tagName: string;
  idAttribute?: string | null;
  dataElementId?: string | null;
  displayId: string;
  isDefs: boolean;
  defsOwnerId?: string | null;
  childIndex?: number;
  attributes: SvgStructureAttributeSnapshot[];
  children: SvgTreeNode[];
  canvasElement?: CanvasElement;
}

export type AnimationTargetKey =
  | `def:gradient:${string}`
  | `def:pattern:${string}`
  | `def:marker:${string}`
  | `def:clippath:${string}`
  | `def:mask:${string}`
  | `def:filter:${string}`
  | `def:symbol:${string}`
  | `child:stop:${string}:${number}`
  | `child:pattern:${string}:${number}`
  | `child:marker:${string}:${number}`
  | `child:clippath:${string}:${number}`
  | `child:mask:${string}:${number}`
  | `child:filter:${string}:${number}`
  | `child:symbol:${string}:${number}`;

export interface AnimatedElementSummary {
  directAnimatedElementIdsKey: string;
  indirectAnimatedElementIdsKey: string;
}

export type ReferencedElementData = Partial<
  Pick<
    PresentationAttributes,
    'clipPathId' | 'maskId' | 'filterId' | 'markerStart' | 'markerMid' | 'markerEnd'
  >
> & Pick<PathData, 'fillColor' | 'strokeColor' | 'textPath'> & {
  href?: string;
  'xlink:href'?: string;
};

import type { CanvasElement, PathData } from '../../types';
import type { Bounds } from '../boundsUtils';

// Minimum area ratio required for container/content pair recognition
// Container must be at least this many times larger than content
export const MIN_CONTAINER_CONTENT_AREA_RATIO = 1.05;

export interface PathElementInfo {
  element: CanvasElement;
  bounds: Bounds;
  area: number;
  center: { x: number; y: number };
}

export interface ContainerContentPair {
  container: CanvasElement;
  content: CanvasElement;
}

export interface AlignmentContext {
  containerElement: CanvasElement;
  contentElement: CanvasElement;
  containerBounds: Bounds;
  contentBounds: Bounds;
  containerData: PathData;
  contentData: PathData;
  containerFillColor: string;
}

export interface VisualAlignmentResult {
  visualCenter: { x: number; y: number };
  mathematicalCenter: { x: number; y: number };
  offset: { x: number; y: number };
}

export type AlignmentStrategy = (
  context: AlignmentContext
) => { x: number; y: number } | Promise<{ x: number; y: number }>;

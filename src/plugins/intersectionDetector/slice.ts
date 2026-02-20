import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface IntersectionPoint {
  x: number;
  y: number;
  elementIdA: string;
  elementIdB: string;
  labelA: string;
  labelB: string;
}

export interface IntersectionDetectorState extends Record<string, unknown> {
  intersections: IntersectionPoint[];
  showOverlay: boolean;
  tolerance: number;
  selfIntersections: boolean;
}

export interface IntersectionDetectorPluginSlice {
  intersectionDetector: IntersectionDetectorState;
  updateIntersectionDetectorState: (state: Partial<IntersectionDetectorState>) => void;
}

export const createIntersectionDetectorSlice: StateCreator<
  IntersectionDetectorPluginSlice,
  [],
  [],
  IntersectionDetectorPluginSlice
> = createSimplePluginSlice<'intersectionDetector', IntersectionDetectorState, IntersectionDetectorPluginSlice>(
  'intersectionDetector',
  { intersections: [], showOverlay: false, tolerance: 2, selfIntersections: false }
);

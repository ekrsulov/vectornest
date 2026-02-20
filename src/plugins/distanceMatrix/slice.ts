import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface DistancePair {
  idA: string;
  labelA: string;
  idB: string;
  labelB: string;
  distance: number;
}

export interface DistanceMatrixState extends Record<string, unknown> {
  pairs: DistancePair[];
  nearestPair: DistancePair | null;
  farthestPair: DistancePair | null;
  avgDistance: number;
}

export interface DistanceMatrixPluginSlice {
  distanceMatrix: DistanceMatrixState;
  updateDistanceMatrixState: (state: Partial<DistanceMatrixState>) => void;
}

export const createDistanceMatrixSlice: StateCreator<
  DistanceMatrixPluginSlice,
  [],
  [],
  DistanceMatrixPluginSlice
> = createSimplePluginSlice<'distanceMatrix', DistanceMatrixState, DistanceMatrixPluginSlice>(
  'distanceMatrix',
  { pairs: [], nearestPair: null, farthestPair: null, avgDistance: 0 }
);

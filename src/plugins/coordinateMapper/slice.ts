import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface CoordLabel {
  x: number;
  y: number;
  label: string;
  elementId: string;
  type: 'anchor' | 'control' | 'center';
}

export interface CoordinateMapperState extends Record<string, unknown> {
  enabled: boolean;
  showAnchors: boolean;
  showControls: boolean;
  showCenters: boolean;
  precision: number;
  labels: CoordLabel[];
  selectedOnly: boolean;
}

export interface CoordinateMapperPluginSlice {
  coordinateMapper: CoordinateMapperState;
  updateCoordinateMapperState: (state: Partial<CoordinateMapperState>) => void;
}

export const createCoordinateMapperSlice: StateCreator<
  CoordinateMapperPluginSlice,
  [],
  [],
  CoordinateMapperPluginSlice
> = createSimplePluginSlice<'coordinateMapper', CoordinateMapperState, CoordinateMapperPluginSlice>(
  'coordinateMapper',
  {
    enabled: false,
    showAnchors: true,
    showControls: false,
    showCenters: false,
    precision: 1,
    labels: [],
    selectedOnly: true,
  }
);

import type { StateCreator } from 'zustand';
import type { Point } from '../../types';

export interface MeasurementData {
  startPoint: Point | null;
  endPoint: Point | null;
  distance: number;
  deltaX: number;
  deltaY: number;
  angle: number; // in degrees
  isActive: boolean;
}

// Now using unified snap point types
import type { SnapPoint } from '../../utils/snapPointUtils';

export type SnapInfo = SnapPoint;
export type SnapPointCache = SnapPoint;

export interface MeasurePluginSlice {
  // State
  measure: {
    measurement: MeasurementData;
    startSnapInfo: SnapInfo | null; // Snap at start point
    currentSnapInfo: SnapInfo | null; // Snap at current/end point
    cachedSnapPoints: SnapPointCache[]; // All snap points for visualization
    showInfo: boolean;
    units: 'px' | 'mm' | 'in';
    snapThreshold: number; // in screen pixels
    enableSnapping: boolean;
  };

  // Actions
  updateMeasureState: (state: Partial<MeasurePluginSlice['measure']>) => void;
}

export interface MeasurePluginActions {
  startMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  updateMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  finalizeMeasurement: () => void;
  clearMeasurement: () => void;
  refreshSnapPointsCache: (snapPoints: SnapPointCache[]) => void;
}

/**
 * Calculate measurement data from two points
 */
function calculateMeasurement(start: Point, end: Point): Omit<MeasurementData, 'startPoint' | 'endPoint' | 'isActive'> {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  return {
    distance,
    deltaX,
    deltaY,
    angle,
  };
}

export const createMeasurePluginSlice: StateCreator<
  MeasurePluginSlice & MeasurePluginActions,
  [],
  [],
  MeasurePluginSlice & MeasurePluginActions
> = (set, get) => ({
  measure: {
    measurement: {
      startPoint: null,
      endPoint: null,
      distance: 0,
      deltaX: 0,
      deltaY: 0,
      angle: 0,
      isActive: false,
    },
    startSnapInfo: null,
    currentSnapInfo: null,
    cachedSnapPoints: [],
    showInfo: true,
    units: 'px',
    snapThreshold: 10,
    enableSnapping: true,
  },

  updateMeasureState: (newState) => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        ...newState,
      },
    }));
  },

  startMeasurement: (point: Point, snapInfo: SnapInfo | null = null) => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        measurement: {
          startPoint: point,
          endPoint: point,
          distance: 0,
          deltaX: 0,
          deltaY: 0,
          angle: 0,
          isActive: true,
        },
        startSnapInfo: snapInfo,
        // Clear currentSnapInfo on start - it will be updated by pointermove events
        // This prevents the crosshair from "sticking" at the start point
        currentSnapInfo: null,
      },
    }));
  },

  updateMeasurement: (point: Point, snapInfo: SnapInfo | null = null) => {
    const state = get() as MeasurePluginSlice;
    const { startPoint } = state.measure.measurement;

    if (!startPoint) return;

    const calculatedData = calculateMeasurement(startPoint, point);

    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        measurement: {
          startPoint,
          endPoint: point,
          ...calculatedData,
          isActive: true,
        },
        currentSnapInfo: snapInfo,
      },
    }));
  },

  finalizeMeasurement: () => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        measurement: {
          ...(state as MeasurePluginSlice).measure.measurement,
          isActive: false,
        },
        // Clear currentSnapInfo when finalizing to hide the crosshair
        currentSnapInfo: null,
      },
    }));
  },

  clearMeasurement: () => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        measurement: {
          startPoint: null,
          endPoint: null,
          distance: 0,
          deltaX: 0,
          deltaY: 0,
          angle: 0,
          isActive: false,
        },
        startSnapInfo: null,
        currentSnapInfo: null,
      },
    }));
  },



  refreshSnapPointsCache: (snapPoints: SnapPointCache[]) => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        cachedSnapPoints: snapPoints,
      },
    }));
  },
});

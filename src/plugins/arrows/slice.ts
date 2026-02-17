import type { StateCreator } from 'zustand';
import type { Point } from '../../types';

/**
 * Arrow head styles
 */
export type ArrowHeadStyle =
  | 'none'           // No head
  | 'triangle'       // Filled triangle
  | 'triangleOpen'   // Open triangle (outline only)
  | 'diamond'        // Filled diamond
  | 'diamondOpen'    // Open diamond
  | 'circle'         // Filled circle
  | 'circleOpen'     // Open circle
  | 'bar'            // Flat bar (perpendicular line)
  | 'measure'        // Measurement style (flat bar for dimension lines)
  | 'chevron';       // Open chevron (> or <) - line extends to tip

/**
 * Line style for arrows
 */
export type ArrowLineStyle = 'straight' | 'curved';

/**
 * Routing mode for obstacle avoidance
 */
export type ArrowRoutingMode = 'simple' | 'pathfinding';

/**
 * Arrow configuration
 * Note: strokeWidth is now taken from system settings (defaultStrokeWidth)
 */
export interface ArrowConfig {
  startHead: ArrowHeadStyle;
  endHead: ArrowHeadStyle;
  headSize: number;        // Size of arrow heads relative to stroke
  showLabel: boolean;      // For measurement arrows
  labelFontSize: number;
  lineStyle: ArrowLineStyle;  // Straight or curved line
  avoidObstacles: boolean;    // Auto-route around obstacles
  routingMode: ArrowRoutingMode; // 'simple' = single curve, 'pathfinding' = multi-waypoint A*
  curvature: number;          // Curvature amount for curved lines (0-100)
  routingMargin: number;      // Margin around obstacles for pathfinding (px)
}

/**
 * Current drawing state
 */
export interface ArrowDrawingState {
  startPoint: Point | null;
  endPoint: Point | null;
  isDrawing: boolean;
  distance: number;
  angle: number;
}

// Use unified snap point types
import type { SnapPoint } from '../../utils/snapPointUtils';

export type SnapInfo = SnapPoint;
export type SnapPointCache = SnapPoint;

export interface ArrowsPluginSlice {
  arrows: {
    // Drawing state
    drawing: ArrowDrawingState;
    startSnapInfo: SnapInfo | null;
    currentSnapInfo: SnapInfo | null;
    cachedSnapPoints: SnapPointCache[];

    // Configuration
    config: ArrowConfig;

    // Snap settings (only cache state, visualization is global)
    enableSnapping: boolean;
  };
}

export interface ArrowsPluginActions {
  updateArrowsState: (state: Partial<ArrowsPluginSlice['arrows']>) => void;
  updateArrowConfig: (config: Partial<ArrowConfig>) => void;
  startArrowDrawing: (point: Point, snapInfo?: SnapInfo | null) => void;
  updateArrowDrawing: (point: Point, snapInfo?: SnapInfo | null) => void;
  finalizeArrowDrawing: () => ArrowDrawingState | null;
  cancelArrowDrawing: () => void;
  refreshArrowsSnapPointsCache: (snapPoints: SnapPointCache[]) => void;
}

/**
 * Calculate distance and angle between two points
 */
function calculateArrowMetrics(start: Point, end: Point): { distance: number; angle: number } {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
  return { distance, angle };
}

/**
 * Default arrow configuration
 * Note: strokeWidth is taken from system settings (defaultStrokeWidth)
 */
const defaultArrowConfig: ArrowConfig = {
  startHead: 'none',
  endHead: 'triangle',
  headSize: 12,
  showLabel: false,
  labelFontSize: 12,
  lineStyle: 'straight',
  avoidObstacles: false,
  routingMode: 'simple',
  curvature: 50,
  routingMargin: 15,
};

export const createArrowsPluginSlice: StateCreator<
  ArrowsPluginSlice & ArrowsPluginActions,
  [],
  [],
  ArrowsPluginSlice & ArrowsPluginActions
> = (set, get) => ({
  arrows: {
    drawing: {
      startPoint: null,
      endPoint: null,
      isDrawing: false,
      distance: 0,
      angle: 0,
    },
    startSnapInfo: null,
    currentSnapInfo: null,
    cachedSnapPoints: [],

    config: { ...defaultArrowConfig },

    enableSnapping: true,
  },

  updateArrowsState: (newState) => {
    set((state) => ({
      arrows: {
        ...(state as ArrowsPluginSlice).arrows,
        ...newState,
      },
    }));
  },

  updateArrowConfig: (configUpdate) => {
    set((state) => ({
      arrows: {
        ...(state as ArrowsPluginSlice).arrows,
        config: {
          ...(state as ArrowsPluginSlice).arrows.config,
          ...configUpdate,
        },
      },
    }));
  },

  startArrowDrawing: (point: Point, snapInfo: SnapInfo | null = null) => {
    set((state) => ({
      arrows: {
        ...(state as ArrowsPluginSlice).arrows,
        drawing: {
          startPoint: point,
          endPoint: point,
          isDrawing: true,
          distance: 0,
          angle: 0,
        },
        startSnapInfo: snapInfo,
        // Clear currentSnapInfo on start - it will be updated by pointermove events
        // This prevents the crosshair from "sticking" at the start point
        currentSnapInfo: null,
      },
    }));
  },

  updateArrowDrawing: (point: Point, snapInfo: SnapInfo | null = null) => {
    const state = get() as ArrowsPluginSlice;
    const { startPoint } = state.arrows.drawing;

    if (!startPoint) return;

    const { distance, angle } = calculateArrowMetrics(startPoint, point);

    set((currentState) => ({
      arrows: {
        ...(currentState as ArrowsPluginSlice).arrows,
        drawing: {
          startPoint,
          endPoint: point,
          isDrawing: true,
          distance,
          angle,
        },
        currentSnapInfo: snapInfo,
      },
    }));
  },

  finalizeArrowDrawing: () => {
    const state = get() as ArrowsPluginSlice;
    const drawing = { ...state.arrows.drawing };

    set((currentState) => ({
      arrows: {
        ...(currentState as ArrowsPluginSlice).arrows,
        drawing: {
          startPoint: null,
          endPoint: null,
          isDrawing: false,
          distance: 0,
          angle: 0,
        },
        startSnapInfo: null,
        currentSnapInfo: null,
      },
    }));

    return drawing.startPoint && drawing.endPoint ? drawing : null;
  },

  cancelArrowDrawing: () => {
    set((state) => ({
      arrows: {
        ...(state as ArrowsPluginSlice).arrows,
        drawing: {
          startPoint: null,
          endPoint: null,
          isDrawing: false,
          distance: 0,
          angle: 0,
        },
        startSnapInfo: null,
        currentSnapInfo: null,
      },
    }));
  },

  refreshArrowsSnapPointsCache: (snapPoints: SnapPointCache[]) => {
    set((state) => ({
      arrows: {
        ...(state as ArrowsPluginSlice).arrows,
        cachedSnapPoints: snapPoints,
      },
    }));
  },
});

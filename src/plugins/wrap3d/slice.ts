import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData } from '../../types';
import { 
  transformPathDataToShape, 
  type ShapeBounds, 
  type ShapeType, 
  type ShapeParams,
  getDefaultShapeParams 
} from './wrap3dUtils';

/**
 * Original path data stored for each element being transformed
 */
interface OriginalPathInfo {
  id: string;
  pathData: PathData;
}

interface Wrap3DState {
  // Tool activation state
  isActive: boolean;
  
  // Selected 3D shape type
  selectedShape: ShapeType;
  
  // Rotation angles in degrees
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  
  // Shape parameters
  shapeParams: ShapeParams;
  
  // Whether the effect is being previewed live
  isLivePreview: boolean;
  
  // Original path data for all elements being transformed (for reverting)
  originalPaths: OriginalPathInfo[];
  
  // Combined bounds of all paths (for unified transformation)
  combinedBounds: ShapeBounds | null;
}

export interface Wrap3DSlice extends Wrap3DState {
  // Tool activation actions
  activateWrap3DTool: () => void;
  deactivateWrap3DTool: () => void;
  
  // Shape selection
  setSelectedShape: (shape: ShapeType) => void;
  
  // Rotation actions
  setRotationX: (angle: number) => void;
  setRotationY: (angle: number) => void;
  setRotationZ: (angle: number) => void;
  resetRotation: () => void;
  
  // Shape parameter actions
  setRadiusMultiplier: (value: number) => void;
  setCylinderHeight: (value: number) => void;
  setTorusMajorRadius: (value: number) => void;
  setTorusMinorRadius: (value: number) => void;
  setConeBaseRadius: (value: number) => void;
  setConeHeight: (value: number) => void;
  setEllipsoidRadiusX: (value: number) => void;
  setEllipsoidRadiusY: (value: number) => void;
  setEllipsoidRadiusZ: (value: number) => void;
  setWaveAmplitudeX: (value: number) => void;
  setWaveAmplitudeY: (value: number) => void;
  setWaveFrequencyX: (value: number) => void;
  setWaveFrequencyY: (value: number) => void;
  setWavePhaseX: (value: number) => void;
  setWavePhaseY: (value: number) => void;
  
  // Live preview actions
  startWrap3DPreview: () => void;
  updateWrap3DPreview: () => void;
  applyWrap3D: () => void;
  cancelWrap3DPreview: () => void;
  
  // Check if operation is available
  canApplyWrap3D: () => boolean;
  
  // Legacy compatibility (will be removed)
  setSphereRadius: (radius: number) => void;
  activateSphereWrapTool: () => void;
  deactivateSphereWrapTool: () => void;
  applySphereWrap: () => void;
  canApplySphereWrap: () => boolean;
}

// Type for accessing full canvas store
type FullCanvasState = {
  elements: CanvasElement[];
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  selectedIds?: string[];
  recordSnapshot?: () => void;
};

const initialState: Wrap3DState = {
  isActive: false,
  selectedShape: 'sphere',
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  shapeParams: getDefaultShapeParams(),
  isLivePreview: false,
  originalPaths: [],
  combinedBounds: null,
};

/**
 * Deep copy a PathData object
 */
function deepCopyPathData(pathData: PathData): PathData {
  return {
    ...pathData,
    subPaths: pathData.subPaths.map(subPath => 
      subPath.map(cmd => {
        if (cmd.type === 'C') {
          return {
            ...cmd,
            controlPoint1: { ...cmd.controlPoint1 },
            controlPoint2: { ...cmd.controlPoint2 },
            position: { ...cmd.position },
          };
        } else if (cmd.type === 'Z') {
          return { type: 'Z' as const };
        } else {
          return {
            ...cmd,
            position: { ...cmd.position },
          };
        }
      })
    ),
  };
}

/**
 * Calculate combined bounds for multiple path data objects
 */
function calculateCombinedBounds(pathInfos: OriginalPathInfo[]): ShapeBounds | null {
  if (pathInfos.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const info of pathInfos) {
    const pathData = info.pathData;
    for (const subPath of pathData.subPaths) {
      for (const cmd of subPath) {
        if (cmd.type === 'Z') continue;

        const points = [cmd.position];
        if (cmd.type === 'C') {
          points.push(cmd.controlPoint1, cmd.controlPoint2);
        }

        for (const pt of points) {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
      }
    }
  }

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  const diagonal = Math.sqrt(width * width + height * height);
  const radius = diagonal / 2;
  const aspectRatio = width / (height || 1);

  return { centerX, centerY, width, height, radius, aspectRatio };
}

import { selectionHasOnlyPaths, getPathsFromSelection } from '../../utils/selectionGuards';

export const createWrap3DSlice: StateCreator<Wrap3DSlice, [], [], Wrap3DSlice> = (
  set,
  get
) => {
  // Helper function to update preview with current values
  const doUpdatePreview = (
    newRotationX?: number,
    newRotationY?: number, 
    newRotationZ?: number,
    newParams?: Partial<ShapeParams>,
    newShape?: ShapeType
  ) => {
    const state = get() as unknown as FullCanvasState & Wrap3DSlice;
    const { originalPaths, combinedBounds, isLivePreview, shapeParams, selectedShape } = state;
    
    if (!isLivePreview || originalPaths.length === 0 || !combinedBounds) {
      return;
    }

    const rotX = newRotationX ?? state.rotationX;
    const rotY = newRotationY ?? state.rotationY;
    const rotZ = newRotationZ ?? state.rotationZ;
    const params = newParams ? { ...shapeParams, ...newParams } : shapeParams;
    const shape = newShape ?? selectedShape;

    console.log('[Wrap3D] doUpdatePreview', { rotX, rotY, rotZ, shape, pathCount: originalPaths.length });

    // Transform each path using the combined bounds
    for (const pathInfo of originalPaths) {
      const transformedPathData = transformPathDataToShape(
        pathInfo.pathData,
        shape,
        rotX,
        rotY,
        rotZ,
        params,
        combinedBounds
      );

      if (transformedPathData) {
        state.updateElement(pathInfo.id, {
          data: transformedPathData,
        });
      }
    }
  };

  return {
    ...initialState,

    activateWrap3DTool: () => {
      const state = get() as unknown as FullCanvasState & Wrap3DSlice;
      console.log('[Wrap3D] activateWrap3DTool called');
      
      set({
        ...initialState,
        isActive: true,
      });
      
      const selectedIds = state.selectedIds || [];
      const elements = state.elements || [];
      const paths = getPathsFromSelection(selectedIds, elements);
      
      console.log('[Wrap3D] Found paths:', paths.length);
      
      if (paths.length > 0) {
        const currentElements = (get() as unknown as FullCanvasState).elements;
        
        const originalPaths: OriginalPathInfo[] = [];
        for (const path of paths) {
          const currentPath = currentElements.find(el => el.id === path.id);
          if (currentPath && currentPath.type === 'path') {
            originalPaths.push({
              id: currentPath.id,
              pathData: deepCopyPathData(currentPath.data as PathData),
            });
          }
        }
        
        if (originalPaths.length > 0) {
          const combinedBounds = calculateCombinedBounds(originalPaths);
          
          console.log('[Wrap3D] Starting preview for', originalPaths.length, 'paths');
          
          set({
            isActive: true,
            isLivePreview: true,
            originalPaths,
            combinedBounds,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            selectedShape: 'sphere',
            shapeParams: getDefaultShapeParams(),
          });
        }
      }
    },

    deactivateWrap3DTool: () => {
      const state = get() as unknown as FullCanvasState & Wrap3DSlice;
      console.log('[Wrap3D] deactivateWrap3DTool called');
      
      const { originalPaths, isLivePreview } = state;
      
      if (isLivePreview && originalPaths.length > 0) {
        console.log('[Wrap3D] Restoring', originalPaths.length, 'original paths');
        for (const pathInfo of originalPaths) {
          state.updateElement(pathInfo.id, {
            data: pathInfo.pathData,
          });
        }
      }
      
      set({
        ...initialState,
      });
      
      console.log('[Wrap3D] Tool fully deactivated and state cleared');
    },

    setSelectedShape: (shape: ShapeType) => {
      set({ selectedShape: shape });
      doUpdatePreview(undefined, undefined, undefined, undefined, shape);
    },

    setRotationX: (angle: number) => {
      set({ rotationX: angle });
      doUpdatePreview(angle, undefined, undefined, undefined);
    },

    setRotationY: (angle: number) => {
      set({ rotationY: angle });
      doUpdatePreview(undefined, angle, undefined, undefined);
    },

    setRotationZ: (angle: number) => {
      set({ rotationZ: angle });
      doUpdatePreview(undefined, undefined, angle, undefined);
    },

    resetRotation: () => {
      set({
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        shapeParams: getDefaultShapeParams(),
      });
      doUpdatePreview(0, 0, 0, getDefaultShapeParams());
    },

    // Shape parameter setters
    setRadiusMultiplier: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, radiusMultiplier: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setCylinderHeight: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, cylinderHeight: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setTorusMajorRadius: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, torusMajorRadius: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setTorusMinorRadius: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, torusMinorRadius: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setConeBaseRadius: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, coneBaseRadius: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setConeHeight: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, coneHeight: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setEllipsoidRadiusX: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, ellipsoidRadiusX: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setEllipsoidRadiusY: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, ellipsoidRadiusY: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setEllipsoidRadiusZ: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, ellipsoidRadiusZ: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setWaveAmplitudeX: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, waveAmplitudeX: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setWaveAmplitudeY: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, waveAmplitudeY: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setWaveFrequencyX: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, waveFrequencyX: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setWaveFrequencyY: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, waveFrequencyY: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setWavePhaseX: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, wavePhaseX: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    setWavePhaseY: (value: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, wavePhaseY: value };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },

    canApplyWrap3D: () => {
      const state = get() as unknown as FullCanvasState & Wrap3DSlice;
      const selectedIds = state.selectedIds || [];
      const elements = state.elements || [];

      if (selectedIds.length === 0) return false;
      if (!selectionHasOnlyPaths(selectedIds, elements)) return false;

      const paths = getPathsFromSelection(selectedIds, elements);
      return paths.length > 0;
    },

    startWrap3DPreview: () => {
      const state = get() as unknown as FullCanvasState & Wrap3DSlice;
      const selectedIds = state.selectedIds || [];
      const elements = state.elements || [];

      console.log('[Wrap3D] startWrap3DPreview called', { selectedIds, elementsCount: elements.length });

      if (!selectionHasOnlyPaths(selectedIds, elements)) {
        console.log('[Wrap3D] Skipping: selection has non-path elements');
        return;
      }

      const paths = getPathsFromSelection(selectedIds, elements);
      
      if (paths.length === 0) {
        console.log('[Wrap3D] Skipping: no paths in selection');
        return;
      }

      console.log('[Wrap3D] Starting preview for', paths.length, 'paths');

      const originalPaths: OriginalPathInfo[] = paths.map(path => ({
        id: path.id,
        pathData: deepCopyPathData(path.data),
      }));

      const combinedBounds = calculateCombinedBounds(originalPaths);

      set({
        isLivePreview: true,
        originalPaths,
        combinedBounds,
      });
      
      console.log('[Wrap3D] Preview started, state updated');
    },

    updateWrap3DPreview: () => {
      doUpdatePreview();
    },

    applyWrap3D: () => {
      const state = get() as unknown as FullCanvasState & Wrap3DSlice;
      
      console.log('[Wrap3D] applyWrap3D called');
      
      state.recordSnapshot?.();

      set({
        isLivePreview: false,
        originalPaths: [],
        combinedBounds: null,
      });
    },

    cancelWrap3DPreview: () => {
      const state = get() as unknown as FullCanvasState & Wrap3DSlice;
      const { originalPaths } = state;

      console.log('[Wrap3D] cancelWrap3DPreview called');

      for (const pathInfo of originalPaths) {
        state.updateElement(pathInfo.id, {
          data: pathInfo.pathData,
        });
      }

      set({
        isLivePreview: false,
        originalPaths: [],
        combinedBounds: null,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        selectedShape: 'sphere',
        shapeParams: getDefaultShapeParams(),
      });
    },

    // Legacy compatibility methods
    setSphereRadius: (radius: number) => {
      const state = get();
      const newParams = { ...state.shapeParams, radiusMultiplier: radius };
      set({ shapeParams: newParams });
      doUpdatePreview(undefined, undefined, undefined, newParams);
    },
    
    activateSphereWrapTool: () => {
      get().activateWrap3DTool();
    },
    
    deactivateSphereWrapTool: () => {
      get().deactivateWrap3DTool();
    },
    
    applySphereWrap: () => {
      get().applyWrap3D();
    },
    
    canApplySphereWrap: () => {
      return get().canApplyWrap3D();
    },
  };
};

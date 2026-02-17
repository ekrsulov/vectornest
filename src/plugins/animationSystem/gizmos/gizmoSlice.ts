/**
 * Animation Gizmo Slice
 * 
 * Zustand slice that manages the state of active gizmos.
 * This extends the animationSystem plugin with gizmo-specific state.
 */

import type { StateCreator } from 'zustand';
import type { GizmoState, GizmoInteractionState } from './types';

/**
 * Gizmo-specific state
 */
export interface AnimationGizmoSliceState {
  /** Active gizmos by animation ID */
  activeGizmos: Map<string, GizmoState>;
  /** Currently active gizmo animation ID */
  focusedGizmoAnimationId: string | null;
  /** Gizmo edit mode enabled */
  gizmoEditMode: boolean;
  /** Currently dragging handle info */
  draggingHandle: { animationId: string; handleId: string } | null;
  /** Gizmo quality mode */
  gizmoQualityMode: 'editing' | 'preview';
}

/**
 * Gizmo-specific actions
 */
export interface AnimationGizmoSliceActions {
  /** Activate a gizmo for an animation */
  setActiveGizmo: (animationId: string, gizmoState: GizmoState) => void;
  /** Update an active gizmo's state */
  updateGizmoState: (animationId: string, updates: Partial<GizmoState['props']>) => void;
  /** Update gizmo interaction state */
  updateGizmoInteraction: (animationId: string, updates: Partial<GizmoInteractionState>) => void;
  /** Clear a specific gizmo */
  clearActiveGizmo: (animationId: string) => void;
  /** Clear all active gizmos */
  clearAllGizmos: () => void;
  /** Set focused gizmo */
  setFocusedGizmo: (animationId: string | null) => void;
  /** Toggle gizmo edit mode */
  setGizmoEditMode: (enabled: boolean) => void;
  /** Set dragging handle */
  setDraggingHandle: (handle: { animationId: string; handleId: string } | null) => void;
  /** Set quality mode */
  setGizmoQualityMode: (mode: 'editing' | 'preview') => void;
}

/**
 * Combined gizmo slice type
 */
export type AnimationGizmoSlice = AnimationGizmoSliceState & AnimationGizmoSliceActions;

/**
 * Initial state for gizmo slice
 */
const initialGizmoState: AnimationGizmoSliceState = {
  activeGizmos: new Map(),
  focusedGizmoAnimationId: null,
  gizmoEditMode: false,
  draggingHandle: null,
  gizmoQualityMode: 'editing',
};

/**
 * Create the gizmo slice
 */
export const createAnimationGizmoSlice: StateCreator<
  AnimationGizmoSlice,
  [],
  [],
  AnimationGizmoSlice
> = (set, _get) => ({
  ...initialGizmoState,

  setActiveGizmo: (animationId, gizmoState) => {
    set((state) => {
      const newGizmos = new Map(state.activeGizmos);
      newGizmos.set(animationId, gizmoState);
      return { activeGizmos: newGizmos };
    });
  },

  updateGizmoState: (animationId, updates) => {
    set((state) => {
      const gizmo = state.activeGizmos.get(animationId);
      if (!gizmo) return state;

      const newGizmos = new Map(state.activeGizmos);
      newGizmos.set(animationId, {
        ...gizmo,
        props: { ...gizmo.props, ...updates },
      });
      return { activeGizmos: newGizmos };
    });
  },

  updateGizmoInteraction: (animationId, updates) => {
    set((state) => {
      const gizmo = state.activeGizmos.get(animationId);
      if (!gizmo) return state;

      const newGizmos = new Map(state.activeGizmos);
      newGizmos.set(animationId, {
        ...gizmo,
        interaction: { ...gizmo.interaction, ...updates },
      });
      return { activeGizmos: newGizmos };
    });
  },

  clearActiveGizmo: (animationId) => {
    set((state) => {
      const newGizmos = new Map(state.activeGizmos);
      newGizmos.delete(animationId);
      return {
        activeGizmos: newGizmos,
        focusedGizmoAnimationId:
          state.focusedGizmoAnimationId === animationId
            ? null
            : state.focusedGizmoAnimationId,
      };
    });
  },

  clearAllGizmos: () => {
    set({
      activeGizmos: new Map(),
      focusedGizmoAnimationId: null,
      draggingHandle: null,
    });
  },

  setFocusedGizmo: (animationId) => {
    set({ focusedGizmoAnimationId: animationId });
  },

  setGizmoEditMode: (enabled) => {
    set({
      gizmoEditMode: enabled,
      // Clear gizmos when exiting edit mode
      ...(enabled
        ? {}
        : {
            activeGizmos: new Map(),
            focusedGizmoAnimationId: null,
            draggingHandle: null,
          }),
    });
  },

  setDraggingHandle: (handle) => {
    set({ draggingHandle: handle });
  },

  setGizmoQualityMode: (mode) => {
    set({ gizmoQualityMode: mode });
  },
});

/**
 * Selector for getting a specific gizmo state
 */
export const selectGizmoState = (
  state: AnimationGizmoSlice,
  animationId: string
): GizmoState | undefined => {
  return state.activeGizmos.get(animationId);
};

/**
 * Selector for checking if any gizmo is active
 */
export const selectHasActiveGizmos = (state: AnimationGizmoSlice): boolean => {
  return state.activeGizmos.size > 0;
};

/**
 * Selector for the focused gizmo
 */
export const selectFocusedGizmo = (
  state: AnimationGizmoSlice
): GizmoState | undefined => {
  if (!state.focusedGizmoAnimationId) return undefined;
  return state.activeGizmos.get(state.focusedGizmoAnimationId);
};

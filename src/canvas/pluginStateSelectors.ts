/**
 * Typed selectors for plugin state accessed by the canvas core.
 *
 * These provide type-safe access to dynamically-injected plugin state
 * without requiring unsafe casts throughout Canvas.tsx and other core files.
 */
import type { AnimationState } from '../types/animations';

/** Shape of the store when animation plugin state is present. */
interface WithAnimationState {
  animations?: unknown[];
  animationState?: AnimationState;
}

/** Shape of the store when mask plugin state is present. */
interface WithMaskState {
  masks?: Array<{ id: string; version?: number }>;
}

/** Shape of the store when gradient plugin state is present. */
interface WithGradientState {
  gradients?: unknown[];
}

/** Shape of the store when grid plugin state is present. */
interface WithGridState {
  grid?: { enabled?: boolean; showRulers?: boolean };
}

/** Shape of the store when guidelines plugin state is present. */
interface WithGuidelinesState {
  guidelines?: { enabled?: boolean; manualGuidesEnabled?: boolean };
}

/** Shape of the store when wireframe plugin state is present. */
interface WithWireframeState {
  wireframe?: { enabled?: boolean; removeFill?: boolean };
}

/** Shape of the store when selection strategy plugin state is present. */
interface WithSelectionStrategyState {
  activeSelectionStrategy?: string;
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectAnimations = (state: object): unknown[] =>
  (state as WithAnimationState).animations ?? [];

export const selectAnimationState = (state: object): AnimationState | undefined =>
  (state as WithAnimationState).animationState;

export const selectMasks = (state: object): Array<{ id: string; version?: number }> =>
  (state as WithMaskState).masks ?? [];

interface WithClipState {
  clips?: Array<{ id: string; version?: number }>;
}

export const selectClips = (state: object): Array<{ id: string; version?: number }> =>
  (state as WithClipState).clips ?? [];

export const selectGradientsRevision = (state: object): unknown[] =>
  (state as WithGradientState).gradients ?? [];

export const selectGridEnabled = (state: object): boolean | undefined =>
  (state as WithGridState).grid?.enabled;

export const selectGridShowRulers = (state: object): boolean | undefined =>
  (state as WithGridState).grid?.showRulers;

export const selectGuidelinesEnabled = (state: object): boolean | undefined =>
  (state as WithGuidelinesState).guidelines?.enabled;

export const selectGuidelinesManualEnabled = (state: object): boolean | undefined =>
  (state as WithGuidelinesState).guidelines?.manualGuidesEnabled;

export const selectWireframe = (state: object): { enabled?: boolean; removeFill?: boolean } | undefined =>
  (state as WithWireframeState).wireframe;

export const selectActiveSelectionStrategy = (state: object): string | undefined =>
  (state as WithSelectionStrategyState).activeSelectionStrategy;

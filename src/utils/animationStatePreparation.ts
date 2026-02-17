import type { AnimationState } from '../types/animations';

interface AnimationStatePreparationShape {
  chainDelays?: Map<string, number>;
  restartKey?: number;
  isPlaying?: boolean;
  hasPlayed?: boolean;
}

export interface AnimationStatePreparationHost {
  animationState?: AnimationStatePreparationShape;
  calculateChainDelays?: () => Map<string, number>;
}

export const resolveExportChainDelays = (
  state: AnimationStatePreparationHost | undefined
): Map<string, number> => {
  if (!state) {
    return new Map<string, number>();
  }
  return state.calculateChainDelays
    ? state.calculateChainDelays()
    : state.animationState?.chainDelays ?? new Map<string, number>();
};

export function prepareExportAnimationState<TState extends object & AnimationStatePreparationHost>(
  state: TState
): TState;
export function prepareExportAnimationState(state: undefined): undefined;
export function prepareExportAnimationState<TState extends object & AnimationStatePreparationHost>(
  state: TState | undefined
): TState | undefined {
  if (!state?.animationState) {
    return state;
  }

  return {
    ...state,
    animationState: {
      ...state.animationState,
      isPlaying: true,
      hasPlayed: true,
      chainDelays: resolveExportChainDelays(state),
      restartKey: (state.animationState.restartKey ?? 0) + 1,
    },
  };
}

export const getPausedAnimationTime = (
  state: unknown
): number | null => {
  if (!state || typeof state !== 'object') {
    return null;
  }
  const animationState = (
    state as { animationState?: { isPlaying?: unknown; currentTime?: unknown } }
  ).animationState;

  if (!animationState || animationState.isPlaying === true) {
    return null;
  }
  return typeof animationState.currentTime === 'number' ? animationState.currentTime : null;
};

interface PreviewAnimationStateOptions {
  restartKey: number;
  isWorkspaceOpen: boolean;
  isCanvasPreviewMode: boolean;
  chainDelays?: Map<string, number>;
  playbackRate?: number;
}

export const createPlayingAnimationState = (
  options: PreviewAnimationStateOptions
): AnimationState => ({
  isPlaying: true,
  hasPlayed: true,
  currentTime: 0,
  startTime: null,
  playbackRate: options.playbackRate ?? 1,
  restartKey: options.restartKey,
  chainDelays: options.chainDelays ?? new Map<string, number>(),
  isWorkspaceOpen: options.isWorkspaceOpen,
  isCanvasPreviewMode: options.isCanvasPreviewMode,
});

import { describe, expect, it } from 'vitest';
import {
  createPlayingAnimationState,
  getPausedAnimationTime,
  prepareExportAnimationState,
  resolveExportChainDelays,
} from './animationStatePreparation';

describe('animationStatePreparation', () => {
  it('resolves export chain delays from calculator when available', () => {
    const delays = new Map<string, number>([['a', 120]]);
    const resolved = resolveExportChainDelays({
      animationState: { chainDelays: new Map<string, number>([['b', 40]]) },
      calculateChainDelays: () => delays,
    });
    expect(resolved).toBe(delays);
  });

  it('prepares export animation state by forcing playback and bumping restart key', () => {
    const calculatedDelays = new Map<string, number>([['anim-1', 80]]);
    const state = {
      id: 'demo',
      animationState: {
        isPlaying: false,
        hasPlayed: false,
        restartKey: 5,
        chainDelays: new Map<string, number>(),
      },
      calculateChainDelays: () => calculatedDelays,
    };

    const prepared = prepareExportAnimationState(state);
    expect(prepared).not.toBe(state);
    expect(prepared.animationState?.isPlaying).toBe(true);
    expect(prepared.animationState?.hasPlayed).toBe(true);
    expect(prepared.animationState?.restartKey).toBe(6);
    expect(prepared.animationState?.chainDelays).toBe(calculatedDelays);
  });

  it('returns paused animation time only when animation is not playing', () => {
    expect(getPausedAnimationTime(undefined)).toBeNull();
    expect(getPausedAnimationTime({ animationState: { isPlaying: true, currentTime: 2.5 } })).toBeNull();
    expect(getPausedAnimationTime({ animationState: { isPlaying: false, currentTime: 1.25 } })).toBe(1.25);
  });

  it('creates a playing preview animation state with required fields', () => {
    const chainDelays = new Map<string, number>([['anim-2', 20]]);
    const preview = createPlayingAnimationState({
      restartKey: 3,
      isWorkspaceOpen: true,
      isCanvasPreviewMode: false,
      chainDelays,
      playbackRate: 2,
    });

    expect(preview).toEqual({
      isPlaying: true,
      hasPlayed: true,
      currentTime: 0,
      startTime: null,
      playbackRate: 2,
      restartKey: 3,
      chainDelays,
      isWorkspaceOpen: true,
      isCanvasPreviewMode: false,
    });
  });
});

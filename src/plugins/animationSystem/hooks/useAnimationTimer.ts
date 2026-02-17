import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../../store/canvasStore';
import type { PluginHooksContext } from '../../../types/plugins';
import type { AnimationPluginSlice, SVGAnimation } from '../types';
import { ensureChainDelays } from '../chainUtils';

/**
 * Compute total duration in seconds for a single animation
 */
const computeTotalDurationSeconds = (animation: SVGAnimation | undefined): number => {
  if (!animation) return 0;
  const durSec = parseFloat(String(animation.dur ?? '0').replace('s', '')) || 0;
  const repeatDur = animation.repeatDur ? parseFloat(String(animation.repeatDur).replace('s', '')) : null;
  const repeat = animation.repeatCount === 'indefinite'
    ? Infinity
    : typeof animation.repeatCount === 'number'
      ? animation.repeatCount
      : 1;
  if (repeatDur && repeatDur > 0) return repeatDur;
  if (repeat === Infinity) return Infinity;
  return durSec * repeat;
};

/**
 * useAnimationTimer - Manages animation timing state for the store.
 * 
 * This hook ONLY updates the store's animation time. It does NOT attempt to control
 * SMIL animations on the main canvas. Animation preview is handled exclusively by
 * the AnimationPreviewPanel which uses its own isolated SVG with full control.
 * 
 * The main canvas displays static content - animations are previewed in the dedicated
 * preview panel where SMIL control works reliably.
 */
export const useAnimationTimer = (_context: PluginHooksContext): void => {
  const isPlaying = useCanvasStore(
    (state) => (state as unknown as AnimationPluginSlice).animationState?.isPlaying ?? false
  );
  const startTime = useCanvasStore(
    (state) => (state as unknown as AnimationPluginSlice).animationState?.startTime ?? null
  );
  const playbackRate = useCanvasStore(
    (state) => (state as unknown as AnimationPluginSlice).animationState?.playbackRate ?? 1
  );
  const setAnimationTime = useCanvasStore(
    (state) => (state as unknown as AnimationPluginSlice).setAnimationTime
  );
  const stopAnimations = useCanvasStore(
    (state) => (state as unknown as AnimationPluginSlice).stopAnimations
  );
  const animations = useCanvasStore(
    (state) => (state as unknown as AnimationPluginSlice).animations ?? []
  );
  const chainDelays = useCanvasStore(
    (state) => (state as unknown as AnimationPluginSlice).animationState?.chainDelays
  );

  const rafRef = useRef<number | null>(null);

  /**
   * Compute max duration across all animations including chain delays
   */
  const computeMaxDuration = (list: SVGAnimation[], delays?: AnimationPluginSlice['animationState']['chainDelays']) => {
    const delayMap = ensureChainDelays(delays);
    let max = 0;
    list.forEach((anim) => {
      const totalDur = computeTotalDurationSeconds(anim);
      const delayMs = delayMap.get(anim.id) ?? 0;
      const candidate = delayMs / 1000 + totalDur;
      if (candidate > max) {
        max = candidate;
      }
    });
    return max;
  };

  // Main animation loop - just updates store time, doesn't control canvas SVG
  useEffect(() => {
    if (!isPlaying || startTime === null || !setAnimationTime) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const maxDuration = computeMaxDuration(animations, chainDelays);

    const tick = (timestamp: number) => {
      const elapsedSeconds = Math.max(0, ((timestamp - startTime) / 1000) * playbackRate);
      setAnimationTime(elapsedSeconds);

      // Auto-stop when animation completes
      if (maxDuration !== Infinity && elapsedSeconds >= maxDuration) {
        stopAnimations?.();
        setAnimationTime(maxDuration);
        rafRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, startTime, playbackRate, setAnimationTime, stopAnimations, animations, chainDelays]);
};
